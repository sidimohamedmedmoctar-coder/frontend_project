import { useState, useCallback, useEffect } from 'react';
import React from 'react';
import { useNavigate }       from 'react-router-dom';
import { useBeneficiaries }  from '@/hooks/useBeneficiaries';
import type { Beneficiary }  from '@/hooks/useBeneficiaries';
import { getAccountByRib }   from '@/api/accounts.api';
import type { BankAccount }  from '@/types';
import { useAuth }  from '@/hooks/useAuth';
import Spinner      from '@/components/Spinner/Spinner';
import styles from './Beneficiaries.module.css';

// ── Beneficiary card ──────────────────────────────────────────────────────────

const BeneficiaryCard = React.memo(function BeneficiaryCard({
  b, onRemove, onTransfer,
}: { b: Beneficiary; onRemove: (id: number) => void; onTransfer: (rib: string) => void }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div className={styles.cardInfo}>
        <p className={styles.cardName}>{b.name}</p>
        <span className={styles.cardRib}>{b.rib.replace(/(.{4})/g, '$1 ').trim()}</span>
      </div>
      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.btnTransfer}
          title={`Virer vers ${b.name}`}
          onClick={() => onTransfer(b.rib)}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Virer
        </button>
        <button
          type="button"
          className={styles.btnRemove}
          title={`Supprimer ${b.name}`}
          onClick={() => onRemove(b.id)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

// ── Form state ────────────────────────────────────────────────────────────────

interface FormValues { name: string; rib: string; }
interface FormErrors { name?: string; rib?: string; }
const EMPTY: FormValues = { name: '', rib: '' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function Beneficiaries() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { beneficiaries, addBeneficiary, removeBeneficiary } = useBeneficiaries(user?.username ?? '');

  const [values,      setValues]      = useState<FormValues>(EMPTY);
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [success,     setSuccess]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [ribChecking, setRibChecking] = useState(false);
  const [ribAccount,  setRibAccount]  = useState<BankAccount | null | undefined>(undefined);

  // RIB debounce lookup
  useEffect(() => {
    const rib = values.rib.trim().replace(/\s/g, '');
    if (rib.length < 24) { setRibAccount(undefined); return; }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setRibChecking(true);
      const found = await getAccountByRib(rib);
      if (!cancelled) {
        setRibAccount(found);
        if (found?.customerDTO?.name && !values.name.trim()) {
          setValues((prev) => ({ ...prev, name: found.customerDTO!.name! }));
        }
        setRibChecking(false);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.rib]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev)  => ({ ...prev, [name]: undefined }));
    setSuccess(false);
    if (name === 'rib') setRibAccount(undefined);
  }, []);

  function validate(v: FormValues): FormErrors {
    const e: FormErrors = {};
    if (!v.name.trim()) e.name = 'Le nom est requis.';
    const rib = v.rib.trim().replace(/\s/g, '');
    if (!rib)                   { e.rib = 'Le RIB est requis.'; }
    else if (rib.length !== 24) { e.rib = 'Le RIB doit contenir 24 chiffres.'; }
    else if (ribAccount === null){ e.rib = 'Aucun compte trouvé pour ce RIB.'; }
    return e;
  }

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(values);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    addBeneficiary({ name: values.name.trim(), rib: values.rib.trim().replace(/\s/g, '') });
    setValues(EMPTY);
    setRibAccount(undefined);
    setSuccess(true);
    setOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, ribAccount, addBeneficiary]);

  const handleRemove   = useCallback((id: number) => removeBeneficiary(id), [removeBeneficiary]);
  const handleTransfer = useCallback((rib: string) => {
    navigate(`/user/transfer?rib=${encodeURIComponent(rib)}`);
  }, [navigate]);

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h1 className={styles.title}>Mes bénéficiaires</h1>
        <button
          type="button"
          className={styles.btnToggle}
          onClick={() => { setOpen((o) => !o); setSuccess(false); }}
        >
          {open ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Annuler
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Ajouter
            </>
          )}
        </button>
      </div>
      <p className={styles.subtitle}>Gérez vos bénéficiaires de virement par RIB.</p>

      {success && (
        <div className={styles.alertSuccess}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Bénéficiaire ajouté avec succès !
        </div>
      )}

      {/* ── Add form ────────────────────────────────────────────────────── */}
      {open && (
        <div className={styles.addPanel}>
          <p className={styles.addPanelTitle}>Nouveau bénéficiaire</p>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>

            <div className={styles.field}>
              <label className={styles.label}>
                RIB du bénéficiaire <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  className={`${styles.input} ${errors.rib ? styles.inputError : ''}`}
                  type="text"
                  name="rib"
                  value={values.rib}
                  onChange={handleChange}
                  placeholder="011100XXXXXXXXXXXXXXXX"
                  required
                />
                <span className={styles.inputAdornment}>
                  {ribChecking ? (
                    <Spinner size={15} />
                  ) : ribAccount !== undefined ? (
                    ribAccount ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    )
                  ) : null}
                </span>
              </div>
              {ribAccount && (
                <span className={styles.ribFound}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Compte Courant — {ribAccount.customerDTO?.name ?? 'Titulaire'}
                </span>
              )}
              {ribAccount === null && <span className={styles.ribNotFound}>Aucun compte trouvé pour ce RIB.</span>}
              {errors.rib && <span className={styles.fieldError}>{errors.rib}</span>}
              {!errors.rib && <span className={styles.fieldHint}>Saisissez le RIB à 24 chiffres</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Nom du bénéficiaire <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                type="text"
                name="name"
                value={values.name}
                onChange={handleChange}
                placeholder="Nom du titulaire du compte"
                required
              />
              {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
              {!errors.name && <span className={styles.fieldHint}>Automatiquement rempli si le compte est trouvé</span>}
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.btnSave}
                disabled={ribChecking || ribAccount === null}
              >
                Enregistrer
              </button>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => { setOpen(false); setValues(EMPTY); setErrors({}); setRibAccount(undefined); }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <hr className={styles.divider} />

      {/* ── Beneficiary list ──────────────────────────────────────────── */}
      {beneficiaries.length === 0 ? (
        <div className={styles.emptyBox}>Aucun bénéficiaire enregistré.</div>
      ) : (
        <div className={styles.grid}>
          {beneficiaries.map((b) => (
            <BeneficiaryCard key={b.id} b={b} onRemove={handleRemove} onTransfer={handleTransfer} />
          ))}
        </div>
      )}
    </div>
  );
}
