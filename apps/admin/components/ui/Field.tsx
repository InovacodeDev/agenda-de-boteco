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
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      {children}
      {error ? <span className="text-[12px] text-destructive">{error}</span> : null}
    </label>
  );
}
