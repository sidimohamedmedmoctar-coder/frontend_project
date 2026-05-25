import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initial = user?.username?.[0]?.toUpperCase() ?? 'U';

  const roleLabel =
    user?.roles?.includes('SUPER_ADMIN') ? 'Super Admin'
    : user?.roles?.includes('ADMIN')     ? 'Administrateur'
    : 'Client';

  return (
    <header className={styles.navbar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <svg viewBox="0 0 40 40" fill="none" width="20" height="20">
            <path d="M20 4L34 12V14H6V12L20 4Z" fill="white"/>
            <rect x="8"  y="16" width="4" height="12" rx="1" fill="white"/>
            <rect x="15" y="16" width="4" height="12" rx="1" fill="white"/>
            <rect x="22" y="16" width="4" height="12" rx="1" fill="white"/>
            <rect x="29" y="16" width="4" height="12" rx="1" fill="white"/>
            <rect x="6"  y="30" width="28" height="3"  rx="1.5" fill="white"/>
          </svg>
        </div>
        <span className={styles.brandName}>CSB Banque</span>
      </div>

      {/* Right — user + logout */}
      <div className={styles.right}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{initial}</div>
          <div className={styles.userText}>
            <span className={styles.username}>{user?.username}</span>
            <span className={styles.roleTag}>{roleLabel}</span>
          </div>
        </div>

        <div className={styles.divider} />

        <button type="button" className={styles.logoutBtn} onClick={handleLogout} title="Déconnexion">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
