import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './ToastProvider.module.css';

type ToastType = 'success' | 'info' | 'error';

interface Toast {
  readonly id: number;
  readonly message: string;
  readonly type: ToastType;
}

interface ToastContextValue {
  readonly showToast: (toast: {
    readonly message: string;
    readonly type?: ToastType;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_TIMEOUT_MS = 4000;

export interface ToastProviderProps {
  readonly children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps): JSX.Element => {
  const timeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const nextId = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeoutId = timeouts.current.get(id);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeouts.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({
      message,
      type = 'info',
    }: {
      readonly message: string;
      readonly type?: ToastType;
    }) => {
      nextId.current += 1;
      const toast: Toast = {
        id: nextId.current,
        message,
        type,
      };
      setToasts((current) => [...current, toast]);
      const timeout = setTimeout(() => {
        dismissToast(toast.id);
      }, DEFAULT_TIMEOUT_MS);
      timeouts.current.set(toast.id, timeout);
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={clsx(styles.toast, styles[toast.type])}>
            <span>{toast.message}</span>
            <button
              type="button"
              className={styles.dismissButton}
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
