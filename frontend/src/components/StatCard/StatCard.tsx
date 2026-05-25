import React from 'react';
import styles from './StatCard.module.css';

interface Props {
  icon:   string;
  label:  string;
  value:  string | number;
  color?: string;
}

/**
 * React.memo (TP5) — mémoïse le composant : ne se re-rend que si ses props
 * changent réellement, ce qui évite des renders inutiles dans le Dashboard.
 */
const StatCard = React.memo(function StatCard({ icon, label, value, color = '#3b82f6' }: Props) {
  return (
    <div className={styles.card} style={{ borderLeftColor: color }}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
});

export default StatCard;
