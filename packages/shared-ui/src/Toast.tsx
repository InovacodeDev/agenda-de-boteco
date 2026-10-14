'use client';

import { CheckCircleIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToastTone = 'error' | 'success';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastInput {
  tone: ToastTone;
  message: string;
  action?: ToastAction;
}

interface ToastItem extends ToastInput {
  id: number;
}

/** Erro fica mais tempo porque costuma pedir uma ação de correção; sucesso só confirma. */
export const TOAST_DURATION_MS: Record<ToastTone, number> = {
  error: 10_000,
  success: 7_000,
};

const MAX_VISIBLE = 3;

interface ToastContextValue {
  show: (toast: ToastInput) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>');
  }
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((toast: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...toast, id }]);
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const value = useMemo(() => ({ show, dismissAll }), [show, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4 sm:items-end sm:pr-6 sm:pt-6"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [entered, setEntered] = useState(false);
  const duration = TOAST_DURATION_MS[toast.tone];
  const isError = toast.tone === 'error';

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [toast.id, duration, onDismiss]);

  const Glyph = isError ? WarningCircleIcon : CheckCircleIcon;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`pointer-events-auto relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        entered ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Glyph
          weight="fill"
          aria-hidden
          className={`mt-px h-5 w-5 shrink-0 ${isError ? 'text-destructive' : 'text-primary'}`}
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <p className="text-[13px] leading-relaxed text-foreground">{toast.message}</p>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onPress();
                onDismiss(toast.id);
              }}
              className="text-[13px] font-semibold text-primary underline-offset-2 hover:underline"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => onDismiss(toast.id)}
          className="-m-1.5 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <XIcon aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <span
        aria-hidden
        style={{ transitionDuration: `${duration}ms` }}
        className={`absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform ease-linear motion-reduce:hidden ${
          isError ? 'bg-destructive/70' : 'bg-primary/70'
        } ${entered ? 'scale-x-0' : 'scale-x-100'}`}
      />
    </div>
  );
}
