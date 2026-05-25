import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { AuthUser } from '@/types/auth';
import { logAudit } from '@/utils/auditLogger';
import styles from './Login.module.css';

function getRedirectPath(user: AuthUser): string {
  if (user.roles.includes('SUPER_ADMIN')) return '/superadmin/dashboard';
  if (user.roles.includes('ADMIN'))       return '/admin/dashboard';
  return '/user/dashboard';
}

function validateFields(username: string, password: string) {
  const errors = { username: '', password: '' };
  if (username.trim().length < 3) errors.username = 'Min 3 caractères';
  if (password.length < 4)        errors.password  = 'Min 4 caractères';
  return errors;
}

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [errors,      setErrors]      = useState({ username: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRedirectPath(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validateFields(username, password);
    setErrors(fieldErrors);
    if (fieldErrors.username || fieldErrors.password) return;
    setLoading(true);
    try {
      const loggedUser = await login(username, password);
      navigate(getRedirectPath(loggedUser));
    } catch {
      setServerError('Identifiants invalides. Veuillez réessayer.');
      logAudit({
        level:   'WARNING',
        actor:   username.trim() || 'inconnu',
        action:  'LOGIN_FAILED',
        details: `Tentative de connexion échouée pour "${username.trim()}"`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>

      {/* Orbes décoratifs en arrière-plan */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      {/* Carte centrale */}
      <div className={styles.card}>

        {/* Logo + nom */}
        <div className={styles.logoRow}>
          <div className={styles.logoBox}>
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
              <path d="M20 4L34 12V14H6V12L20 4Z" fill="white"/>
              <rect x="8"  y="16" width="4" height="12" rx="1" fill="white"/>
              <rect x="15" y="16" width="4" height="12" rx="1" fill="white"/>
              <rect x="22" y="16" width="4" height="12" rx="1" fill="white"/>
              <rect x="29" y="16" width="4" height="12" rx="1" fill="white"/>
              <rect x="6"  y="30" width="28" height="3"  rx="1.5" fill="white"/>
            </svg>
          </div>
          <span className={styles.logoName}>CSB Banque</span>
        </div>

        {/* Titre */}
        <div className={styles.heading}>
          <h1 className={styles.title}>Connexion</h1>
          <p className={styles.subtitle}>Accédez à votre espace bancaire sécurisé</p>
        </div>

        {/* Erreur serveur */}
        {serverError && (
          <div className={styles.serverError}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {serverError}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate className={styles.form}>

          {/* Username */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Nom d'utilisateur</label>
            <div className={styles.inputWrap}>
              <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                id="username"
                type="text"
                className={`${styles.input} ${errors.username ? styles.inputErr : ''}`}
                placeholder="Votre identifiant"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: '' })); }}
                autoComplete="username"
                autoFocus
              />
            </div>
            {errors.username && <p className={styles.errMsg}>{errors.username}</p>}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Mot de passe</label>
            <div className={styles.inputWrap}>
              <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`${styles.input} ${errors.password ? styles.inputErr : ''}`}
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                autoComplete="current-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? (
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
                )}
              </button>
            </div>
            {errors.password && <p className={styles.errMsg}>{errors.password}</p>}
          </div>

          {/* Bouton submit */}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading
              ? <span className={styles.spinner} />
              : <>
                  Se connecter
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
            }
          </button>
        </form>

        {/* Lien inscription */}
        <p className={styles.footer}>
          Pas encore de compte ?{' '}
          <Link to="/register" className={styles.footerLink}>
            Faire une demande →
          </Link>
        </p>
      </div>
    </div>
  );
}
