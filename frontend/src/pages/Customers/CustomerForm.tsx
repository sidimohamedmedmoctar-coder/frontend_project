import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCustomer, saveCustomer, updateCustomer } from '@/api/customers.api';
import Spinner from '@/components/Spinner/Spinner';
import styles  from './CustomerForm.module.css';

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(name: string, email: string) {
  const errors = { name: '', email: '' };
  if (name.trim().length < 4) errors.name  = 'Le nom doit faire au moins 4 caractères';
  if (!EMAIL_RE.test(email))  errors.email = 'Email invalide';
  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomerForm() {
  const { id }   = useParams<{ id: string }>();
  const isEdit   = Boolean(id);
  const navigate = useNavigate();

  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [errors,      setErrors]      = useState({ name: '', email: '' });
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    getCustomer(Number(id))
      .then((c) => { setName(c.name); setEmail(c.email); })
      .catch(() => setServerError('Impossible de charger le client.'))
      .finally(() => setLoadingData(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validate(name, email);
    setErrors(fieldErrors);
    if (fieldErrors.name || fieldErrors.email) return;

    setLoading(true);
    try {
      if (isEdit && id) {
        await updateCustomer(Number(id), { name, email });
      } else {
        await saveCustomer({ name, email });
      }
      navigate('/admin/customers');
    } catch {
      setServerError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return <div className={styles.centered}><Spinner size={40} /></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} noValidate className={styles.form}>

          {serverError && (
            <div className={styles.serverError}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {serverError}
            </div>
          )}

          {/* ── Nom complet ──────────────────────────────────────────────── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Nom complet <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
              placeholder="Ex : Ahmed Benali"
              required
            />
            {errors.name
              ? <span className={styles.fieldError}>{errors.name}</span>
              : <span className={styles.fieldHint}>Min 4 caractères</span>}
          </div>

          {/* ── Email ─────────────────────────────────────────────────────── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Email <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
              placeholder="exemple@email.com"
              required
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btnCancel} onClick={() => navigate('/admin/customers')}>
              Annuler
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? <Spinner size={17} /> : (isEdit ? '✓ Enregistrer' : '✓ Créer le client')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
