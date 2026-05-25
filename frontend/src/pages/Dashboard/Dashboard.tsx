import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getStats } from '@/api/dashboard.api';
import { getCustomers } from '@/api/customers.api';
import { getUsers } from '@/api/users.api';
import type { DashboardStats } from '@/types';
import type { Customer } from '@/types';
import Spinner from '@/components/Spinner/Spinner';
import { formatCurrency } from '@/utils/formatters';
import { useAllRequests } from '@/hooks/useRequests';
import styles from './Dashboard.module.css';

// ── Date helper ───────────────────────────────────────────────────────────────

function todayLabel(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, gradient, iconBg }: {
  icon: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  gradient: string;
  iconBg: string;
}) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <div className={styles.kpiIcon} style={{ background: iconBg }}>{icon}</div>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
      <div className={styles.kpiStripe} style={{ background: gradient }} />
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    EN_ATTENTE: { label: 'En attente', cls: styles.badgeWarn },
    APPROUVÉE:  { label: 'Approuvée',  cls: styles.badgeOk   },
    REFUSÉE:    { label: 'Refusée',    cls: styles.badgeErr  },
  };
  const s = map[status] ?? { label: status, cls: styles.badgeWarn };
  return <span className={`${styles.statusBadge} ${s.cls}`}>{s.label}</span>;
}

// ── Quick action button ───────────────────────────────────────────────────────

