import { useState, useEffect, useCallback, useMemo } from 'react';
import Spinner       from '@/components/Spinner/Spinner';
import { formatDate } from '@/utils/formatters';
import { loadAuditLogs, clearAuditLogs, AUDIT_KEY } from '@/utils/auditLogger';
import type { AuditLevel } from '@/utils/auditLogger';
import styles from './AuditLogs.module.css';

// ── Level chip helper ─────────────────────────────────────────────────────────

function levelChipClass(l: AuditLevel) {
  if (l === 'WARNING') return styles.chipWarning;
  if (l === 'ERROR')   return styles.chipError;
  return styles.chipInfo;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditLogs() {
  const [logs,        setLogs]        = useState(() => loadAuditLogs());
  const [loading,     setLoading]     = useState(false);
  const [levelFilter, setLevelFilter] = useState<AuditLevel | 'ALL'>('ALL');
  const [actorFilter, setActorFilter] = useState('');
  const [dateFilter,  setDateFilter]  = useState('');

  // Sync in real-time with other tabs / actions
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === AUDIT_KEY) setLogs(loadAuditLogs());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleReset = useCallback(() => {
    setLevelFilter('ALL');
    setActorFilter('');
    setDateFilter('');
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('Vider définitivement tous les journaux d\'audit ?')) {
      clearAuditLogs();
      setLogs([]);
    }
  }, []);

  const filtered = useMemo(() => {
    return [...logs].reverse().filter((l) => {
      if (levelFilter !== 'ALL' && l.level !== levelFilter) return false;
      if (actorFilter && !l.actor.toLowerCase().includes(actorFilter.toLowerCase())) return false;
      if (dateFilter  && !l.timestamp.startsWith(dateFilter)) return false;
      return true;
    });
  }, [logs, levelFilter, actorFilter, dateFilter]);

  const hasFilters = levelFilter !== 'ALL' || actorFilter.trim() !== '' || dateFilter !== '';

  if (loading) {
    return <div className={styles.loading}><Spinner size={40} /></div>;
  }

  return (
    <div className={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🗂️ Journaux d'audit</h1>
          <p className={styles.subtitle}>Traçabilité en temps réel de toutes les actions effectuées sur le système.</p>
        </div>
        {logs.length > 0 && (
          <button type="button" className={styles.btnClear} onClick={handleClear}>
            🗑 Vider les logs
          </button>
        )}
      </div>

      {/* ── Filter panel ────────────────────────────────────────────────────── */}
      <div className={styles.filterPanel}>
        <div className={styles.filterRow}>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Niveau</span>
            <select
              className={styles.filterSelect}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as AuditLevel | 'ALL')}
            >
              <option value="ALL">Tous les niveaux</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Acteur</span>
            <input
              className={styles.filterInput}
              type="text"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder="admin, user…"
            />
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Date</span>
            <input
              className={styles.filterInput}
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {hasFilters && (
            <div className={styles.filterActions}>
              <button type="button" className={styles.btnReset} onClick={handleReset}>
                ✕ Réinitialiser
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Count ───────────────────────────────────────────────────────────── */}
      <div className={styles.countRow}>
        <span className={styles.countPill}>
          {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          (les plus récentes en premier)
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className={styles.tableCard}>
        {logs.length === 0 ? (
          <div className={styles.emptyAudit}>
            <p className={styles.emptyIcon}>📋</p>
            <p className={styles.emptyText}>Aucune action enregistrée pour l'instant.</p>
            <p className={styles.emptyHint}>Les actions (connexions, approbations, virements…) apparaîtront ici automatiquement.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Niveau</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={5}>Aucune entrée trouvée pour ces filtres.</td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.cellMono}>{formatDate(log.timestamp)}</td>
                    <td>
                      <span className={`${styles.chip} ${levelChipClass(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className={styles.cellActor}>{log.actor}</td>
                    <td className={styles.cellAction}>{log.action}</td>
                    <td className={styles.cellDetails}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
