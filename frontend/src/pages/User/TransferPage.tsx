import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  transfer,
  getCustomerAccounts,
  getAccountByRib,
} from '@/api/accounts.api';
import { getMe }          from '@/api/users.api';
import { getCustomers }   from '@/api/customers.api';
import { formatCurrency } from '@/utils/formatters';
import type { BankAccount } from '@/types';
import { useAuth }          from '@/hooks/useAuth';
import { logAudit }         from '@/utils/auditLogger';
import { loadSystemConfig } from '@/utils/systemConfig';
import Spinner from '@/components/Spinner/Spinner';
import styles from './TransferPage.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormValues {
  accountSource: string;
  ribDestination: string;
  amount:         string;
  description:    string;
}

interface FormErrors {
  accountSource?:  string;
  ribDestination?: string;
  amount?:         string;
  description?:    string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TransferPage() {
  const { user } = useAuth();
  const username = user?.username ?? '';

  // Pré-remplissage depuis la page Bénéficiaires (?rib=...)
  const [searchParams] = useSearchParams();
  const ribFromUrl = searchParams.get('rib') ?? '';

  const [myAccounts,   setMyAccounts]   = useState<BankAccount[]>([]);
  const [loadingAccs,  setLoadingAccs]  = useState(false);
  const [ribChecking,  setRibChecking]  = useState(false);
  const [ribAccount,   setRibAccount]   = useState<BankAccount | null | undefined>(undefined);

  const [values,       setValues]       = useState<FormValues>({
    accountSource:  '',
    ribDestination: ribFromUrl,
    amount:         '',
    description:    '',
  });

  // Sync : si l'URL change (navigation vers /transfer?rib=XXX depuis Bénéficiaires),
  // on met à jour ribDestination même si le composant reste monté (TP1 — useEffect)
  useEffect(() => {
    if (ribFromUrl) {
      setValues((prev) => ({ ...prev, ribDestination: ribFromUrl }));
    }
  }, [ribFromUrl]);
  const [errors,       setErrors]       = useState<FormErrors>({});
  const [submitting,   setSubmitting]   = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [serverError,  setServerError]  = useState('');

  // Load user accounts
  useEffect(() => {
    let cancelled = false;
    if (!username) return;
    async function load() {
      setLoadingAccs(true);
      try {
        const me        = await getMe();
        if (!me.email) return;
        const customers = await getCustomers();
        const matched   = customers.filter((c) => c.email?.toLowerCase() === me.email!.toLowerCase());
        const customer  = matched.length > 0 ? matched.reduce((best, c) => ((c.id ?? 0) > (best.id ?? 0) ? c : best)) : undefined;
        if (!customer?.id) return;
        const accs = await getCustomerAccounts(customer.id);
        if (!cancelled) setMyAccounts(accs);
      } catch { /* silencieux */ }
      finally { if (!cancelled) setLoadingAccs(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [username]);

  // RIB debounce lookup
  useEffect(() => {
    const rib = values.ribDestination.trim().replace(/\s/g, '');
    if (rib.length < 24) { setRibAccount(undefined); return; }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setRibChecking(true);
      const found = await getAccountByRib(rib);
      if (!cancelled) { setRibAccount(found); setRibChecking(false); }
    }, 600);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [values.ribDestination]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev)  => ({ ...prev, [name]: undefined }));
    setSuccess(false);
    setServerError('');
  }, []);

  function validate(v: FormValues): FormErrors {
    const e: FormErrors = {};
    const cfg = loadSystemConfig();
    if (!v.accountSource) e.accountSource = 'Veuillez sélectionner un compte source.';
    const rib = v.ribDestination.trim().replace(/\s/g, '');
    if (!rib) {
      e.ribDestination = 'Le RIB destinataire est requis.';
    } else if (rib.length !== 24) {
      e.ribDestination = 'Le RIB doit contenir 24 chiffres.';
    } else if (ribAccount === null) {
      e.ribDestination = 'Aucun compte trouvé pour ce RIB.';
    } else if (ribAccount && ribAccount.id === v.accountSource) {
      e.ribDestination = 'Le compte destinataire doit être différent du compte source.';
    }
    const amt = parseFloat(v.amount);
    if (!v.amount || isNaN(amt) || amt <= 0) {
      e.amount = 'Montant invalide (doit être > 0).';
    } else if (cfg.transferLimit > 0 && amt > cfg.transferLimit) {
      e.amount = `Dépasse le plafond journalier de ${formatCurrency(cfg.transferLimit)}.`;
    }
    if (!v.description.trim()) e.description = 'La description est requise.';
    return e;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(values);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (!ribAccount) { setServerError('Veuillez saisir un RIB valide.'); return; }

    setSubmitting(true);
    setServerError('');
    try {
      await transfer({
        accountSource:      values.accountSource,
        accountDestination: ribAccount.id,
        amount:             parseFloat(values.amount),
        description:        values.description.trim(),
      });
      setSuccess(true);
      logAudit({
        level:   'INFO',
        actor:   username,
        action:  'TRANSFER',
        details: `Virement de ${values.amount} MAD vers RIB ${values.ribDestination.trim().replace(/\s/g, '')} — "${values.description.trim()}"`,
      });
      setValues({ accountSource: '', ribDestination: '', amount: '', description: '' });
      setRibAccount(undefined);
    } catch {
      setServerError('Virement échoué. Vérifiez le solde disponible et réessayez.');
      logAudit({
        level:   'ERROR',
        actor:   username,
        action:  'TRANSFER_FAILED',
        details: `Tentative de virement de ${values.amount} MAD vers RIB ${values.ribDestination.trim().replace(/\s/g, '')} échouée`,
      });
    } finally {
      setSubmitting(false);
    }
  }, [values, ribAccount, username]);

