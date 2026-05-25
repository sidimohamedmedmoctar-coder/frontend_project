import { useState, useCallback } from 'react';
import React from 'react';
import { formatDate } from '@/utils/formatters';
import { useAllTickets } from '@/hooks/useTickets';
import { useAuth }       from '@/hooks/useAuth';
import { logAudit }      from '@/utils/auditLogger';
import type { TicketStatus } from '@/hooks/useTickets';
import styles from './AdminSupport.module.css';

// ── Status helpers ────────────────────────────────────────────────────────────

function statusClass(s: TicketStatus) {
  if (s === 'RÉSOLU')   return styles.chipResolved;
  if (s === 'EN_COURS') return styles.chipInProgress;
  return styles.chipOpen;
}

function ticketBorderClass(s: TicketStatus) {
  if (s === 'RÉSOLU')   return styles.ticketResolved;
  if (s === 'EN_COURS') return styles.ticketInProgress;
  return styles.ticketOpen;
}

// ── Ticket card (React.memo) ──────────────────────────────────────────────────

const TicketCard = React.memo(function TicketCard({
  ticket, onMarkInProgress, onRespond,
}: {
  ticket: {
    id: number; clientName: string; subject: string;
    message: string; date: string; status: TicketStatus; response?: string;
  };
  onMarkInProgress: (id: number) => void;
  onRespond:        (id: number) => void;
}) {
  return (
    <div className={`${styles.ticket} ${ticketBorderClass(ticket.status)}`}>
      <div className={styles.ticketHead}>
        <div>
          <p className={styles.ticketSubject}>{ticket.subject}</p>
          <span className={styles.ticketMeta}>
            {ticket.clientName} — {formatDate(ticket.date)}
          </span>
        </div>
        <span className={`${styles.chip} ${statusClass(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>

      <div className={styles.ticketBody}>{ticket.message}</div>

      {ticket.response && (
        <>
          <hr className={styles.ticketDivider} />
          <div className={styles.ticketResponse}>
            <span className={styles.responseLabel}>Réponse envoyée :</span>
            <p className={styles.responseText}>{ticket.response}</p>
          </div>
        </>
      )}

      {ticket.status !== 'RÉSOLU' && (
        <div className={styles.ticketActions}>
          {ticket.status === 'OUVERT' && (
            <button type="button" className={styles.btnWarning} onClick={() => onMarkInProgress(ticket.id)}>
              ⏳ Prendre en charge
            </button>
          )}
          <button type="button" className={styles.btnPrimary} onClick={() => onRespond(ticket.id)}>
            💬 Répondre & Résoudre
          </button>
        </div>
      )}
    </div>
  );
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSupport() {
  const { tickets, respondToTicket, markInProgress } = useAllTickets();
  const { user } = useAuth();
  const actor = user?.username ?? 'admin';

  const [statusFilter,  setStatusFilter]  = useState<TicketStatus | 'ALL'>('ALL');
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [activeId,      setActiveId]      = useState<number | null>(null);
  const [responseText,  setResponseText]  = useState('');
  const [responseError, setResponseError] = useState('');

  const activeTicket = tickets.find((t) => t.id === activeId) ?? null;

  const openCount    = tickets.filter((t) => t.status === 'OUVERT').length;
  const enCoursCount = tickets.filter((t) => t.status === 'EN_COURS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RÉSOLU').length;

  const handleMarkInProgress = useCallback((id: number) => {
    const t = tickets.find((x) => x.id === id);
    markInProgress(id);
    logAudit({
      level:   'INFO',
      actor,
      action:  'TICKET_IN_PROGRESS',
      details: `Ticket #${id} "${t?.subject ?? '?'}" (${t?.clientName ?? '?'}) pris en charge`,
    });
  }, [tickets, markInProgress, actor]);

  const handleRespond = useCallback((id: number) => {
    const t = tickets.find((x) => x.id === id);
    setActiveId(id);
    setResponseText(t?.response ?? '');
    setResponseError('');
    setDialogOpen(true);
  }, [tickets]);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    setActiveId(null);
    setResponseText('');
    setResponseError('');
  }, []);

  const handleSend = useCallback(() => {
    if (!responseText.trim()) {
      setResponseError('La réponse ne peut pas être vide.');
      return;
    }
    if (activeId !== null) {
      const t = tickets.find((x) => x.id === activeId);
      respondToTicket(activeId, responseText);
      logAudit({
        level:   'INFO',
        actor,
        action:  'RESPOND_TICKET',
        details: `Ticket #${activeId} "${t?.subject ?? '?'}" (${t?.clientName ?? '?'}) résolu`,
      });
    }
    handleClose();
  }, [responseText, activeId, tickets, respondToTicket, handleClose, actor]);

  const filtered = tickets.filter((t) => statusFilter === 'ALL' || t.status === statusFilter);

  return (
    <div className={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Support client</h1>
        <p className={styles.subtitle}>
          {openCount} ticket{openCount !== 1 ? 's' : ''} ouvert{openCount !== 1 ? 's' : ''} —{' '}
          {enCoursCount} en cours de traitement.
        </p>
      </div>

      {/* ── Filter ──────────────────────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'ALL')}
        >
          <option value="ALL">Tous ({tickets.length})</option>
          <option value="OUVERT">🔴 Ouverts ({openCount})</option>
          <option value="EN_COURS">⏳ En cours ({enCoursCount})</option>
          <option value="RÉSOLU">✅ Résolus ({resolvedCount})</option>
        </select>
      </div>

      {/* ── Ticket list ─────────────────────────────────────────────────── */}
      <div className={styles.ticketList}>
        {filtered.length === 0 ? (
          <div className={styles.emptyBox}>
            {tickets.length === 0
              ? 'Aucun ticket de support reçu pour le moment.'
              : 'Aucun ticket pour ce filtre.'}
          </div>
        ) : (
          [...filtered].reverse().map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              onMarkInProgress={handleMarkInProgress}
              onRespond={handleRespond}
            />
          ))
        )}
      </div>

      {/* ── Response modal ──────────────────────────────────────────────── */}
      {dialogOpen && (
        <div className={styles.overlay} onClick={handleClose}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>
                💬 Répondre — {activeTicket?.subject}
              </p>
              <p className={styles.modalSubtitle}>
                Client : <strong>{activeTicket?.clientName}</strong>
              </p>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalQuote}>« {activeTicket?.message} »</div>

              {responseError && (
                <div className={styles.modalErrorMsg}>{responseError}</div>
              )}

              <textarea
                className={styles.textarea}
                rows={4}
                value={responseText}
                onChange={(e) => { setResponseText(e.target.value); setResponseError(''); }}
                placeholder="Répondez au client de manière claire et précise…"
                autoFocus
              />
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={handleClose}>
                Annuler
              </button>
              <button type="button" className={styles.btnSend} onClick={handleSend}>
                ✓ Envoyer & Résoudre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
