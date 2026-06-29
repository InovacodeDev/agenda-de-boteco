import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Ícone exibido acima da mensagem (ex.: <HeartIcon size={32} />). */
  icon?: ReactNode;
  /** Mensagem principal. */
  message: string;
  /** Rótulo do CTA opcional. */
  actionLabel?: string;
  /** Handler do CTA — exige render no client quando presente. */
  onAction?: () => void;
}

/** Estado vazio centralizado, espelha o EmptyState do mobile em DOM/Tailwind. */
export function EmptyState({ icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-card px-6 py-16 text-center">
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
        {message}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full bg-foreground px-5 py-2 text-[13px] font-[family-name:var(--font-body)] font-medium text-primary-foreground transition-opacity hover:opacity-80"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
