import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth }               from '@/hooks/useAuth';
import { getMe }                 from '@/api/users.api';
import { getCustomers }          from '@/api/customers.api';
import { getCustomerAccounts, getAccountOperations } from '@/api/accounts.api';
import type { AccountOperationDTO } from '@/api/accounts.api';
import { formatCurrency, formatDate } from '@/utils/formatters';
import Spinner from '@/components/Spinner/Spinner';
import styles from './TransactionHistory.module.css';

type OpType = 'ALL' | 'DEBIT' | 'CREDIT';

export default function TransactionHistory() {
  const { user } = useAuth();
  const username = user?.username ?? '';

  const [typeFilter,   setTypeFilter]   = useState<OpType>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');

  const [operations, setOperations] = useState<AccountOperationDTO[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!username) return;

    async function loadOperations() {
      setLoading(true);
      setError('');
      try {
        const me = await getMe();
        if (!me.email) return;

        const customers = await getCustomers();
        const matched   = customers.filter((c) => c.email?.toLowerCase() === me.email!.toLowerCase());
        const customer  = matched.length > 0
          ? matched.reduce((best, c) => ((c.id ?? 0) > (best.id ?? 0) ? c : best))
          : undefined;
        if (!customer?.id) return;

        const accounts = await getCustomerAccounts(customer.id);
        if (accounts.length === 0) return;

        const results = await Promise.all(accounts.map((acc) => getAccountOperations(acc.id)));
        const allOps  = results
          .flat()
          .sort((a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime());

        if (!cancelled) setOperations(allOps);
      } catch {
        if (!cancelled) setError("Impossible de charger l'historique. Veuillez réessayer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOperations();
    return () => { cancelled = true; };
  }, [username]);

  const handleReset = useCallback(() => {
    setTypeFilter('ALL');
    setSearchFilter('');
    setDateFrom('');
    setDateTo('');
  }, []);

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      if (typeFilter !== 'ALL' && op.type !== typeFilter) return false;
      if (searchFilter && !op.description.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (dateFrom && op.operationDate < dateFrom) return false;
      if (dateTo   && op.operationDate > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [operations, typeFilter, searchFilter, dateFrom, dateTo]);

  const hasFilters = typeFilter !== 'ALL' || searchFilter || dateFrom || dateTo;

  if (loading) {
    return <div className={styles.centered}><Spinner size={40} /></div>;
  }

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <h1 className={styles.title}>Historique des transactions</h1>
        <p className={styles.subtitle}>Consultez l'ensemble de vos opérations bancaires.</p>
      </div>

      {error && (
        <div className={styles.errorMsg}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Filter panel ──────────────────────────────────────────────── */}
      <div className={styles.filterPanel}>
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type</label>
            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as OpType)}
            >
              <option value="ALL">Tous</option>
              <option value="CREDIT">Entrées (+)</option>
              <option value="DEBIT">Sorties (-)</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Rechercher</label>
            <input
              className={styles.filterInput}
              type="text"
              placeholder="Mots-clés…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Du</label>
            <input
              className={styles.filterInput}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Au</label>
            <input
              className={styles.filterInput}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {hasFilters && (
            <button type="button" className={styles.btnReset} onClick={handleReset}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <p className={styles.countInfo}>
        {filtered.length} opération{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  {operations.length === 0
                    ? 'Aucune opération enregistrée sur votre compte.'
                    : 'Aucune opération correspondant aux filtres.'}
                </td>
              </tr>
            ) : (
              filtered.map((op) => (
                <tr key={`${op.accountId}-${op.id}`}>
                  <td className={styles.dateCell}>{formatDate(op.operationDate)}</td>
                  <td className={styles.descCell}>{op.description}</td>
                  <td>
                    <span className={`${styles.chip} ${op.type === 'CREDIT' ? styles.chipCredit : styles.chipDebit}`}>
                      {op.type === 'CREDIT' ? '↑ Entrée' : '↓ Sortie'}
                    </span>
                  </td>
                  <td className={op.type === 'CREDIT' ? styles.amountCredit : styles.amountDebit}>
                    {op.type === 'CREDIT' ? '+' : '-'}{formatCurrency(op.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
