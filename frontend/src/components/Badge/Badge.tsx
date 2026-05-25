import type { ReactNode } from 'react';
import styles from './Badge.module.css';

interface Props {
  variant: 'success' | 'danger' | 'warning' | 'info';
  children: ReactNode;
}

export default function Badge({ variant, children }: Props) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
