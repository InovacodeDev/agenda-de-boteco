'use client';

import { signOut, useAuthStore } from '@agenda/core';

import { useOwnedEstablishment } from '@/hooks/use-owned-establishment';

export function Topbar() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const { data: establishment } = useOwnedEstablishment();

  const initial = email?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-8 py-4">
      <span className="truncate font-[family-name:var(--font-heading)] text-[16px] font-bold text-foreground">
        {establishment?.name ?? 'Seu estabelecimento'}
      </span>

      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-[14px] font-semibold text-foreground"
        >
          {initial}
        </span>
        <span className="hidden text-[13px] text-muted-foreground sm:inline">{email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-full bg-surface-elevated px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
