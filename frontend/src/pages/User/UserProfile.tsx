import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { changePassword } from '@/api/users.api';
import Spinner from '@/components/Spinner/Spinner';
import styles from './UserProfile.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PwdValues { current: string; next: string; confirm: string }
interface PwdErrors { current?: string; next?: string; confirm?: string }

const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;

function validatePwd(v: PwdValues): PwdErrors {
  const e: PwdErrors = {};
  if (!v.current)             e.current = 'Mot de passe actuel requis.';
  if (v.next.length < 8)      e.next = 'Minimum 8 caractères.';
  else if (!UPPER.test(v.next)) e.next = 'Au moins une majuscule.';
  else if (!DIGIT.test(v.next)) e.next = 'Au moins un chiffre.';
  if (v.confirm !== v.next)   e.confirm = 'Les mots de passe ne correspondent pas.';
  return e;
}

const EMPTY_PWD: PwdValues = { current: '', next: '', confirm: '' };

// ── Eye icon ──────────────────────────────────────────────────────────────────

function EyeIcon({ show }: { show: boolean }) {
  if (show) return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UserProfile() {
  const { user } = useAuth();

  const [pwdValues,  setPwdValues]  = useState<PwdValues>(EMPTY_PWD);
  const [pwdErrors,  setPwdErrors]  = useState<PwdErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [serverErr,  setServerErr]  = useState('');

  // Show/hide toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePwdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwdValues((prev) => ({ ...prev, [name]: value }));
    setPwdErrors((prev) => ({ ...prev, [name]: undefined }));
    setPwdSuccess(false);
    setServerErr('');
  }, []);

  const handlePwdSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePwd(pwdValues);
    if (Object.keys(errs).length > 0) { setPwdErrors(errs); return; }
    setSubmitting(true);
    setServerErr('');
    try {
      await changePassword({ oldPassword: pwdValues.current, newPassword: pwdValues.next });
      setPwdSuccess(true);
      setPwdValues(EMPTY_PWD);
    } catch (err: unknown) {
      // Gestion fine des erreurs serveur (400 = ancien mdp incorrect, autres = erreur générale)
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 401) {
        setPwdErrors((prev) => ({ ...prev, current: 'Mot de passe actuel incorrect.' }));
      } else {
        setServerErr('Erreur serveur. Réessayez dans un instant.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [pwdValues]);

  const initial = user?.username?.charAt(0).toUpperCase() ?? '?';

  const roleLabel =
    user?.roles?.includes('SUPER_ADMIN') ? 'Super Administrateur' :
    user?.roles?.includes('ADMIN')       ? 'Administrateur' :
    'Client';

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h1 className={styles.title}>Mon profil</h1>
        <p className={styles.subtitle}>Informations de votre compte client.</p>
      </div>

      {/* ── Profile info ──────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.profileCard}>
          <div className={styles.profileHead}>
            <div className={styles.avatar}>{initial}</div>
            <div>
              <p className={styles.profileName}>{user?.username}</p>
              <span className={styles.profileRole}>{roleLabel}</span>
            </div>
          </div>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Nom d'utilisateur</span>
              <span className={styles.infoValue}>{user?.username}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Rôle</span>
              <span className={styles.infoValue}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change password ────────────────────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Changer le mot de passe
        </p>
        <div className={styles.passwordCard}>
          {pwdSuccess && (
            <div className={styles.alertSuccess}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Mot de passe modifié avec succès !
            </div>
          )}
          {serverErr && (
            <div className={styles.alertError}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {serverErr}
            </div>
          )}
          <form className={styles.form} onSubmit={handlePwdSubmit} noValidate>

            {[
              { name: 'current', label: 'Mot de passe actuel', show: showCurrent, toggle: () => setShowCurrent((v) => !v), hint: undefined },
              { name: 'next',    label: 'Nouveau mot de passe', show: showNext,    toggle: () => setShowNext((v) => !v),    hint: 'Minimum 8 caractères, une majuscule, un chiffre' },
              { name: 'confirm', label: 'Confirmer le nouveau mot de passe', show: showConfirm, toggle: () => setShowConfirm((v) => !v), hint: undefined },
            ].map(({ name, label, show, toggle, hint }) => (
              <div key={name} className={styles.field}>
                <label className={styles.label}>
                  {label} <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    className={`${styles.input} ${pwdErrors[name as keyof PwdErrors] ? styles.inputError : ''}`}
                    type={show ? 'text' : 'password'}
                    name={name}
                    value={pwdValues[name as keyof PwdValues]}
                    onChange={handlePwdChange}
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={toggle} tabIndex={-1}>
                    <EyeIcon show={show} />
                  </button>
                </div>
                {pwdErrors[name as keyof PwdErrors] && (
                  <span className={styles.fieldError}>{pwdErrors[name as keyof PwdErrors]}</span>
                )}
                {hint && !pwdErrors[name as keyof PwdErrors] && (
                  <span className={styles.fieldHint}>{hint}</span>
                )}
              </div>
            ))}

            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? (
                <><Spinner size={16} /> Enregistrement…</>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Enregistrer
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
