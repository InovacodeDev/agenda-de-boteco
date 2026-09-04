'use client';

import type { ReactNode } from 'react';

type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

const MAX_WIDTH_CLASSES: Record<ModalMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  maxWidth = '4xl',
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  // Footer fixo (ex.: botões). Fica fora da área rolável.
  footer?: ReactNode;
  maxWidth?: ModalMaxWidth;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div
        className={`flex max-h-[90vh] w-full ${MAX_WIDTH_CLASSES[maxWidth]} flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-[20px] font-bold leading-tight text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-border p-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
