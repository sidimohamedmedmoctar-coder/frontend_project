import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getAccountHistory, debit, credit, transfer } from '@/api/accounts.api';
import type { AccountHistory } from '@/types';
import Badge   from '@/components/Badge/Badge';
import Spinner from '@/components/Spinner/Spinner';
import Tabs    from '@/components/Tabs/Tabs';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import styles from './AccountDetails.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'DEBIT' | 'CREDIT' | 'TRANSFER';

interface OpValues    { amount: string; description: string }
interface OpErrors    { amount: string; description: string }
interface TransValues extends OpValues { accountDestination: string }
interface TransErrors extends OpErrors { accountDestination: string }

const EMPTY_OP:        OpValues    = { amount: '', description: '' };
const EMPTY_ERR:       OpErrors    = { amount: '', description: '' };
const EMPTY_TRANS:     TransValues = { amount: '', description: '', accountDestination: '' };
const EMPTY_TRANS_ERR: TransErrors = { amount: '', description: '', accountDestination: '' };

const OPERATION_TABS = [
  { key: 'DEBIT',    label: 'Débit' },
  { key: 'CREDIT',   label: 'Entrée' },
  { key: 'TRANSFER', label: 'Virement' },
];

const PAGE_SIZE = 5;

// ── Validation ────────────────────────────────────────────────────────────────

function validateOp(values: OpValues): OpErrors {
  const errors: OpErrors = { amount: '', description: '' };
  const n = parseFloat(values.amount);
  if (!values.amount || isNaN(n) || n <= 0) errors.amount      = 'Montant requis > 0';
  if (!values.description.trim())           errors.description = 'Description requise';
  return errors;
}

// ── Shared op-form fields ─────────────────────────────────────────────────────

interface OpFieldsProps {
  values:         OpValues;
  fieldErrors:    OpErrors;
  onAmountChange: (v: string) => void;
  onDescChange:   (v: string) => void;
  isSubmitting:   boolean;
  submitLabel:    string;
  submitClass:    string;
}

