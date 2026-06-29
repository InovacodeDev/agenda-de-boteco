'use client';

import type { ReactNode } from 'react';

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-[18px] text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg px-2 py-1 text-[18px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
