import { useEffect, useState } from 'react';
import { subscribeLoading } from '@/utils/loadingCounter';
import styles from './LoadingBar.module.css';

export default function LoadingBar() {
  const [active, setActive] = useState(false);

  useEffect(() => subscribeLoading(setActive), []);

  if (!active) return null;

  return <div className={styles.bar} aria-hidden="true" />;
}
