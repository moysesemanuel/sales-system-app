"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import styles from "./toast-provider.module.css";

type ToastVariant = "success" | "error" | "warning";

type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function getDefaultTitle(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return "Sucesso";
    case "error":
      return "Erro";
    default:
      return "Aviso";
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, title, variant = "success", durationMs = 4200 }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextToast: ToastItem = {
        id,
        message,
        title: title ?? getDefaultTitle(variant),
        variant,
        durationMs,
      };

      setToasts((current) => [...current, nextToast]);

      window.setTimeout(() => {
        removeToast(id);
      }, durationMs);
    },
    [removeToast],
  );

  const value = useMemo(
    () => ({
      showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <article className={`${styles.toast} ${styles[toast.variant]}`} key={toast.id}>
            <div className={styles.toastHeader}>
              <span className={styles.toastTitle}>{toast.title}</span>
              <button
                className={styles.toastClose}
                onClick={() => removeToast(toast.id)}
                type="button"
                aria-label="Fechar aviso"
              >
                ×
              </button>
            </div>
            <p className={styles.toastMessage}>{toast.message}</p>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast precisa ser usado dentro de ToastProvider.");
  }

  return context;
}