function ActionBtn({ icon, label, onClick, accent, alert }: {
  icon: string; label: string; onClick: () => void;
  accent: string; alert?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.actionBtn} ${alert ? styles.actionBtnAlert : ''}`}
      style={{ '--accent': accent } as React.CSSProperties}
      onClick={onClick}
    >
      <span className={styles.actionIcon}>{icon}</span>
      <span className={styles.actionLabel}>{label}</span>
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats,       setStats]       = useState<DashboardStats | null>(null);
  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const { requests } = useAllRequests();
  const pending  = requests.filter((r) => r.status === 'EN_ATTENTE');
  const approved = requests.filter((r) => r.status === 'APPROUVÉE');
  const rejected = requests.filter((r) => r.status === 'REFUSÉE');
  const total    = requests.length;

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  useEffect(() => {
    Promise.all([getStats(), getCustomers(), getUsers()])
      .then(([s, c, u]) => {
        setStats(s);
        setCustomers(c);
        const emails = new Set(
          u.filter((usr) => usr.email && (usr.roles.includes('ADMIN') || usr.roles.includes('SUPER_ADMIN')))
            .map((usr) => usr.email!.toLowerCase()),
        );
        setAdminEmails(emails);
      })
      .catch(() => setError('Impossible de charger les statistiques.'))
      .finally(() => setLoading(false));
  }, []);

  const clientCustomers = customers.filter((c) => !adminEmails.has(c.email?.toLowerCase() ?? ''));
  const recentCustomers = [...clientCustomers].reverse().slice(0, 4);

  if (loading) return <div className={styles.centered}><Spinner size={40} /></div>;

  return (
    <div className={styles.container}>

      {/* ── Bannière de bienvenue ── */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <p className={styles.bannerDate}>{todayLabel()}</p>
          <h1 className={styles.bannerTitle}>Bonjour, {user?.username} 👋</h1>
          <p className={styles.bannerSub}>Tableau de bord administrateur — vue d'ensemble</p>
        </div>
        <div className={styles.bannerIllustration}>
          <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="120" height="100">
            <circle cx="60" cy="50" r="45" fill="rgba(255,255,255,0.05)"/>
            <circle cx="60" cy="50" r="30" fill="rgba(255,255,255,0.07)"/>
            <path d="M60 20L85 34V38H35V34L60 20Z" fill="rgba(255,255,255,0.9)"/>
            <rect x="38" y="40" width="8" height="20" rx="2" fill="rgba(255,255,255,0.8)"/>
            <rect x="52" y="40" width="8" height="20" rx="2" fill="rgba(255,255,255,0.8)"/>
            <rect x="66" y="40" width="8" height="20" rx="2" fill="rgba(255,255,255,0.8)"/>
            <rect x="80" y="40" width="5" height="20" rx="2" fill="rgba(255,255,255,0.8)"/>
            <rect x="35" y="62" width="53" height="5" rx="2.5" fill="rgba(255,255,255,0.9)"/>
          </svg>
        </div>
        {/* Formes décoratives */}
        <div className={styles.bannerShape1} />
        <div className={styles.bannerShape2} />
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      {/* ── KPI cards ── */}
      <div className={styles.kpiGrid}>
        <KpiCard
          icon="👥" label="Clients"
          value={clientCustomers.length}
          sub="Clients enregistrés"
          gradient="linear-gradient(90deg,#6366f1,#818cf8)"
          iconBg="#eef2ff"
        />
        <KpiCard
          icon="⏳" label="Demandes en attente"
          value={pending.length}
          sub={pending.length > 0 ? `${pending.length} à traiter` : 'Aucune en attente'}
          gradient="linear-gradient(90deg,#f59e0b,#fbbf24)"
          iconBg="#fffbeb"
        />
        <KpiCard
          icon="🔄" label="Opérations"
          value={stats?.totalOperations ?? '—'}
          sub="Opérations enregistrées"
          gradient="linear-gradient(90deg,#0ea5e9,#38bdf8)"
          iconBg="#e0f2fe"
        />
        <KpiCard
          icon="💰" label="Solde total"
          value={stats ? formatCurrency(stats.totalBalance) : '—'}
          sub="Tous comptes confondus"
          gradient="linear-gradient(90deg,#22c55e,#4ade80)"
          iconBg="#f0fdf4"
        />
      </div>

      {/* ── Grille principale ── */}
      <div className={styles.mainGrid}>

        {/* Demandes récentes */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrap}>
              <span className={styles.cardTitleIcon}>📋</span>
              <span className={styles.cardTitle}>Demandes récentes</span>
            </div>
            <button type="button" className={styles.cardLink} onClick={() => navigate('/admin/approvals')}>
              Voir toutes →
            </button>
          </div>

          {recentRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>Aucune demande pour le moment.</p>
            </div>
          ) : (
            <div className={styles.requestList}>
              {recentRequests.map((req) => (
                <div key={req.id} className={styles.requestRow}>
                  <div className={styles.requestAvatar} data-type={req.type}>
                    {req.type === 'RELEVE' ? '📄' : '💵'}
                  </div>
                  <div className={styles.requestInfo}>
                    <span className={styles.requestUser}>{req.username}</span>
                    <span className={styles.requestType}>
                      {req.type === 'RELEVE' ? 'Relevé de compte' : 'Versement'}
                      {req.amount ? ` · ${formatCurrency(req.amount)}` : ''}
                    </span>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className={styles.sideCol}>

          {/* Actions rapides */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrap}>
                <span className={styles.cardTitleIcon}>⚡</span>
                <span className={styles.cardTitle}>Actions rapides</span>
              </div>
            </div>
            <div className={styles.actionGrid}>
              <ActionBtn icon="🔄" label="Opérations" accent="#6366f1" onClick={() => navigate('/admin/operations')} />
              <ActionBtn icon="✅" label={pending.length > 0 ? `Approbations (${pending.length})` : 'Approbations'} accent="#f59e0b" alert={pending.length > 0} onClick={() => navigate('/admin/approvals')} />
              <ActionBtn icon="👥" label="Clients" accent="#0ea5e9" onClick={() => navigate('/admin/customers')} />
              <ActionBtn icon="🎧" label="Support" accent="#22c55e" onClick={() => navigate('/admin/support')} />
            </div>
          </div>

          {/* Clients récents */}
          {recentCustomers.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrap}>
                  <span className={styles.cardTitleIcon}>🆕</span>
                  <span className={styles.cardTitle}>Clients récents</span>
                </div>
                <button type="button" className={styles.cardLink} onClick={() => navigate('/admin/customers')}>
                  Voir tous →
                </button>
              </div>
              <div className={styles.customerList}>
                {recentCustomers.map((c, i) => {
                  const gradients = [
                    'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    'linear-gradient(135deg,#0ea5e9,#38bdf8)',
                    'linear-gradient(135deg,#22c55e,#4ade80)',
                    'linear-gradient(135deg,#f59e0b,#fbbf24)',
                  ];
                  return (
                    <div key={c.id} className={styles.customerRow}>
                      <div className={styles.customerAvatar} style={{ background: gradients[i % 4] }}>
                        {c.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className={styles.customerInfo}>
                        <span className={styles.customerName}>{c.name}</span>
                        <span className={styles.customerEmail}>{c.email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Répartition des demandes ── */}
      {total > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrap}>
              <span className={styles.cardTitleIcon}>📊</span>
              <span className={styles.cardTitle}>Répartition des demandes</span>
            </div>
            <span className={styles.cardSub}>{total} demande{total > 1 ? 's' : ''} au total</span>
          </div>
          <div className={styles.statsRows}>
            {[
              { label: 'En attente', count: pending.length,  color: '#f59e0b' },
              { label: 'Approuvées', count: approved.length, color: '#22c55e' },
              { label: 'Refusées',   count: rejected.length, color: '#ef4444' },
            ].map(({ label, count, color }) => (
              <div key={label} className={styles.statRow}>
                <div className={styles.statLabel}>
                  <span className={styles.statDot} style={{ background: color }} />
                  {label}
                </div>
                <div className={styles.statBarWrap}>
                  <div className={styles.statBar} style={{ width: `${total ? (count / total) * 100 : 0}%`, background: color }} />
                </div>
                <div className={styles.statCount}>
                  <strong>{count}</strong>
                  <span>{total ? Math.round((count / total) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
