import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCustomer } from '@/api/customers.api';
import { getCustomerAccounts, createCurrentAccount } from '@/api/accounts.api';
import { loadSystemConfig } from '@/utils/systemConfig';
import type { BankAccount, Customer } from '@/types';
import Badge from '@/components/Badge/Badge';
import Spinner from '@/components/Spinner/Spinner';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/utils/formatters';
import styles from './CustomerAccounts.module.css';

function accountTypeLabel(type: string) {
  return type === 'CurrentAccount' ? 'Courant' : 'Courant';
}

function accountTypeVariant(_type: string): 'info' {
  return 'info';
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' {
  if (status === 'ACTIVATED') return 'success';
  if (status === 'SUSPENDED') return 'danger';
  return 'warning';
}

function statusLabel(status: string) {
  if (status === 'ACTIVATED') return 'Actif';
  if (status === 'SUSPENDED') return 'Suspendu';
  return 'Créé';
}

export default function CustomerAccounts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [customer,  setCustomer]  = useState<Customer | null>(null);
  const [accounts,  setAccounts]  = useState<BankAccount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [creating,  setCreating]  = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const numId = id ? Number(id) : null;

  const load = useCallback(async () => {
    if (!numId) return;
    setLoading(true);
    setError('');
    try {
      const [cust, accs] = await Promise.all([
        getCustomer(numId),
        getCustomerAccounts(numId),
      ]);
      setCustomer(cust);
      setAccounts(accs);
    } catch {
      setError('Impossible de charger les données du client.');
    } finally {
      setLoading(false);
    }
  }, [numId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateAccount() {
    if (!numId) return;
    const cfg = loadSystemConfig();
    setCreating(true);
    try {
      await createCurrentAccount({ customerId: numId, initialBalance: 0, overDraft: cfg.overdraftLimit });
      pushToast({ type: 'success', message: `Compte courant créé — découvert : ${formatCurrency(cfg.overdraftLimit)}.` });
      await load();
    } catch {
      pushToast({ type: 'error', message: 'Erreur lors de la création du compte.' });
    } finally {
      setCreating(false);
      setConfirmOpen(false);
    }
  }

  if (loading) {
    return <div className={styles.centered}><Spinner size={40} /></div>;
  }

  if (error) {
    return <p className={styles.errorMsg}>{error}</p>;
  }

  return (
    <div className={styles.container}>
      {/* Back button */}
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate('/admin/customers')}
      >
        ← Retour aux clients
      </button>

      {/* Customer info card */}
      {customer && (
        <div className={styles.customerCard}>
          <div className={styles.customerAvatar}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className={styles.customerName}>{customer.name}</h1>
            <p className={styles.customerEmail}>{customer.email}</p>
          </div>
          <div className={styles.accountCount}>
            <span className={styles.countNum}>{accounts.length}</span>
            <span className={styles.countLabel}>
              {accounts.length === 1 ? 'compte' : 'comptes'}
            </span>
          </div>
        </div>
      )}

      {/* Header + bouton créer */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Comptes bancaires</h2>
        <button
          type="button"
          className={styles.btnCreate}
          onClick={() => setConfirmOpen(true)}
          disabled={creating}
        >
          {creating ? '⏳ Création…' : '+ Ouvrir un compte courant'}
        </button>
      </div>

      {accounts.length === 0 && (
        <p className={styles.emptyMsg}>Ce client n'a aucun compte associé.</p>
      )}

      <div className={styles.grid}>
        {accounts.map((account) => (
          <div key={account.id} className={styles.accountCard}>
            <div className={styles.cardTop}>
              <Badge variant={accountTypeVariant(account.type)}>
                {accountTypeLabel(account.type)}
              </Badge>
              <Badge variant={statusVariant(account.status)}>
                {statusLabel(account.status)}
              </Badge>
            </div>

            <div className={styles.accountId} title={account.id}>
              {account.id.length > 24 ? `${account.id.slice(0, 24)}…` : account.id}
            </div>

            <div className={styles.balance}>{formatCurrency(account.balance)}</div>

            {account.overDraft !== undefined && (
              <p className={styles.extra}>
                Découvert autorisé : {formatCurrency(account.overDraft)}
              </p>
            )}

            <button
              type="button"
              className={styles.detailBtn}
              onClick={() => navigate(`/admin/accounts/${account.id}`)}
            >
              Voir les opérations →
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Ouvrir un compte courant"
        message={`Créer un compte courant (solde 0 MAD, découvert ${formatCurrency(loadSystemConfig().overdraftLimit)}) pour ${customer?.name ?? 'ce client'} ?`}
        onConfirm={handleCreateAccount}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
