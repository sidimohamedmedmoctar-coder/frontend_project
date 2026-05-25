import { useState, useCallback, useEffect } from 'react';
import { useAuth }       from '@/hooks/useAuth';
import { useTickets }    from '@/hooks/useTickets';
import type { TicketStatus } from '@/hooks/useTickets';
import { getMe }         from '@/api/users.api';
import { getCustomers }  from '@/api/customers.api';
import { formatDate }    from '@/utils/formatters';
import styles from './UserSupport.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'new' | 'history';

interface FormValues { subject: string; message: string }
interface FormErrors { subject?: string; message?: string }

const SUBJECTS = [
  'Problème de virement',
  'Blocage de carte bancaire',
  'Relevé de compte',
  'Mise à jour des coordonnées',
  'Erreur sur mon solde',
  'Demande de renseignement',
  'Autre',
];

function validate(v: FormValues): FormErrors {
  const e: FormErrors = {};
  if (!v.subject.trim())            e.subject = 'Veuillez choisir un sujet.';
  if (v.message.trim().length < 10) e.message = 'Décrivez votre problème (min. 10 caractères).';
  return e;
}

function statusClass(s: TicketStatus) {
  if (s === 'RÉSOLU')   return styles.chipResolved;
  if (s === 'EN_COURS') return styles.chipInProgress;
  return styles.chipOpen;
}

function statusLabel(s: TicketStatus): string {
  if (s === 'RÉSOLU')   return '✅ Résolu';
  if (s === 'EN_COURS') return '⏳ En cours';
  return '🔴 Ouvert';
}

function ticketBorderClass(s: TicketStatus) {
  if (s === 'RÉSOLU')   return styles.ticketResolved;
  if (s === 'EN_COURS') return styles.ticketInProgress;
  return styles.ticketOpen;
}

const EMPTY: FormValues = { subject: '', message: '' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function UserSupport() {
  const { user }   = useAuth();
  const username   = user?.username ?? '';

  const { tickets, addTicket } = useTickets(username);

  const [tab,        setTab]        = useState<TabId>('new');
  const [values,     setValues]     = useState<FormValues>(EMPTY);
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [success,    setSuccess]    = useState(false);
  const [clientName, setClientName] = useState(username);

  // Get full client name for admin display
  useEffect(() => {
    let cancelled = false;
    if (!username) return;
    async function fetchName() {
      try {
        const me        = await getMe();
        const customers = await getCustomers();
        const matched   = customers.filter((c) => c.email?.toLowerCase() === me.email?.toLowerCase());
        const found     = matched.length > 0 ? matched.reduce((best, c) => ((c.id ?? 0) > (best.id ?? 0) ? c : best)) : undefined;
        if (!cancelled && found?.name) setClientName(found.name);
      } catch { /* silencieux */ }
    }
    fetchName();
    return () => { cancelled = true; };
  }, [username]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSuccess(false);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(values);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    addTicket({ subject: values.subject, message: values.message, clientName });
    setValues(EMPTY);
    setSuccess(true);
    setTab('history');
  }, [values, addTicket, clientName]);

  const openCount = tickets.filter((t) => t.status === 'OUVERT').length;

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h1 className={styles.title}>Support client</h1>
        <p className={styles.subtitle}>Contactez notre équipe pour toute question ou problème sur votre compte.</p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${tab === 'new' ? styles.tabActive : ''}`} onClick={() => setTab('new')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Nouveau ticket
        </button>
        <button type="button" className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Mes tickets
          <span className={styles.tabBadge}>{tickets.length}</span>
          {openCount > 0 && <span className={styles.badge}>{openCount}</span>}
        </button>
      </div>

      {/* ── Tab: Nouveau ticket ─────────────────────────────────────────── */}
      {tab === 'new' && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Soumettre une demande d'assistance
          </p>

          <div className={styles.alertInfo}>
            Notre équipe vous répondra dans les plus brefs délais. Vous serez notifié dès qu'une réponse sera disponible dans vos tickets.
          </div>

          {success && (
            <div className={styles.alertSuccess}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Votre ticket a été soumis ! Un conseiller va le traiter prochainement.
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>

            <div className={styles.field}>
              <label className={styles.label}>Sujet <span className={styles.required}>*</span></label>
              <select
                className={`${styles.select} ${errors.subject ? styles.inputError : ''}`}
                name="subject"
                value={values.subject}
                onChange={handleChange}
                required
              >
                <option value="">— Choisir un sujet —</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.subject && <span className={styles.fieldError}>{errors.subject}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Décrivez votre problème <span className={styles.required}>*</span></label>
              <textarea
                className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
                name="message"
                value={values.message}
                onChange={handleChange}
                rows={5}
                placeholder="Ex. Mon virement du 18/05 d'un montant de 2 000 MAD n'est pas arrivé sur le compte bénéficiaire…"
                required
              />
              {errors.message && <span className={styles.fieldError}>{errors.message}</span>}
              {!errors.message && <span className={styles.fieldHint}>Donnez le maximum de détails pour accélérer le traitement.</span>}
            </div>

            <button type="submit" className={styles.btnSubmit}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Envoyer le ticket
            </button>
          </form>
        </div>
      )}

      {/* ── Tab: Mes tickets ────────────────────────────────────────────── */}
      {tab === 'history' && (
        <>
          {success && (
            <div className={styles.alertSuccess} style={{ marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Votre ticket a bien été soumis. Vous pouvez suivre son état ci-dessous.
            </div>
          )}

          {tickets.length === 0 ? (
            <div className={styles.emptyBox}>
              Aucun ticket pour le moment. Créez votre première demande !
            </div>
          ) : (
            <div className={styles.ticketList}>
              {[...tickets].reverse().map((ticket) => (
                <div key={ticket.id} className={`${styles.ticket} ${ticketBorderClass(ticket.status)}`}>
                  <div className={styles.ticketHead}>
                    <div>
                      <p className={styles.ticketSubject}>{ticket.subject}</p>
                      <span className={styles.ticketDate}>Soumis le {formatDate(ticket.date)}</span>
                    </div>
                    <span className={`${styles.chip} ${statusClass(ticket.status)}`}>
                      {statusLabel(ticket.status)}
                    </span>
                  </div>

                  <div className={styles.ticketBody}>{ticket.message}</div>

                  {ticket.response && (
                    <>
                      <hr className={styles.ticketDivider} />
                      <div className={styles.ticketResponse}>
                        <span className={styles.responseLabel}>💬 Réponse du conseiller :</span>
                        <p className={styles.responseText}>{ticket.response}</p>
                      </div>
                    </>
                  )}

                  {!ticket.response && ticket.status === 'EN_COURS' && (
                    <div className={styles.inProgressNote}>
                      ⏳ Un conseiller est en train de traiter votre demande…
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
