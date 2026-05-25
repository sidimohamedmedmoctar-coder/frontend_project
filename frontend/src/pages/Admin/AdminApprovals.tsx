import { useState, useCallback } from 'react';
import React from 'react';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { useRegistrations }   from '@/context/RegistrationContext';
import { useAllRequests }     from '@/hooks/useRequests';
import { credit }             from '@/api/accounts.api';
import { useAuth }            from '@/hooks/useAuth';
import { logAudit }           from '@/utils/auditLogger';
import { loadSystemConfig }   from '@/utils/systemConfig';
import type { RegistrationStatus } from '@/context/RegistrationContext';
import type { RequestStatus }      from '@/hooks/useRequests';
import styles from './AdminApprovals.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReqType = 'RELEVE' | 'VERSEMENT';
type TabId   = 'requests' | 'registrations';

// ── Status chip helpers ───────────────────────────────────────────────────────

function reqStatusClass(s: RequestStatus) {
  if (s === 'APPROUVÉE') return styles.chipSuccess;
  if (s === 'REFUSÉE')   return styles.chipDanger;
  return styles.chipPending;
}

function regStatusClass(s: RegistrationStatus) {
  if (s === 'APPROUVÉE') return styles.chipSuccess;
  if (s === 'REFUSÉE')   return styles.chipDanger;
  return styles.chipPending;
}

// ── Action buttons (React.memo) ───────────────────────────────────────────────

const ActionButtons = React.memo(function ActionButtons({
  id, status, onApprove, onReject,
}: {
  id: number; status: RequestStatus;
  onApprove: (id: number) => void; onReject: (id: number) => void;
}) {
  if (status !== 'EN_ATTENTE') {
    return <span className={styles.resolvedCell}>—</span>;
  }
  return (
    <div className={styles.actions}>
      <button type="button" className={styles.btnApprove} onClick={() => onApprove(id)}>
        ✓ Approuver
      </button>
      <button type="button" className={styles.btnReject} onClick={() => onReject(id)}>
        ✗ Refuser
      </button>
    </div>
  );
});

