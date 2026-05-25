import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';
import { formatCurrency } from '@/utils/formatters';
import { getCustomers }        from '@/api/customers.api';
import { getCustomerAccounts } from '@/api/accounts.api';
import { getMe }               from '@/api/users.api';
import { useRequests }         from '@/hooks/useRequests';
import Spinner from '@/components/Spinner/Spinner';
import styles from './UserDashboard.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountSummary {
  id:      string;
  rib:     string;
  type:    'COURANT' | 'ÉPARGNE';
  balance: number;
  status:  'ACTIVÉ' | 'SUSPENDU';
}

function mapType(type: string): AccountSummary['type'] {
  return type === 'CurrentAccount' ? 'COURANT' : 'ÉPARGNE';
}

function mapStatus(status: string): AccountSummary['status'] {
  if (status === 'ACTIVATED' || status === 'CREATED') return 'ACTIVÉ';
  return 'SUSPENDU';
}

function formatRib(rib: string): string {
  return rib.replace(/(.{4})/g, '$1 ').trim();
}

// ── Dismissed notifications (localStorage) ───────────────────────────────────

function loadDismissed(username: string): Set<number> {
  try {
    const raw = localStorage.getItem(`dismissed_notifs_${username}`);
    return new Set(raw ? JSON.parse(raw) as number[] : []);
  } catch { return new Set(); }
}

function saveDismissed(username: string, ids: Set<number>) {
  localStorage.setItem(`dismissed_notifs_${username}`, JSON.stringify([...ids]));
}

// ── Copy RIB icon ─────────────────────────────────────────────────────────────

const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// ── Account card ──────────────────────────────────────────────────────────────