  function accountLabel(a: BankAccount): string {
    return `Compte Courant — ${formatCurrency(a.balance)}${a.rib ? ' — RIB : ' + a.rib : ''}`;
  }

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h1 className={styles.title}>Nouveau virement</h1>
        <p className={styles.subtitle}>Transférez des fonds vers un autre compte en saisissant son RIB.</p>
      </div>

      <div className={styles.card}>
        {ribFromUrl && !success && (
          <div className={styles.alertInfo}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            RIB bénéficiaire pré-rempli. Complétez le montant et le motif pour effectuer le virement.
          </div>
        )}
        {success && (
          <div className={styles.alertSuccess}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Virement effectué avec succès !
          </div>
        )}
        {serverError && (
          <div className={styles.alertError}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {serverError}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* ── Compte source ─────────────────────────────────────────── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Compte source <span className={styles.required}>*</span>
            </label>
            {loadingAccs ? (
              <div className={styles.centered}><Spinner size={24} /></div>
            ) : (
              <select
                className={`${styles.select} ${errors.accountSource ? styles.inputError : ''}`}
                name="accountSource"
                value={values.accountSource}
                onChange={handleChange}
                required
              >
                <option value="">— Sélectionner un compte —</option>
                {myAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                ))}
              </select>
            )}
            {errors.accountSource && <span className={styles.fieldError}>⚠ {errors.accountSource}</span>}
          </div>

          {/* ── RIB destinataire ──────────────────────────────────────── */}
          <div className={styles.field}>
            <label className={styles.label}>
              RIB du compte destinataire <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                className={`${styles.input} ${errors.ribDestination ? styles.inputError : ''}`}
                type="text"
                name="ribDestination"
                value={values.ribDestination}
                onChange={handleChange}
                placeholder="011100XXXXXXXXXXXXXXXX"
                required
              />
              <span className={styles.inputAdornment}>
                {ribChecking ? (
                  <Spinner size={16} />
                ) : ribAccount !== undefined ? (
                  ribAccount ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  )
                ) : null}
              </span>
            </div>
            {ribAccount && (
              <div className={styles.ribFound}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Compte Courant — {ribAccount.customerDTO?.name ?? 'Titulaire'}
              </div>
            )}
            {ribAccount === null && (
              <div className={styles.ribNotFound}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Aucun compte trouvé pour ce RIB.
              </div>
            )}
            {errors.ribDestination && <span className={styles.fieldError}>⚠ {errors.ribDestination}</span>}
            {!errors.ribDestination && <span className={styles.fieldHint}>Saisissez le RIB à 24 chiffres du bénéficiaire</span>}
          </div>

          {/* ── Montant ───────────────────────────────────────────────── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Montant (MAD) <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.amount ? styles.inputError : ''}`}
              type="number"
              name="amount"
              value={values.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
            {errors.amount && <span className={styles.fieldError}>⚠ {errors.amount}</span>}
            {!errors.amount && (() => {
              const cfg = loadSystemConfig();
              const amt = parseFloat(values.amount);
              const fee = cfg.transferFee > 0 && amt > 0 ? amt * cfg.transferFee / 100 : 0;
              return fee > 0 ? (
                <span className={styles.fieldHint}>
                  Frais de virement : {formatCurrency(fee)} ({cfg.transferFee}%) — prélevés sur votre compte
                </span>
              ) : cfg.transferLimit > 0 ? (
                <span className={styles.fieldHint}>
                  Plafond journalier : {formatCurrency(cfg.transferLimit)}
                </span>
              ) : null;
            })()}
          </div>

          {/* ── Description ───────────────────────────────────────────── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Description / Motif <span className={styles.required}>*</span>
            </label>
            <textarea
              className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
              name="description"
              value={values.description}
              onChange={handleChange}
              rows={2}
              placeholder="Ex. Règlement facture, Remboursement…"
              required
            />
            {errors.description && <span className={styles.fieldError}>⚠ {errors.description}</span>}
          </div>

          {/* ── Submit ────────────────────────────────────────────────── */}
          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={submitting || ribAccount === null || ribChecking}
          >
            {submitting ? (
              <><Spinner size={18} /> Traitement en cours…</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Effectuer le virement
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
