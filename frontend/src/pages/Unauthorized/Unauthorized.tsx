import { Link } from 'react-router-dom';
import styles from './Unauthorized.module.css';

export default function Unauthorized() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>🚫 Accès non autorisé</h1>
      <p className={styles.desc}>
        Vous n'avez pas les droits nécessaires pour accéder à cette page.
      </p>
      <Link to="/dashboard" className={styles.link}>
        ← Retour au dashboard
      </Link>
    </div>
  );
}
