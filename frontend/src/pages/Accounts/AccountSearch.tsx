import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AccountSearch.module.css';

export default function AccountSearch() {
  const [accountId, setAccountId] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = accountId.trim();
    if (trimmed) navigate(`/admin/accounts/${trimmed}`);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Comptes bancaires</h1>
      <div className={styles.card}>
        <p className={styles.hint}>Saisissez l'identifiant du compte</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Ex : a3f9c2d1-…"
            className={styles.input}
            autoFocus
          />
          <button type="submit" className={styles.btn} disabled={!accountId.trim()}>
            Rechercher
          </button>
        </form>
      </div>
    </div>
  );
}
