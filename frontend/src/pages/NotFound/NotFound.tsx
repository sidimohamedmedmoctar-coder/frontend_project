import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.code}>404</h1>
      <p className={styles.title}>Page non trouvée</p>
      <p className={styles.desc}>
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/dashboard" className={styles.link}>
        ← Retour au dashboard
      </Link>
    </div>
  );
}
