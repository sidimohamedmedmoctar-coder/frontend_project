import { useEffect, useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import { useAuth }                from '@/hooks/useAuth';
import { getMe }                  from '@/api/users.api';
import { getCustomers }           from '@/api/customers.api';
import { getCustomerAccounts, getAccountOperations } from '@/api/accounts.api';
import type { AccountOperationDTO } from '@/api/accounts.api';
import type { BankAccount }        from '@/types';
import Spinner                    from '@/components/Spinner/Spinner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import styles from './BankStatement.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientInfo { name: string; email: string }

// ── RIB formatter ─────────────────────────────────────────────────────────────

function formatRib(rib: string): string {
  return rib.replace(/(.{4})/g, '$1 ').trim();
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function PrintIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BankStatement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const username = user?.username ?? '';

  const [client,     setClient]     = useState<ClientInfo | null>(null);
  const [accounts,   setAccounts]   = useState<BankAccount[]>([]);
  const [operations, setOperations] = useState<AccountOperationDTO[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  useEffect(() => {
    let cancelled = false;
    if (!username) return;

    async function load() {
      setLoading(true);
      try {
        const me        = await getMe();
        const customers = await getCustomers();
        const matched   = customers.filter(
          (c) => c.email?.toLowerCase() === me.email?.toLowerCase(),
        );
        const customer  = matched.length > 0
          ? matched.reduce((best, c) => ((c.id ?? 0) > (best.id ?? 0) ? c : best))
          : undefined;

        if (!customer?.id) { setError('Profil bancaire introuvable.'); return; }
        if (!cancelled) setClient({ name: customer.name, email: customer.email });

        const accs = await getCustomerAccounts(customer.id);
        if (!cancelled) setAccounts(accs);

        const results = await Promise.all(accs.map((acc) => getAccountOperations(acc.id)));
        const allOps = results
          .flat()
          .sort((a, b) => new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime());
        if (!cancelled) setOperations(allOps);
      } catch {
        if (!cancelled) setError('Impossible de charger le relevé. Vérifiez la connexion.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [username]);

  if (loading) {
    return <div className={styles.loading}><Spinner size={40} /></div>;
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorBanner}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
        <button type="button" className={styles.btnBack} onClick={() => navigate(-1)}>
          <BackIcon /> Retour
        </button>
      </div>
    );
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className={styles.container}>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className={styles.actions}>
        <button type="button" className={styles.btnBack} onClick={() => navigate(-1)}>
          <BackIcon /> Retour
        </button>
        <button type="button" className={styles.btnPrint} onClick={() => window.print()}>
          <PrintIcon /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      {/* ═══════ DOCUMENT RELEVÉ ═══════ */}
      <div className={styles.document}>

        {/* ── En-tête banque ──────────────────────────────────────────────── */}
        <div className={styles.docHeader}>
          <div>
            <p className={styles.bankName}>🏦 CSB Banque</p>
            <p className={styles.bankTagline}>Votre banque en ligne — csbbanque.ma</p>
          </div>
          <div className={styles.docTitleWrap}>
            <p className={styles.docTitle}>Relevé de compte</p>
            <p className={styles.docDate}>Généré le {generatedAt}</p>
          </div>
        </div>

        <hr className={styles.headerDivider} />

        {/* ── Infos client ────────────────────────────────────────────────── */}
        <div className={styles.clientSection}>
          <p className={styles.sectionLabel}>Titulaire du compte</p>
          <p className={styles.clientName}>{client?.name}</p>
          <p className={styles.clientEmail}>{client?.email}</p>
        </div>

        {/* ── Comptes ─────────────────────────────────────────────────────── */}
        <p className={`${styles.sectionLabel} ${styles.opsLabel}`}>Mes comptes</p>
        <div className={styles.accountsGrid}>
          {accounts.map((acc) => {
            const isCurrent = acc.type === 'CurrentAccount';
            return (
              <div
                key={acc.id}
                className={`${styles.accountCard} ${styles.accountCurrent}`}
              >
                <p className={styles.accountType}>
                  💳 Compte Courant
                </p>
                <p className={styles.accountRib}>RIB : {acc.rib ? formatRib(acc.rib) : '—'}</p>
                <p className={styles.accountId}>ID : {acc.id}</p>
                <p className={`${styles.accountBalance} ${styles.accountBalanceCurrent}`}>
                  Solde : {formatCurrency(acc.balance)}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Solde total ─────────────────────────────────────────────────── */}
        <div className={styles.totalRow}>
          <p className={styles.totalLabel}>Solde total de tous les comptes</p>
          <p className={styles.totalAmount}>{formatCurrency(totalBalance)}</p>
        </div>

        {/* ── Opérations ──────────────────────────────────────────────────── */}
        <p className={`${styles.sectionLabel} ${styles.opsLabel}`}>Historique des opérations</p>

        {operations.length === 0 ? (
          <div className={styles.emptyOps}>Aucune opération enregistrée.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Débit</th>
                  <th style={{ textAlign: 'right' }}>Entrée</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, idx) => (
                  <tr key={`${op.accountId}-${op.id}-${idx}`}>
                    <td style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.8rem' }}>
                      {formatDate(op.operationDate)}
                    </td>
                    <td>{op.description || '—'}</td>
                    <td className={styles.debitAmount} style={{ textAlign: 'right' }}>
                      {op.type === 'DEBIT' ? `- ${formatCurrency(op.amount)}` : ''}
                    </td>
                    <td className={styles.creditAmount} style={{ textAlign: 'right' }}>
                      {op.type === 'CREDIT' ? `+ ${formatCurrency(op.amount)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pied de page ────────────────────────────────────────────────── */}
        <div className={styles.docFooter}>
          <p className={styles.footerNote}>CSB Banque — Document généré automatiquement le {generatedAt}</p>
          <p className={styles.footerNote}>Ce document est un relevé officiel de votre compte.</p>
        </div>

      </div>
    </div>
  );
}