function OpFields({
  values, fieldErrors, onAmountChange, onDescChange,
  isSubmitting, submitLabel, submitClass,
}: OpFieldsProps) {
  return (
    <>
      <div className={styles.field}>
        <label className={styles.label}>Montant (MAD)</label>
        <input
          className={`${styles.input} ${fieldErrors.amount ? styles.inputError : ''}`}
          type="number"
          step="0.01"
          min="0.01"
          value={values.amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
        />
        {fieldErrors.amount && <span className={styles.fieldError}>{fieldErrors.amount}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <input
          className={`${styles.input} ${fieldErrors.description ? styles.inputError : ''}`}
          type="text"
          value={values.description}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="Motif de l'opération"
        />
        {fieldErrors.description && <span className={styles.fieldError}>{fieldErrors.description}</span>}
      </div>
      <button
        type="submit"
        className={`${styles.submitBtn} ${submitClass}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? <Spinner size={17} /> : submitLabel}
      </button>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccountDetails() {
  const { id } = useParams<{ id: string }>();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [history,   setHistory]   = useState<AccountHistory | null>(null);
  const [page,      setPage]      = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [notFound,  setNotFound]  = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('DEBIT');

  // ── Debit state ───────────────────────────────────────────────────────────
  const [debitValues,      setDebitValues]      = useState<OpValues>(EMPTY_OP);
  const [debitErrors,      setDebitErrors]      = useState<OpErrors>(EMPTY_ERR);
  const [debitSubmitting,  setDebitSubmitting]  = useState(false);

  // ── Credit state ──────────────────────────────────────────────────────────
  const [creditValues,     setCreditValues]     = useState<OpValues>(EMPTY_OP);
  const [creditErrors,     setCreditErrors]     = useState<OpErrors>(EMPTY_ERR);
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  // ── Transfer state ────────────────────────────────────────────────────────
  const [transValues,     setTransValues]     = useState<TransValues>(EMPTY_TRANS);
  const [transErrors,     setTransErrors]     = useState<TransErrors>(EMPTY_TRANS_ERR);
  const [transSubmitting, setTransSubmitting] = useState(false);

  // ── Fetch history ─────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getAccountHistory(id, page, PAGE_SIZE);
      setHistory(data);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) setNotFound(true);
      else setError("Impossible de charger l'historique du compte.");
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Submit handlers ───────────────────────────────────────────────────────

  async function handleDebit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateOp(debitValues);
    setDebitErrors(errs);
    if (errs.amount || errs.description) return;
    setDebitSubmitting(true);
    try {
      await debit({ accountId: id!, amount: parseFloat(debitValues.amount), description: debitValues.description });
      setDebitValues(EMPTY_OP);
      pushToast({ type: 'success', message: 'Débit effectué avec succès' });
      setPage(0);
      await fetchHistory();
    } catch (e: unknown) {
      pushToast({ type: 'error', message: `Erreur : ${e instanceof Error ? e.message : 'inconnue'}` });
    } finally {
      setDebitSubmitting(false);
    }
  }

  async function handleCredit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateOp(creditValues);
    setCreditErrors(errs);
    if (errs.amount || errs.description) return;
    setCreditSubmitting(true);
    try {
      await credit({ accountId: id!, amount: parseFloat(creditValues.amount), description: creditValues.description });
      setCreditValues(EMPTY_OP);
      pushToast({ type: 'success', message: 'Versement effectué avec succès' });
      setPage(0);
      await fetchHistory();
    } catch (e: unknown) {
      pushToast({ type: 'error', message: `Erreur : ${e instanceof Error ? e.message : 'inconnue'}` });
    } finally {
      setCreditSubmitting(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    const baseErrs = validateOp(transValues);
    const errs: TransErrors = {
      ...baseErrs,
      accountDestination: transValues.accountDestination.trim() ? '' : 'Compte destinataire requis',
    };
    setTransErrors(errs);
    if (errs.amount || errs.description || errs.accountDestination) return;
    setTransSubmitting(true);
    try {
      await transfer({
        accountSource:      id!,
        accountDestination: transValues.accountDestination,
        amount:             parseFloat(transValues.amount),
        description:        transValues.description,
      });
      setTransValues(EMPTY_TRANS);
      pushToast({ type: 'success', message: 'Virement effectué avec succès' });
      setPage(0);
      await fetchHistory();
    } catch (e: unknown) {
      pushToast({ type: 'error', message: `Erreur : ${e instanceof Error ? e.message : 'inconnue'}` });
    } finally {
      setTransSubmitting(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundIcon}>🔍</p>
        <h2 className={styles.notFoundTitle}>Compte introuvable</h2>
        <p className={styles.notFoundDesc}>
          L'identifiant <code>{id}</code> ne correspond à aucun compte.
        </p>
        <Link to="/accounts" className={styles.notFoundLink}>← Retour à la recherche</Link>
      </div>
    );
  }

  if (loading && !history) return <div className={styles.centered}><Spinner size={40} /></div>;
  if (error)               return <p className={styles.errorMsg}>{error}</p>;

  const totalPages = history?.totalPages ?? 1;

  function statusVariant(status: string) {
    if (status === 'ACTIVATED') return 'success';
    if (status === 'SUSPENDED') return 'danger';
    return 'warning';
  }

  return (
    <div className={styles.container}>

      {/* ── Bouton retour ───────────────────────────────────────────────── */}
      <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
        ← Retour
      </button>

      {/* ── Account info card ────────────────────────────────────────────── */}
      <div className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>ID du compte</span>
          <span className={styles.infoValue}>{history?.accountId ?? id}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Solde</span>
          <span className={styles.balance}>{history ? formatCurrency(history.balance) : '—'}</span>
        </div>
        {history && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Statut</span>
            <Badge variant={statusVariant('ACTIVATED')}>ACTIVÉ</Badge>
          </div>
        )}
      </div>

      {/* ── Historique ───────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Historique des opérations</h2>

        {loading && <div className={styles.centered}><Spinner size={28} /></div>}

        {!loading && history && history.accountOperationDTOS.length === 0 && (
          <p className={styles.emptyMsg}>Aucune opération enregistrée.</p>
        )}

        {!loading && history && history.accountOperationDTOS.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className={styles.right}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {history.accountOperationDTOS.map((op) => (
                  <tr key={op.id}>
                    <td className={styles.dateCell}>{formatDate(op.operationDate)}</td>
                    <td>
                      <Badge variant={op.type === 'CREDIT' ? 'success' : 'danger'}>{op.type}</Badge>
                    </td>
                    <td>{op.description}</td>
                    <td className={`${styles.right} ${op.type === 'CREDIT' ? styles.amountPos : styles.amountNeg}`}>
                      {op.type === 'CREDIT' ? '+' : '-'}{formatCurrency(op.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                type="button"
              >‹</button>
              <span className={styles.pageInfo}>Page {page + 1} / {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                type="button"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Nouvelle opération ───────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Nouvelle opération</h2>
        <div className={styles.opCard}>
          <Tabs
            tabs={OPERATION_TABS}
            active={activeTab}
            onChange={(k) => setActiveTab(k as TabKey)}
          />

          {activeTab === 'DEBIT' && (
            <form onSubmit={handleDebit} noValidate>
              <OpFields
                values={debitValues}
                fieldErrors={debitErrors}
                onAmountChange={(v) => setDebitValues((p) => ({ ...p, amount: v }))}
                onDescChange={(v)   => setDebitValues((p) => ({ ...p, description: v }))}
                isSubmitting={debitSubmitting}
                submitLabel="Débiter"
                submitClass={styles.btnDanger}
              />
            </form>
          )}

          {activeTab === 'CREDIT' && (
            <form onSubmit={handleCredit} noValidate>
              <OpFields
                values={creditValues}
                fieldErrors={creditErrors}
                onAmountChange={(v) => setCreditValues((p) => ({ ...p, amount: v }))}
                onDescChange={(v)   => setCreditValues((p) => ({ ...p, description: v }))}
                isSubmitting={creditSubmitting}
                submitLabel="Approvisionner"
                submitClass={styles.btnSuccess}
              />
            </form>
          )}

          {activeTab === 'TRANSFER' && (
            <form onSubmit={handleTransfer} noValidate>
              <div className={styles.field}>
                <label className={styles.label}>Compte destinataire</label>
                <input
                  className={`${styles.input} ${transErrors.accountDestination ? styles.inputError : ''}`}
                  type="text"
                  value={transValues.accountDestination}
                  onChange={(e) => setTransValues((p) => ({ ...p, accountDestination: e.target.value }))}
                  placeholder="ID du compte cible"
                />
                {transErrors.accountDestination && (
                  <span className={styles.fieldError}>{transErrors.accountDestination}</span>
                )}
              </div>
              <OpFields
                values={transValues}
                fieldErrors={transErrors}
                onAmountChange={(v) => setTransValues((p) => ({ ...p, amount: v }))}
                onDescChange={(v)   => setTransValues((p) => ({ ...p, description: v }))}
                isSubmitting={transSubmitting}
                submitLabel="Virer"
                submitClass={styles.btnPrimary}
              />
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
