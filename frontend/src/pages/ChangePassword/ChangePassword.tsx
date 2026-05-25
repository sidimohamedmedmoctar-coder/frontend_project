import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '@/api/users.api';
import Spinner from '@/components/Spinner/Spinner';
import styles from './ChangePassword.module.css';

// ── Validation ────────────────────────────────────────────────────────────────

function validate(old: string, next: string, confirm: string) {
  const errors = { oldPassword: '', newPassword: '', confirmPassword: '' };
  if (old.length < 4)            errors.oldPassword     = 'Min 4 caractères';
  if (next.length < 8)           errors.newPassword     = 'Min 8 caractères';
  else if (!/[A-Z]/.test(next))  errors.newPassword     = 'Au moins une majuscule';
  else if (!/[0-9]/.test(next))  errors.newPassword     = 'Au moins un chiffre';
  if (next !== confirm)          errors.confirmPassword = 'Les mots de passe ne correspondent pas';
  return errors;
}

// ── Eye icon ──────────────────────────────────────────────────────────────────

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChangePassword() {
  const navigate = useNavigate();

  const [oldPassword,     setOldPassword]     = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors,          setErrors]          = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [serverError,     setServerError]     = useState('');
  const [successMsg,      setSuccessMsg]      = useState('');
  const [loading,         setLoading]         = useState(false);
  const [showOld,         setShowOld]         = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const fieldErrors = validate(oldPassword, newPassword, confirmPassword);
    setErrors(fieldErrors);
    if (fieldErrors.oldPassword || fieldErrors.newPassword || fieldErrors.confirmPassword) return;

    setLoading(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setSuccessMsg('Mot de passe modifié avec succès. Redirection…');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 401) {
        setErrors((prev) => ({ ...prev, oldPassword: 'Ancien mot de passe incorrect' }));
      } else {
        setServerError("Une erreur s'est produite. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Changer le mot de passe</h1>

      <div className={styles.card}>
        {successMsg ? (
          <div className={styles.successMsg}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className={styles.form}>

            {serverError && (
              <div className={styles.serverError}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {serverError}
              </div>
            )}

            {/* ── Ancien mot de passe ───────────────────────────────────── */}
            <div className={styles.field}>
              <label className={styles.label}>
                Ancien mot de passe <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  className={`${styles.input} ${errors.oldPassword ? styles.inputError : ''}`}
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => { setOldPassword(e.target.value); setErrors((p) => ({ ...p, oldPassword: '' })); }}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowOld((v) => !v)} tabIndex={-1}>
                  <EyeIcon show={showOld} />
                </button>
              </div>
              {errors.oldPassword && <span className={styles.error}>{errors.oldPassword}</span>}
            </div>

            {/* ── Nouveau mot de passe ──────────────────────────────────── */}
            <div className={styles.field}>
              <label className={styles.label}>
                Nouveau mot de passe <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  className={`${styles.input} ${errors.newPassword ? styles.inputError : ''}`}
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: '' })); }}
                  autoComplete="new-password"
                  required
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowNew((v) => !v)} tabIndex={-1}>
                  <EyeIcon show={showNew} />
                </button>
              </div>
              {errors.newPassword
                ? <span className={styles.error}>{errors.newPassword}</span>
                : <span className={styles.hint}>Min 8 car., 1 majuscule, 1 chiffre</span>}
            </div>

            {/* ── Confirmer ─────────────────────────────────────────────── */}
            <div className={styles.field}>
              <label className={styles.label}>
                Confirmer le mot de passe <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                  autoComplete="new-password"
                  required
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                  <EyeIcon show={showConfirm} />
                </button>
              </div>
              {errors.confirmPassword && <span className={styles.error}>{errors.confirmPassword}</span>}
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={() => navigate('/dashboard')}>
                Annuler
              </button>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <><Spinner size={17} /> Modification…</> : 'Modifier le mot de passe'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
