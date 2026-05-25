import { useState } from 'react';
import { createUser, addRole } from '@/api/users.api';
import { getCustomers, saveCustomer, deleteCustomer } from '@/api/customers.api';
import { createCurrentAccount } from '@/api/accounts.api';
import { purgeUserLocalStorage } from '@/hooks/useRequests';
import { useAuth }          from '@/hooks/useAuth';
import { logAudit }         from '@/utils/auditLogger';
import { loadSystemConfig } from '@/utils/systemConfig';
import type { CreateUserDto } from '@/types';
import Spinner from '@/components/Spinner/Spinner';
import styles from './CreateUserModal.module.css';

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  name: string; username: string; email: string; password: string; initialBalance: string;
}

const EMPTY_ERRORS: FormErrors = { name: '', username: '', email: '', password: '', initialBalance: '' };

function validate(name: string, username: string, email: string, password: string, initialBalance: string): FormErrors {
  const e = { ...EMPTY_ERRORS };
  if (name.trim().length < 4)       e.name     = 'Le nom doit faire au moins 4 caractères';
  if (username.trim().length < 3)   e.username = 'Min 3 caractères';
  if (!email.trim())                e.email    = 'Email obligatoire';
  else if (!EMAIL_RE.test(email))   e.email    = 'Email invalide';
  if (password.length < 8)          e.password = 'Min 8 caractères';
  else if (!/[A-Z]/.test(password)) e.password = 'Au moins une majuscule requise';
  else if (!/[0-9]/.test(password)) e.password = 'Au moins un chiffre requis';
  const bal = parseFloat(initialBalance);
  if (!initialBalance || isNaN(bal) || bal < 0) e.initialBalance = 'Solde initial invalide (≥ 0)';
  return e;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { onClose: () => void; onCreated: () => void }

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateUserModal({ onClose, onCreated }: Props) {
  const { user: currentUser } = useAuth();

  const [name,           setName]           = useState('');
  const [email,          setEmail]          = useState('');
  const [username,       setUsername]       = useState('');
  const [password,       setPassword]       = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [errors,         setErrors]         = useState<FormErrors>(EMPTY_ERRORS);
  const [serverError,    setServerError]    = useState('');
  const [loading,        setLoading]        = useState(false);

  function clearError(field: keyof FormErrors) {
    setErrors((p) => ({ ...p, [field]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const fieldErrors = validate(name, username, email, password, initialBalance);
    setErrors(fieldErrors);
    if (Object.values(fieldErrors).some(Boolean)) return;

    setLoading(true);
    try {
      // 1. Créer le compte d'authentification + rôle USER
      const dto: CreateUserDto = { username, password, email };
      const newUser = await createUser(dto);
      await addRole(newUser.id, 'USER');

      // 2. Purger les profils bancaires orphelins avec le même email
      const existing = await getCustomers();
      const stale    = existing.filter((c) => c.email?.toLowerCase() === email.trim().toLowerCase());
      for (const sc of stale) {
        if (sc.id) { try { await deleteCustomer(sc.id); } catch { /* non-bloquant */ } }
      }

      // 3. Purger les données localStorage (même username)
      purgeUserLocalStorage(username);

      // 4. Créer le profil bancaire client
      const customer = await saveCustomer({ name: name.trim(), email: email.trim() });

      // 5. Créer le compte courant avec le solde initial + découvert configuré
      const cfg = loadSystemConfig();
      await createCurrentAccount({ customerId: customer.id!, initialBalance: parseFloat(initialBalance), overDraft: cfg.overdraftLimit });

      logAudit({
        level:   'INFO',
        actor:   currentUser?.username ?? 'admin',
        action:  'CREATE_USER',
        details: `Nouvel utilisateur "${username}" créé avec profil bancaire "${name.trim()}" (solde initial : ${initialBalance} MAD)`,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setServerError(msg ?? "Erreur lors de la création. Le nom d'utilisateur ou l'email existe peut-être déjà.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <p className={styles.title}>Nouveau client</p>
            <p className={styles.subtitle}>Profil bancaire + compte créés en une seule étape</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Fermer">✕</button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.body}>

            {serverError && (
              <div className={styles.serverError}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {serverError}
              </div>
            )}

            {/* ── Section 1: Infos personnelles ─────────────────────── */}
            <div>
              <div className={styles.sectionLabel}>
                <div className={styles.sectionIcon}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                Informations personnelles
              </div>
              <div className={styles.sectionGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>Nom complet <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    type="text" value={name} placeholder="Ahmed Benali"
                    onChange={(e) => { setName(e.target.value); clearError('name'); }}
                    required
                  />
                  {errors.name ? <span className={styles.fieldError}>{errors.name}</span>
                               : <span className={styles.fieldHint}>Ex : Ahmed Benali</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    type="email" value={email} placeholder="ahmed@exemple.com"
                    onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                    required
                  />
                  {errors.email ? <span className={styles.fieldError}>{errors.email}</span>
                                : <span className={styles.fieldHint}>Identifie le profil bancaire</span>}
                </div>
              </div>
            </div>

            <hr className={styles.divider} />

            {/* ── Section 2: Identifiants ───────────────────────────── */}
            <div>
              <div className={styles.sectionLabel}>
                <div className={styles.sectionIcon}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                Identifiants de connexion
              </div>
              <div className={styles.sectionGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>Nom d'utilisateur <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                    type="text" value={username} placeholder="ahmed_benali"
                    onChange={(e) => { setUsername(e.target.value); clearError('username'); }}
                    required
                  />
                  {errors.username ? <span className={styles.fieldError}>{errors.username}</span>
                                   : <span className={styles.fieldHint}>Utilisé pour se connecter</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mot de passe <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    type="password" value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                    required
                  />
                  {errors.password ? <span className={styles.fieldError}>{errors.password}</span>
                                   : <span className={styles.fieldHint}>Min 8 car., 1 majuscule, 1 chiffre</span>}
                </div>
              </div>
            </div>

            <hr className={styles.divider} />

            {/* ── Section 3: Compte bancaire ────────────────────────── */}
            <div>
              <div className={styles.sectionLabel}>
                <div className={styles.sectionIcon}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </div>
                Compte bancaire
              </div>
              <div className={styles.sectionGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>Solde initial (MAD) <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.input} ${errors.initialBalance ? styles.inputError : ''}`}
                    type="number" value={initialBalance} placeholder="0.00"
                    min="0" step="100"
                    onChange={(e) => { setInitialBalance(e.target.value); clearError('initialBalance'); }}
                    required
                  />
                  {errors.initialBalance ? <span className={styles.fieldError}>{errors.initialBalance}</span>
                                         : <span className={styles.fieldHint}>Montant de départ du compte courant</span>}
                </div>
              </div>
            </div>

          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Annuler</button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? <><Spinner size={17} /> Création…</> : '✓ Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
