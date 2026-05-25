import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import styles from './Sidebar.module.css';

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  transfer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  beneficiaries: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  requests: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  support: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  customers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  approvals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  operations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  audit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  config: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

// ── Navigation items ──────────────────────────────────────────────────────────

const USER_NAV = [
  { to: '/user/dashboard',     label: 'Tableau de bord', icon: 'dashboard'     },
  { to: '/user/transfer',      label: 'Virements',       icon: 'transfer'      },
  { to: '/user/history',       label: 'Historique',      icon: 'history'       },
  { to: '/user/beneficiaries', label: 'Bénéficiaires',   icon: 'beneficiaries' },
  { to: '/user/requests',      label: 'Mes demandes',    icon: 'requests'      },
  { to: '/user/support',       label: 'Support',         icon: 'support'       },
  { to: '/user/profile',       label: 'Mon profil',      icon: 'profile'       },
];

const ADMIN_NAV = [
  { to: '/admin/dashboard',  label: 'Dashboard',    icon: 'dashboard'   },
  { to: '/admin/customers',  label: 'Clients',      icon: 'customers'   },
  { to: '/admin/approvals',  label: 'Approbations', icon: 'approvals'   },
  { to: '/admin/operations', label: 'Opérations',   icon: 'operations'  },
  { to: '/admin/support',    label: 'Support',      icon: 'support'     },
];

const SUPERADMIN_NAV = [
  { to: '/superadmin/dashboard', label: 'Tableau de bord',  icon: 'dashboard'  },
  { to: '/superadmin/users',     label: 'Administrateurs',  icon: 'users'      },
  { to: '/admin/operations',     label: 'Opérations',       icon: 'operations' },
  { to: '/superadmin/audit',     label: "Journal d'audit",  icon: 'audit'      },
  { to: '/superadmin/config',    label: 'Configuration',    icon: 'config'     },
];

// ── Section labels ────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  user:       'ESPACE CLIENT',
  admin:      'ADMINISTRATION',
  superadmin: 'SUPER ADMIN',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { hasRole, user } = useAuth();

  const role = hasRole('SUPER_ADMIN') ? 'superadmin' : hasRole('ADMIN') ? 'admin' : 'user';
  const navItems =
    role === 'superadmin' ? SUPERADMIN_NAV
    : role === 'admin'    ? ADMIN_NAV
    : USER_NAV;

  return (
    <nav className={styles.sidebar}>

      {/* Section label */}
      <div className={styles.sectionLabel}>{SECTION_LABELS[role]}</div>

      {/* Nav links */}
      <ul className={styles.navList}>
        {navItems.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              <span className={styles.linkIcon}>{icons[icon]}</span>
              <span className={styles.linkLabel}>{label}</span>
              <span className={styles.linkIndicator} />
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Bottom — user mini */}
      <div className={styles.bottomUser}>
        <div className={styles.bottomAvatar}>
          {user?.username?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className={styles.bottomInfo}>
          <span className={styles.bottomName}>{user?.username}</span>
          <span className={styles.bottomRole}>
            {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Client'}
          </span>
        </div>
      </div>
    </nav>
  );
}
