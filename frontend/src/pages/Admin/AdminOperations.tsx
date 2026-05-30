import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate }      from 'react-router-dom';
import { getAccounts, getAccountOperations } from '@/api/accounts.api';
import type { AccountOperationDTO } from '@/api/accounts.api';
import type { BankAccount, Customer } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import Spinner from '@/components/Spinner/Spinner';
import styles from './AdminOperations.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnrichedOperation extends AccountOperationDTO {
  customerName: string;
  accountType:  string;
}

const PAGE_SIZE = 15;

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminOperations() {
  const navigate = useNavigate();

  const [operations, setOperations] = useState<EnrichedOperation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [typeFilter,   setTypeFilter]   = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFilter,   setDateFilter]   = useState('');
  const [page, setPage] = useState(0);

  // ── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const accounts: BankAccount[] = await getAccounts();

        const accountCustomerMap = new Map<string, Customer>();
        for (const acc of accounts) {
          if (acc.customerDTO) accountCustomerMap.set(acc.id, acc.customerDTO);
        }

        const results = await Promise.all(accounts.map((acc) => getAccountOperations(acc.id)));

        if (cancelled) return;

        const all: EnrichedOperation[] = results
          .flat()
          .map((op) => {
            const acc      = accounts.find((a) => a.id === op.accountId);
            const customer = op.accountId ? accountCustomerMap.get(op.accountId) : undefined;
            return {
              ...op,
              customerName: customer?.name ?? '—',
              accountType:  'Courant',
            };
          })
          .sort((a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime());

        setOperations(all);
      } catch {
        if (!cancelled) setError('Impossible de charger les opérations. Vérifiez la connexion.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Filtering ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      if (typeFilter !== 'ALL' && op.type !== typeFilter) return false;
      if (dateFilter && !op.operationDate.startsWith(dateFilter)) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        if (
          !op.customerName.toLowerCase().includes(q) &&
          !(op.accountId?.toLowerCase().includes(q) ?? false) &&
          !(op.description?.toLowerCase().includes(q) ?? false)
        ) return false;
      }
      return true;
    });
  }, [operations, typeFilter, dateFilter, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetFilters = useCallback(() => {
    setTypeFilter('ALL');
    setSearchFilter('');
    setDateFilter('');
    setPage(0);
  }, []);

  const hasFilters = typeFilter !== 'ALL' || searchFilter || dateFilter;

  // ── KPI ────────────────────────────────────────────────────────────────────
  const totalDebit  = filtered.filter((o) => o.type === 'DEBIT') .reduce((s, o) => s + o.amount, 0);
  const totalCredit = filtered.filter((o) => o.type === 'CREDIT').reduce((s, o) => s + o.amount, 0);

  return (
    <div className={styles.container}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Toutes les opérations</h1>
        <p className={styles.subtitle}>Historique complet de toutes les opérations bancaires.</p>
      </div>

      {error && (
        <div className={styles.errorMsg}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      {!loading && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard} style={{ borderLeftColor: '#6366f1' }}>
            <span className={styles.kpiIcon} style={{ background: '#eef2ff', color: '#6366f1' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </span>
            <div>
              <div className={styles.kpiValue}>{filtered.length}</div>
              <div className={styles.kpiLabel}>Opérations {typeFilter !== 'ALL' ? `(${typeFilter === 'DEBIT' ? 'débits' : 'entrées'})` : 'totales'}</div>
            </div>
          </div>
          <div className={styles.kpiCard} style={{ borderLeftColor: '#ef4444' }}>
            <span className={styles.kpiIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/>
              </svg>
            </span>
            <div>
              <div className={styles.kpiValue} style={{ color: '#ef4444' }}>{formatCurrency(totalDebit)}</div>
              <div className={styles.kpiLabel}>Total débits</div>
            </div>
          </div>
          <div className={styles.kpiCard} style={{ borderLeftColor: '#22c55e' }}>
            <span className={styles.kpiIcon} style={{ background: '#f0fdf4', color: '#22c55e' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </span>
            <div>
              <div className={styles.kpiValue} style={{ color: '#22c55e' }}>{formatCurrency(totalCredit)}</div>
              <div className={styles.kpiLabel}>Total entrées</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter panel ────────────────────────────────────────────────── */}
      <div className={styles.filterPanel}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Type</label>
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(0); }}
          >
            <option value="ALL">Tous</option>
            <option value="DEBIT">Débit</option>
            <option value="CREDIT">Entrée</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Client ou compte</label>
          <input
            className={styles.filterInput}
            type="text"
            placeholder="Nom, ID ou description…"
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setPage(0); }}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Date</label>
          <input
            className={styles.filterInput}
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
          />
        </div>

        {hasFilters && (
          <button type="button" className={styles.btnReset} onClick={resetFilters}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Effacer
          </button>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.centered}><Spinner size={36} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyBox}>
          {operations.length === 0 ? 'Aucune opération enregistrée.' : 'Aucune opération pour ces filtres.'}
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Compte</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Débit</th>
                  <th>Entrée</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((op) => (
                  <tr key={String(op.id)}>
                    <td className={styles.dateCell}>{formatDate(op.operationDate)}</td>
                    <td className={styles.clientCell}>{op.customerName}</td>
                    <td>
                      <div className={styles.monoSmall}>{op.accountId?.slice(0, 16)}…</div>
                      <span className={`${styles.accountChip} ${styles.accountCurrent}`}>
                        {op.accountType}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.chip} ${op.type === 'DEBIT' ? styles.chipDebit : styles.chipCredit}`}>
                        {op.type === 'DEBIT' ? 'Débit' : 'Entrée'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.descCell}>{op.description || '—'}</div>
                    </td>
                    <td className={op.type === 'DEBIT' ? styles.amountDebit : styles.amountEmpty}>
                      {op.type === 'DEBIT' ? `- ${formatCurrency(op.amount)}` : ''}
                    </td>
                    <td className={op.type === 'CREDIT' ? styles.amountCredit : styles.amountEmpty}>
                      {op.type === 'CREDIT' ? `+ ${formatCurrency(op.amount)}` : ''}
                    </td>
                    <td className={styles.centerCell}>
                      <button
                        type="button"
                        className={styles.btnLink}
                        title="Voir le compte"
                        onClick={() => navigate(`/admin/accounts/${op.accountId}`)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ───────────────────────────────────────────── */}
          <div className={styles.paginationRow}>
            <span className={styles.paginationInfo}>
              {filtered.length} opération{filtered.length > 1 ? 's' : ''} — page {page + 1} / {totalPages}
            </span>
            <div className={styles.paginationBtns}>
              <button className={styles.pageBtn} disabled={page === 0}             onClick={() => setPage(0)}             title="Première page">«</button>
              <button className={styles.pageBtn} disabled={page === 0}             onClick={() => setPage((p) => p - 1)} title="Page précédente">‹</button>
              <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} title="Page suivante">›</button>
              <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} title="Dernière page">»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