const RegistrationActions = React.memo(function RegistrationActions({
  id, status, onApprove, onReject, approving,
}: {
  id: number; status: RegistrationStatus; approving: boolean;
  onApprove: (id: number) => void; onReject: (id: number) => void;
}) {
  if (status !== 'EN_ATTENTE') {
    return <span className={styles.resolvedCell}>—</span>;
  }
  return (
    <div className={styles.actions}>
      <button type="button" className={styles.btnApprove} onClick={() => onApprove(id)} disabled={approving}>
        ✓ Créer le compte
      </button>
      <button type="button" className={styles.btnReject} onClick={() => onReject(id)} disabled={approving}>
        ✗ Refuser
      </button>
    </div>
  );
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminApprovals() {
  const { pendingRegistrations, approveRegistration, rejectRegistration } = useRegistrations();
  const { requests, updateRequestStatus } = useAllRequests();
  const { user } = useAuth();
  const actor = user?.username ?? 'admin';

  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [typeFilter,   setTypeFilter]   = useState<ReqType | 'ALL'>('ALL');
  const [tab,          setTab]          = useState<TabId>('registrations');
  const [approving,    setApproving]    = useState(false);
  const [approveError, setApproveError] = useState('');
  const [reqError,     setReqError]     = useState('');

  const handleApproveReq = useCallback(async (id: number) => {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    if (req.type === 'VERSEMENT') {
      if (!req.accountId || !req.amount) {
        setReqError('Données de versement manquantes (compte ou montant introuvable).');
        return;
      }
      // Vérification des limites de la configuration
      const cfg = loadSystemConfig();
      if (req.amount < cfg.creditMinAmount) {
        setReqError(`Montant inférieur au minimum autorisé (${req.amount.toLocaleString('fr-FR')} < ${cfg.creditMinAmount.toLocaleString('fr-FR')} MAD). Refusez cette demande.`);
        return;
      }
      if (req.amount > cfg.creditMaxAmount) {
        setReqError(`Montant supérieur au maximum autorisé (${req.amount.toLocaleString('fr-FR')} > ${cfg.creditMaxAmount.toLocaleString('fr-FR')} MAD). Refusez cette demande.`);
        return;
      }
      try {
        await credit({ accountId: req.accountId, amount: req.amount, description: req.description });
      } catch {
        setReqError('Erreur lors du versement. Veuillez réessayer.');
        return;
      }
    }
    updateRequestStatus(id, 'APPROUVÉE');
    logAudit({
      level:   'INFO',
      actor,
      action:  'APPROVE_REQUEST',
      details: `Demande #${id} (${req.type}) de "${req.username}" approuvée`,
    });
    setReqError('');
  }, [requests, updateRequestStatus, actor]);

  const handleRejectReq = useCallback((id: number) => {
    const req = requests.find((r) => r.id === id);
    updateRequestStatus(id, 'REFUSÉE');
    logAudit({
      level:   'WARNING',
      actor,
      action:  'REJECT_REQUEST',
      details: `Demande #${id} (${req?.type ?? '?'}) de "${req?.username ?? '?'}" refusée`,
    });
    setReqError('');
  }, [requests, updateRequestStatus, actor]);

  const handleApproveReg = useCallback(async (id: number) => {
    const reg = pendingRegistrations.find((r) => r.id === id);
    setApproving(true);
    setApproveError('');
    try {
      await approveRegistration(id);
      logAudit({
        level:   'INFO',
        actor,
        action:  'APPROVE_REGISTRATION',
        details: `Inscription de "${reg?.username ?? '?'}" (${reg?.fullName ?? '?'}) approuvée — compte utilisateur créé`,
      });
    } catch {
      setApproveError("Erreur lors de la création du compte. Le nom d'utilisateur est peut-être déjà pris.");
    } finally {
      setApproving(false);
    }
  }, [pendingRegistrations, approveRegistration, actor]);

  const handleRejectReg = useCallback((id: number) => {
    const reg = pendingRegistrations.find((r) => r.id === id);
    rejectRegistration(id);
    logAudit({
      level:   'WARNING',
      actor,
      action:  'REJECT_REGISTRATION',
      details: `Inscription de "${reg?.username ?? '?'}" (${reg?.fullName ?? '?'}) refusée`,
    });
  }, [pendingRegistrations, rejectRegistration, actor]);

  const filtered = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (typeFilter   !== 'ALL' && r.type   !== typeFilter)   return false;
    return true;
  });

  const pendingReqCount = requests.filter((r) => r.status === 'EN_ATTENTE').length;
  const pendingRegCount = pendingRegistrations.filter((r) => r.status === 'EN_ATTENTE').length;

  return (
    <div className={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Validation des demandes</h1>
        <p className={styles.subtitle}>Gérez les demandes de services et les nouvelles inscriptions clients.</p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'requests' ? styles.tabActive : ''}`}
          onClick={() => setTab('requests')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Demandes de services
          <span className={styles.tabBadge}>{pendingReqCount}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'registrations' ? styles.tabActive : ''}`}
          onClick={() => setTab('registrations')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Nouvelles inscriptions
          <span className={styles.tabBadge}>{pendingRegCount}</span>
        </button>
      </div>

      {/* ── Tab: Demandes de services ────────────────────────────────────── */}
      {tab === 'requests' && (
        <>
          {reqError && (
            <div className={styles.errorMsg}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {reqError}
            </div>
          )}

          <div className={styles.filterBar}>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'ALL')}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="APPROUVÉE">Approuvée</option>
              <option value="REFUSÉE">Refusée</option>
            </select>

            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ReqType | 'ALL')}
            >
              <option value="ALL">Tous les types</option>
              <option value="RELEVE">Relevé de compte</option>
              <option value="VERSEMENT">Versement</option>
            </select>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyCell}>Aucune demande.</td></tr>
                ) : (
                  filtered.map((req) => (
                    <tr key={req.id}>
                      <td className={styles.dateCell}>{formatDate(req.date)}</td>
                      <td className={styles.clientName}>{req.username}</td>
                      <td><span className={`${styles.chip} ${styles.chipNeutral}`}>{req.type}</span></td>
                      <td className={styles.descCell}>{req.description}</td>
                      <td>{req.amount ? formatCurrency(req.amount) : '—'}</td>
                      <td>
                        <span className={`${styles.chip} ${reqStatusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <ActionButtons
                          id={req.id} status={req.status}
                          onApprove={handleApproveReq} onReject={handleRejectReq}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Tab: Inscriptions ───────────────────────────────────────────── */}
      {tab === 'registrations' && (
        <>
          {approveError && (
            <div className={styles.errorMsg}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {approveError}
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Nom complet</th>
                  <th>Nom d'utilisateur</th>
                  <th>Email</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRegistrations.length === 0 ? (
                  <tr><td colSpan={6} className={styles.emptyCell}>Aucune inscription en attente.</td></tr>
                ) : (
                  pendingRegistrations.map((reg) => (
                    <tr key={reg.id}>
                      <td className={styles.dateCell}>{formatDate(reg.date)}</td>
                      <td className={styles.clientName}>{reg.fullName}</td>
                      <td className={styles.monoCell}>{reg.username}</td>
                      <td className={styles.descCell}>{reg.email}</td>
                      <td>
                        <span className={`${styles.chip} ${regStatusClass(reg.status)}`}>
                          {reg.status}
                        </span>
                      </td>
                      <td>
                        <RegistrationActions
                          id={reg.id} status={reg.status}
                          onApprove={handleApproveReg} onReject={handleRejectReg}
                          approving={approving}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
