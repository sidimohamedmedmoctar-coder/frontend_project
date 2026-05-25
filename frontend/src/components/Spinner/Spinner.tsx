import styles from './Spinner.module.css';

interface Props {
  size?: number;
}

export default function Spinner({ size = 24 }: Props) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Chargement…"
    />
  );
}
