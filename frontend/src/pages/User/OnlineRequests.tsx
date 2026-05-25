import { useState, useCallback, useEffect } from 'react';
import { useNavigate }   from 'react-router-dom';
import { useRequests }         from '@/hooks/useRequests';
import { useAuth }             from '@/hooks/useAuth';
import { getMe }               from '@/api/users.api';
import { getCustomers }        from '@/api/customers.api';
import { getCustomerAccounts } from '@/api/accounts.api';
import { loadSystemConfig }    from '@/utils/systemConfig';
import type { BankAccount }    from '@/types';
import { formatDate, formatCurrency } from '@/utils/formatters';
import Spinner from '@/components/Spinner/Spinner';
import styles from './OnlineRequests.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'new' | 'versement' | 'history';

function statusClass(s: string) {
  if (s === 'APPROUVÉE') return styles.chipSuccess;
  if (s === 'REFUSÉE')   return styles.chipDanger;
  return styles.chipPending;
}

function accountLabel(a: BankAccount): string {
  return `Compte Courant — ${formatCurrency(a.balance)} — ${a.id.slice(0, 8)}…`;
}

interface ReleveValues { description: string }
interface VersValues   { accountId: string; amount: string; description: string }
interface VersErrors   { accountId?: string; amount?: string }

const EMPTY_RELEVE: ReleveValues = { description: '' };
const EMPTY_VERS:   VersValues   = { accountId: '', amount: '', description: '' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnlineRequests() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const username   = user?.username ?? '';

  const { requests, addRequest, cancelRequest } = useRequests(username);

  const [tab, setTab] = useState<TabId>('new');

  const [releveValues,  setReleveValues]  = useState<ReleveValues>(EMPTY_RELEVE);
  const [releveErrors,  setReleveErrors]  = useState<Record<string, string>>({});
  const [releveSuccess, setReleveSuccess] = useState(false);

  const [versValues,   setVersValues]   = useState<VersValues>(EMPTY_VERS);
  const [versErrors,   setVersErrors]   = useState<VersErrors>({});
  const [versSuccess,  setVersSuccess]  = useState(false);
  const [userAccounts, setUserAccounts] = useState<BankAccount[]>([]);
  const [loadingAccs,  setLoadingAccs]  = useState(false);

  // Load accounts for versement form
  useEffect(() => {
    let cancelled = false;
    if (!username) return;

    async function loadAccounts() {
      setLoadingAccs(true);
      try {
        const me        = await getMe();
        if (!me.email) return;
        const customers = await getCustomers();
        const matched   = customers.filter((c) => c.email?.toLowerCase() === me.email!.toLowerCase());
        const customer  = matched.length > 0 ? matched.reduce((best, c) => ((c.id ?? 0) > (best.id ?? 0) ? c : best)) : undefined;
        if (!customer?.id) return;
        const accs = await getCustomerAccounts(customer.id);
        if (!cancelled) setUserAccounts(accs);
      } catch { /* silencieux */ }
      finally { if (!cancelled) setLoadingAccs(false); }
    }

    loadAccounts();
    return () => { cancelled = true; };
  }, [username]);

  // ── Relevé handlers ──────────────────────────────────────────────────────────

  const handleReleveChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReleveValues((prev) => ({ ...prev, [name]: value }));
    setReleveErrors((prev) => ({ ...prev, [name]: '' }));
    setReleveSuccess(false);
  }, []);

  const handleReleveSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    addRequest({ type: 'RELEVE', description: releveValues.description.trim() });
    setReleveValues(EMPTY_RELEVE);
    setReleveSuccess(true);
    setTab('history');
  }, [releveValues, addRequest]);

  // ── Versement handlers ────────────────────────────────────────────────────────

  const handleVersChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVersValues((prev) => ({ ...prev, [name]: value }));
    setVersErrors((prev) => ({ ...prev, [name]: undefined }));
    setVersSuccess(false);
  }, []);

  const handleVersSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errs: VersErrors = {};
    const cfg = loadSystemConfig();
    if (!versValues.accountId) errs.accountId = 'Veuillez sélectionner un compte.';
    const amt = parseFloat(versValues.amount);
    if (!versValues.amount || isNaN(amt) || amt <= 0) {
      errs.amount = 'Montant invalide (doit être > 0).';
    } else if (amt < cfg.creditMinAmount) {
      errs.amount = `Montant minimum : ${formatCurrency(cfg.creditMinAmount)}.`;
    } else if (amt > cfg.creditMaxAmount) {
      errs.amount = `Montant maximum : ${formatCurrency(cfg.creditMaxAmount)}.`;
    }
    if (Object.keys(errs).length > 0) { setVersErrors(errs); return; }
    addRequest({ type: 'VERSEMENT', description: versValues.description.trim(), accountId: versValues.accountId, amount: parseFloat(versValues.amount) });
    setVersValues(EMPTY_VERS);
    setVersSuccess(true);
    setTab('history');
  }, [versValues, addRequest]);

  const handleCancel = useCallback((id: number) => cancelRequest(id), [cancelRequest]);

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h1 className={styles.title}>Mes demandes en ligne</h1>
        <p className={styles.subtitle}>Demandez un relevé de compte, effectuez un versement ou consultez vos demandes.</p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${tab === 'new' ? styles.tabActive : ''}`} onClick={() => setTab('new')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Relevé de compte
        </button>
        <button type="button" className={`${styles.tab} ${tab === 'versement' ? styles.tabActive : ''}`} onClick={() => setTab('versement')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
          Versement
        </button>
        <button type="button" className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Mes demandes
          <span className={styles.tabBadge}>{requests.length}</span>
        </button>
      </div>

      {/* ── Tab: Relevé ─────────────────────────────────────────────────── */}
      {tab === 'new' && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Demande de relevé de compte
          </p>

          <div className={styles.alertInfo}>
            Votre relevé contiendra : votre <strong>nom</strong>, <strong>email</strong>,
            votre <strong>RIB</strong>, ainsi que toutes vos <strong>opérations bancaires</strong>.
          </div>

          {releveSuccess && (
            <div className={styles.alertSuccess}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Demande de relevé soumise ! Vous serez notifié dès qu'il sera disponible.
            </div>
          )}

          <form className={styles.form} onSubmit={handleReleveSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label}>Période souhaitée (optionnel)</label>
              <input
                className={styles.input}
                type="text"
                name="description"
                value={releveValues.description}
                onChange={handleReleveChange}
                placeholder="Ex. Janvier 2026, ou laissez vide pour toutes les opérations"
              />
              <span className={styles.fieldHint}>Laissez vide pour inclure toutes les opérations</span>
            </div>
            <button type="submit" className={styles.btnSubmit}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Demander le relevé
            </button>
          </form>
        </div>
      )}

      {/* ── Tab: Versement ──────────────────────────────────────────────── */}
      {tab === 'versement' && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Approvisionner un compte</p>

          {versSuccess && (
            <div className={styles.alertSuccess}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Demande de versement soumise ! En attente d'approbation par l'administrateur.
            </div>
          )}

          {loadingAccs ? (
            <div className={styles.centered}><Spinner size={28} /></div>
          ) : userAccounts.length === 0 ? (
            <div className={styles.alertWarning}>
              Vous n'avez aucun compte bancaire. Contactez votre conseiller.
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleVersSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label}>Compte à approvisionner <span className={styles.required}>*</span></label>
                <select
                  className={`${styles.select} ${versErrors.accountId ? styles.inputError : ''}`}
                  name="accountId"
                  value={versValues.accountId}
                  onChange={handleVersChange}
                  required
                >
                  <option value="">— Sélectionner un compte —</option>
                  {userAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                  ))}
                </select>
                {versErrors.accountId && <span className={styles.fieldError}>{versErrors.accountId}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Montant à verser (MAD) <span className={styles.required}>*</span></label>
                <input
                  className={`${styles.input} ${versErrors.amount ? styles.inputError : ''}`}
                  type="number"
                  name="amount"
                  value={versValues.amount}
                  onChange={handleVersChange}
                  placeholder="0.00"
                  step="100"
                  min="1"
                  required
                />
                {versErrors.amount
                  ? <span className={styles.fieldError}>{versErrors.amount}</span>
                  : (() => {
                      const cfg = loadSystemConfig();
                      return (
                        <span className={styles.fieldHint}>
                          Montant accepté : {formatCurrency(cfg.creditMinAmount)} — {formatCurrency(cfg.creditMaxAmount)}
                        </span>
                      );
                    })()
                }
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Description (optionnel)</label>
                <input
                  className={styles.input}
                  type="text"
                  name="description"
                  value={versValues.description}
                  onChange={handleVersChange}
                  placeholder="Ex. Salaire, Dépôt espèces…"
                />
              </div>

              <button type="submit" className={`${styles.btnSubmit} ${styles.btnSubmitGreen}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
                Soumettre la demande de versement
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Tab: Historique ─────────────────────────────────────────────── */}
      {tab === 'history' && (
        <>
          {(releveSuccess || versSuccess) && (
            <div className={styles.alertSuccess}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {releveSuccess
                ? 'Votre demande de relevé a été soumise et est en cours de traitement.'
                : 'Votre demande de versement a été soumise. Elle sera versée après approbation.'}
            </div>
          )}

          {requests.length === 0 ? (
            <div className={styles.emptyBox}>Aucune demande pour le moment.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td className={styles.dateCell}>{formatDate(req.date)}</td>
                      <td>
                        <span className={`${styles.chip} ${req.type === 'RELEVE' ? styles.chipReleve : styles.chipVers}`}>
                          {req.type === 'RELEVE' ? 'Relevé' : 'Versement'}
                        </span>
                      </td>
                      <td>{req.description || '—'}</td>
                      <td>
                        <span className={`${styles.chip} ${statusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className={styles.centerCell}>
                        {req.status === 'EN_ATTENTE' ? (
                          <button
                            type="button"
                            className={styles.btnCancel}
                            title="Annuler la demande"
                            onClick={() => handleCancel(req.id)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        ) : req.status === 'APPROUVÉE' && req.type === 'RELEVE' ? (
                          <button
                            type="button"
                            className={styles.btnView}
                            onClick={() => navigate('/user/statement')}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Voir le relevé
                          </button>
                        ) : (
                          <span className={styles.resolvedCell}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
