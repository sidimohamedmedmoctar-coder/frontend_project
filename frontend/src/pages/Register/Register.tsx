import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegistrations } from '@/context/RegistrationContext';
import styles from './Register.module.css';

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPER    = /[A-Z]/;
const DIGIT    = /[0-9]/;

interface FormValues {
  fullName: string;
  username: string;
  email:    string;
  password: string;
  confirm:  string;
}

interface FormErrors {
  fullName?: string;
  username?: string;
  email?:    string;
  password?: string;
  confirm?:  string;
}

function validate(v: FormValues): FormErrors {
  const e: FormErrors = {};
  if (v.fullName.trim().length < 4)  e.fullName = 'Minimum 4 caractères (prénom + nom).';
  if (v.username.trim().length < 3)  e.username = 'Minimum 3 caractères.';
  if (!EMAIL_RE.test(v.email))       e.email    = 'Adresse email invalide.';
  if (v.password.length < 8)         e.password = 'Minimum 8 caractères.';
  else if (!UPPER.test(v.password))  e.password = 'Au moins une majuscule requise.';
  else if (!DIGIT.test(v.password))  e.password = 'Au moins un chiffre requis.';
  if (v.confirm !== v.password)      e.confirm  = 'Les mots de passe ne correspondent pas.';
  return e;
}

const EMPTY: FormValues = { fullName: '', username: '', email: '', password: '', confirm: '' };

// ── Icônes ────────────────────────────────────────────────────────────────────

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconAt = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4"/>
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function Register() {
  const { addRegistration } = useRegistrations();
  const navigate = useNavigate();

  const [values,     setValues]     = useState<FormValues>(EMPTY);
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validate(values);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setSubmitting(true);
      await new Promise((res) => setTimeout(res, 600));
      addRegistration({
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        email:    values.email.trim(),
        password: values.password,
      });
      setSubmitting(false);
      setSubmitted(true);
    },
    [values, addRegistration],
  );

  // ── Écran de confirmation ─────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        <div className={`${styles.card} ${styles.cardSuccess}`}>
          <div className={styles.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className={styles.successTitle}>Demande envoyée !</h2>
          <p className={styles.successText}>
            Votre demande d'ouverture de compte a bien été reçue.
            Un conseiller bancaire examinera votre dossier et vous
            contactera par email sous <strong>24–48 h</strong>.
          </p>

          {/* Étapes */}
          <div className={styles.steps}>
            <div className={`${styles.step} ${styles.stepDone}`}>
              <div className={styles.stepDot}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span>Demande soumise</span>
            </div>
            <div className={styles.stepLine} />
            <div className={`${styles.step} ${styles.stepCurrent}`}>
              <div className={styles.stepDot}>2</div>
              <span>Examen admin</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepDot}>3</div>
              <span>Compte activé</span>
            </div>
          </div>

          <button className={styles.submitBtn} onClick={() => navigate('/login')}>
            Retour à la connexion
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoBox}>
            <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
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
          <h1 className={styles.title}>Créer un compte</h1>
          <p className={styles.subtitle}>Remplissez le formulaire pour soumettre votre demande</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate className={styles.form}>

          {/* Nom complet */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">Nom complet</label>
            <div className={styles.inputWrap}>
              <span className={styles.fieldIcon}><IconUser /></span>
              <input
                id="fullName" name="fullName" type="text"
                className={`${styles.input} ${errors.fullName ? styles.inputErr : ''}`}
                placeholder="Ex : Ahmed Benali"
                value={values.fullName}
                onChange={handleChange}
                autoComplete="name"
                autoFocus
              />
            </div>
            {errors.fullName && <p className={styles.errMsg}>{errors.fullName}</p>}
          </div>

          {/* Nom d'utilisateur */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Nom d'utilisateur</label>
            <div className={styles.inputWrap}>
              <span className={styles.fieldIcon}><IconUser /></span>
              <input
                id="username" name="username" type="text"
                className={`${styles.input} ${errors.username ? styles.inputErr : ''}`}
                placeholder="Ex : ahmed.benali"
                value={values.username}
                onChange={handleChange}
                autoComplete="username"
              />
            </div>
            {errors.username && <p className={styles.errMsg}>{errors.username}</p>}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Adresse email</label>
            <div className={styles.inputWrap}>
              <span className={styles.fieldIcon}><IconAt /></span>
              <input
                id="email" name="email" type="email"
                className={`${styles.input} ${errors.email ? styles.inputErr : ''}`}
                placeholder="ahmed@exemple.com"
                value={values.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
            {errors.email && <p className={styles.errMsg}>{errors.email}</p>}
          </div>

          {/* Mot de passe */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Mot de passe</label>
            <div className={styles.inputWrap}>
              <span className={styles.fieldIcon}><IconLock /></span>
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                className={`${styles.input} ${errors.password ? styles.inputErr : ''}`}
                placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
                value={values.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? <IconEyeOff /> : <IconEyeOpen />}
              </button>
            </div>
            {errors.password && <p className={styles.errMsg}>{errors.password}</p>}
          </div>

          {/* Confirmation */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm">Confirmer le mot de passe</label>
            <div className={styles.inputWrap}>
              <span className={styles.fieldIcon}><IconLock /></span>
              <input
                id="confirm" name="confirm"
                type={showConf ? 'text' : 'password'}
                className={`${styles.input} ${errors.confirm ? styles.inputErr : ''}`}
                placeholder="Répétez votre mot de passe"
                value={values.confirm}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConf((v) => !v)} tabIndex={-1}>
                {showConf ? <IconEyeOff /> : <IconEyeOpen />}
              </button>
            </div>
            {errors.confirm && <p className={styles.errMsg}>{errors.confirm}</p>}
          </div>

          {/* Bouton */}
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting
              ? <span className={styles.spinner} />
              : <>
                  Envoyer ma demande
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
            }
          </button>
        </form>

        {/* Lien connexion */}
        <p className={styles.footer}>
          Déjà client ?{' '}
          <Link to="/login" className={styles.footerLink}>Se connecter →</Link>
        </p>
      </div>
    </div>
  );
}