const AccountCard = React.memo(function AccountCard({
  account, onViewHistory,
}: {
  account: AccountSummary;
  onViewHistory: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(account.rib).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={`${styles.accountCard} ${styles.accountCardCurrent}`}>
      {/* Header */}
      <div className={styles.accountCardHeader}>
        <div className={styles.accountTypeTag}>
          <span>💳</span>
          <span>Compte Courant</span>
        </div>
        <span className={`${styles.accountStatus} ${account.status === 'ACTIVÉ' ? styles.statusActive : styles.statusSuspended}`}>
          {account.status}
        </span>
      </div>

      {/* Balance */}
      <div className={styles.accountBalance}>
        {formatCurrency(account.balance)}
      </div>

      {/* RIB */}
      <div className={styles.accountRib}>
        <span className={styles.ribLabel}>RIB</span>
        <span className={styles.ribValue}>{formatRib(account.rib)}</span>
        <button type="button" className={styles.copyBtn} onClick={handleCopy} title="Copier le RIB">
          {copied ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <IconCopy />
          )}
        </button>
      </div>

      {/* Action */}
      <button type="button" className={styles.viewBtn} onClick={onViewHistory}>
        Voir les transactions
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>
  );
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const username = user?.username ?? '';

  const [accounts,   setAccounts]   = useState<AccountSummary[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const { requests } = useRequests(username);
  const [dismissed, setDismissed] = useState<Set<number>>(() => loadDismissed(username));

  const notifications = requests.filter(
    (r) => (r.status === 'APPROUVÉE' || r.status === 'REFUSÉE') && !dismissed.has(r.id),
  );

  const handleDismiss = useCallback((id: number) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(username, next);
      return next;
    });
  }, [username]);

  useEffect(() => {
    let cancelled = false;
    if (!username) return;

    async function loadFromBackend() {
      setLoading(true);
      try {
        const me = await getMe();
        if (!me.email) {
          if (!cancelled) setHasProfile(false);
          return;
        }
        const customers = await getCustomers();
        const matched = customers.filter((c) => c.email?.toLowerCase() === me.email!.toLowerCase());
        const customer = matched.length > 0
          ? matched.reduce((best, c) => ((c.id ?? 0) > (best.id ?? 0) ? c : best))
          : undefined;

        if (!customer?.id) {
          if (!cancelled) setHasProfile(false);
          return;
        }
        if (!cancelled) setHasProfile(true);

        const backendAccounts = await getCustomerAccounts(customer.id);
        if (!cancelled) {
          setAccounts(
            backendAccounts.map((a) => ({
              id:      a.id,
              rib:     a.rib ?? '',
              type:    mapType(a.type),
              balance: a.balance,
              status:  mapStatus(a.status),
            })),
          );
        }
      } catch {
        if (!cancelled) setHasProfile(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFromBackend();
    return () => { cancelled = true; };
  }, [username]);

  const goToHistory = useCallback(() => navigate('/user/history'), [navigate]);
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  // ── Date helper ──────────────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) return <div className={styles.centered}><Spinner size={40} /></div>;

  return (
    <div className={styles.container}>

      {/* ── Bannière ── */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <p className={styles.bannerDate}>{todayLabel}</p>
          <h1 className={styles.bannerTitle}>Bonjour, {username} 👋</h1>
          <p className={styles.bannerSub}>Voici un aperçu de vos comptes bancaires</p>
        </div>
        <div className={styles.bannerIllustration}>
          <svg viewBox="0 0 100 80" fill="none" width="100" height="80">
            <circle cx="50" cy="40" r="36" fill="rgba(255,255,255,0.06)"/>
            <circle cx="50" cy="40" r="22" fill="rgba(255,255,255,0.08)"/>
            <rect x="18" y="30" width="64" height="38" rx="6" fill="rgba(255,255,255,0.15)"/>
            <rect x="18" y="30" width="64" height="14" rx="6" fill="rgba(255,255,255,0.25)"/>
            <rect x="26" y="53" width="16" height="5" rx="2.5" fill="rgba(255,255,255,0.5)"/>
            <rect x="26" y="61" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.3)"/>
            <circle cx="70" cy="57" r="6" fill="rgba(255,255,255,0.4)"/>
            <circle cx="62" cy="57" r="6" fill="rgba(255,255,255,0.25)"/>
          </svg>
        </div>
        <div className={styles.bannerShape1} />
        <div className={styles.bannerShape2} />
      </div>

      {/* ── Notifications ── */}
      {notifications.length > 0 && (
        <div className={styles.notifSection}>
          <p className={styles.notifTitle}>🔔 Notifications</p>
          <div className={styles.notifList}>
            {notifications.map((req) => (
              <div
                key={req.id}
                className={`${styles.notifCard} ${req.status === 'APPROUVÉE' ? styles.notifOk : styles.notifErr}`}
              >
                <span className={styles.notifIcon}>
                  {req.status === 'APPROUVÉE' ? '✅' : '❌'}
                </span>
                <div className={styles.notifText}>
                  Votre demande de{' '}
                  <strong>{req.type === 'RELEVE' ? 'relevé de compte' : 'versement'}</strong>
                  {req.description ? ` « ${req.description} »` : ''}{' '}
                  a été <strong>{req.status === 'APPROUVÉE' ? 'approuvée' : 'refusée'}</strong>.
                  {req.type === 'VERSEMENT' && req.amount && req.status === 'APPROUVÉE'
                    ? ` Un montant de ${formatCurrency(req.amount)} a été versé.`
                    : ''}
                  {req.type === 'RELEVE' && req.status === 'APPROUVÉE' && (
                    <button
                      type="button"
                      className={styles.notifAction}
                      onClick={() => navigate('/user/statement')}
                    >
                      Voir le relevé →
                    </button>
                  )}
                </div>
                <button type="button" className={styles.notifClose} onClick={() => handleDismiss(req.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pas de profil bancaire ── */}
      {hasProfile === false ? (
        <div className={styles.noProfile}>
          <div className={styles.noProfileIcon}>🔒</div>
          <h3 className={styles.noProfileTitle}>Aucun profil bancaire associé</h3>
          <p className={styles.noProfileText}>
            Votre compte n'est pas encore lié à un profil bancaire.
            Contactez votre administrateur pour activer votre accès.
          </p>
        </div>
      ) : (
        <>
          {/* ── Solde total ── */}
          <div className={styles.totalCard}>
            <div className={styles.totalLeft}>
              <span className={styles.totalLabel}>Solde total</span>
              <span className={styles.totalAmount}>
                {accounts.length > 0 ? formatCurrency(total) : '—'}
              </span>
              <span className={styles.totalSub}>
                {accounts.length} compte{accounts.length > 1 ? 's' : ''} actif{accounts.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className={styles.totalIcon}>
              <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
                <circle cx="24" cy="24" r="22" fill="rgba(255,255,255,0.12)"/>
                <path d="M24 10L36 17V19H12V17L24 10Z" fill="rgba(255,255,255,0.9)"/>
                <rect x="14" y="21" width="4" height="10" rx="1" fill="rgba(255,255,255,0.8)"/>
                <rect x="21" y="21" width="4" height="10" rx="1" fill="rgba(255,255,255,0.8)"/>
                <rect x="28" y="21" width="4" height="10" rx="1" fill="rgba(255,255,255,0.8)"/>
                <rect x="12" y="33" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
              </svg>
            </div>
          </div>

          {/* ── Comptes ── */}
          {accounts.length === 0 ? (
            <div className={styles.noAccount}>
              <span className={styles.noAccountIcon}>🏦</span>
              <p className={styles.noAccountText}>Vous n'avez pas encore de compte bancaire.</p>
              <p className={styles.noAccountSub}>Votre conseiller ouvrira votre compte prochainement.</p>
            </div>
          ) : (
            <div className={styles.accountsGrid}>
              {accounts.map((acc) => (
                <AccountCard key={acc.id} account={acc} onViewHistory={goToHistory} />
              ))}
            </div>
          )}

          {/* ── Actions rapides ── */}
          <div className={styles.actionsSection}>
            <p className={styles.actionsTitle}>Actions rapides</p>
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={accounts.length === 0}
                onClick={() => navigate('/user/transfer')}
              >
                <span>💸</span> Nouveau virement
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                onClick={() => navigate('/user/requests')}
              >
                <span>📝</span> Faire une demande
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                disabled={accounts.length === 0}
                onClick={() => navigate('/user/history')}
              >
                <span>📊</span> Historique
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnOutline}`}
                disabled={accounts.length === 0}
                onClick={() => navigate('/user/beneficiaries')}
              >
                <span>👥</span> Bénéficiaires
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
