import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from '@/components/Toast/Toast.module.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  pushToast: (opts: { type: ToastType; message: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _idSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const pushToast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = `toast-${++_idSeq}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, 3000);
    timers.current.set(id, t);
  }, []);

  function dismiss(id: string) {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      {toasts.length > 0 && (
        <div className={styles.stack} aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.toast} ${styles[toast.type]}`}
              onClick={() => dismiss(toast.id)}
              role="alert"
            >
              <span>{toast.message}</span>
              <button className={styles.closeBtn} type="button" aria-label="Fermer">✕</button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
