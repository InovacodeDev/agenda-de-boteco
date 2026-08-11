'use client';

import type { ReactNode } from 'react';

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-[family-name:var(--font-body)] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
      {error ? <span className="text-[12px] text-destructive">{error}</span> : null}
    </label>
  );
}
