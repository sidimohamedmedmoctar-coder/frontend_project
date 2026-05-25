import { useState, useCallback } from 'react';
import Spinner     from '@/components/Spinner/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/utils/auditLogger';
import { loadSystemConfig, saveSystemConfig } from '@/utils/systemConfig';
import styles from './SystemConfig.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConfigValues {
  overdraftLimit:   string;
  transferLimit:    string;
  transferFee:      string;
  creditMinAmount:  string;
  creditMaxAmount:  string;
}

interface ConfigErrors {
  overdraftLimit?:  string;
  transferLimit?:   string;
  transferFee?:     string;
  creditMinAmount?: string;
  creditMaxAmount?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validatePositive(val: string, label: string): string | undefined {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n < 0) return `${label} invalide (doit être ≥ 0).`;
  return undefined;
}

function validate(v: ConfigValues): ConfigErrors {
  const e: ConfigErrors = {};
  const od = validatePositive(v.overdraftLimit, 'Plafond découvert');
  const tl = validatePositive(v.transferLimit,  'Plafond virement');
  const tf = validatePositive(v.transferFee,    'Frais de virement');
  const ca = validatePositive(v.creditMinAmount,'Montant min versement');
  const cb = validatePositive(v.creditMaxAmount,'Montant max versement');
  if (od) e.overdraftLimit  = od;
  if (tl) e.transferLimit   = tl;
  if (tf) e.transferFee     = tf;
  if (ca) e.creditMinAmount = ca;
  if (cb) e.creditMaxAmount = cb;
  if (!e.creditMinAmount && !e.creditMaxAmount) {
    if (parseFloat(v.creditMinAmount) >= parseFloat(v.creditMaxAmount)) {
      e.creditMaxAmount = 'Le montant max doit être supérieur au montant min.';
    }
  }
  return e;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SystemConfig() {
  const { user } = useAuth();

  // Initialise depuis le localStorage (ou les valeurs par défaut)
  const [values, setValues] = useState<ConfigValues>(() => {
    const c = loadSystemConfig();
    return {
      overdraftLimit:   String(c.overdraftLimit),
      transferLimit:    String(c.transferLimit),
      transferFee:      String(c.transferFee),
      creditMinAmount:  String(c.creditMinAmount),
      creditMaxAmount:  String(c.creditMaxAmount),
    };
  });
  const [errors,     setErrors]     = useState<ConfigErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSuccess(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validate(values);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setSubmitting(true);
      try {
        await new Promise((res) => setTimeout(res, 500));
        saveSystemConfig({
          overdraftLimit:  parseFloat(values.overdraftLimit),
          transferLimit:   parseFloat(values.transferLimit),
          transferFee:     parseFloat(values.transferFee),
          creditMinAmount: parseFloat(values.creditMinAmount),
          creditMaxAmount: parseFloat(values.creditMaxAmount),
        });
        setSuccess(true);
        logAudit({
          level:   'INFO',
          actor:   user?.username ?? 'superadmin',
          action:  'CONFIG_UPDATE',
          details: `Paramètres mis à jour — découvert : ${values.overdraftLimit} MAD, plafond virement : ${values.transferLimit} MAD, frais : ${values.transferFee}%, versement : ${values.creditMinAmount}–${values.creditMaxAmount} MAD`,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [values, user],
  );

  return (
    <div className={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.title}>⚙️ Configuration du système</h1>
        <p className={styles.subtitle}>Paramètres globaux appliqués à toutes les opérations bancaires.</p>
      </div>

      {/* ── Success banner ──────────────────────────────────────────────────── */}
      {success && (
        <div className={styles.successBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Configuration enregistrée et appliquée à l'ensemble de l'application !
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.grid}>

          {/* ── Compte Courant ──────────────────────────────────────────────── */}
          <div className={styles.configCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>💳</div>
              <h3 className={styles.cardTitle}>Compte Courant</h3>
            </div>
            <hr className={styles.cardDivider} />
            <div className={styles.cardFields}>
              <div className={styles.field}>
                <label className={styles.label}>Découvert autorisé (MAD)</label>
                <input
                  className={`${styles.input} ${errors.overdraftLimit ? styles.inputError : ''}`}
                  type="number"
                  name="overdraftLimit"
                  value={values.overdraftLimit}
                  onChange={handleChange}
                  step="500"
                  min="0"
                />
                {errors.overdraftLimit
                  ? <span className={styles.fieldError}>{errors.overdraftLimit}</span>
                  : <span className={styles.fieldHint}>Appliqué à la création de chaque compte</span>}
              </div>
            </div>
          </div>

          {/* ── Virements ───────────────────────────────────────────────────── */}
          <div className={styles.configCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>💸</div>
              <h3 className={styles.cardTitle}>Virements</h3>
            </div>
            <hr className={styles.cardDivider} />
            <div className={styles.cardFields}>
              <div className={styles.field}>
                <label className={styles.label}>Plafond journalier (MAD)</label>
                <input
                  className={`${styles.input} ${errors.transferLimit ? styles.inputError : ''}`}
                  type="number"
                  name="transferLimit"
                  value={values.transferLimit}
                  onChange={handleChange}
                  step="1000"
                  min="0"
                />
                {errors.transferLimit && <span className={styles.fieldError}>{errors.transferLimit}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Frais de virement (%)</label>
                <input
                  className={`${styles.input} ${errors.transferFee ? styles.inputError : ''}`}
                  type="number"
                  name="transferFee"
                  value={values.transferFee}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  placeholder="0.5"
                />
                {errors.transferFee
                  ? <span className={styles.fieldError}>{errors.transferFee}</span>
                  : <span className={styles.fieldHint}>Ex. 0.5 pour 0.5% — 0 pour aucun frais</span>}
              </div>
            </div>
          </div>

          {/* ── Versement ───────────────────────────────────────────────────── */}
          <div className={styles.configCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>💰</div>
              <h3 className={styles.cardTitle}>Versement</h3>
            </div>
            <hr className={styles.cardDivider} />
            <div className={styles.cardFields}>
              <div className={styles.field}>
                <label className={styles.label}>Montant minimum (MAD)</label>
                <input
                  className={`${styles.input} ${errors.creditMinAmount ? styles.inputError : ''}`}
                  type="number"
                  name="creditMinAmount"
                  value={values.creditMinAmount}
                  onChange={handleChange}
                  step="1000"
                  min="0"
                />
                {errors.creditMinAmount && <span className={styles.fieldError}>{errors.creditMinAmount}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Montant maximum (MAD)</label>
                <input
                  className={`${styles.input} ${errors.creditMaxAmount ? styles.inputError : ''}`}
                  type="number"
                  name="creditMaxAmount"
                  value={values.creditMaxAmount}
                  onChange={handleChange}
                  step="10000"
                  min="0"
                />
                {errors.creditMaxAmount && <span className={styles.fieldError}>{errors.creditMaxAmount}</span>}
              </div>
            </div>
          </div>

        </div>

        {/* ── Submit ──────────────────────────────────────────────────────────── */}
        <div className={styles.submitRow}>
          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting
              ? <><Spinner size={18} /> Enregistrement…</>
              : '💾 Enregistrer la configuration'}
          </button>
        </div>

      </form>
    </div>
  );
}
