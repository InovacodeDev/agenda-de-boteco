'use client';

import { signOut, useAuthStore } from '@agenda/core';

import { useOwnedEstablishment } from '@/hooks/use-owned-establishment';

export function Topbar() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const { data: establishment } = useOwnedEstablishment();

  const initial = email?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-8 py-5">
      <span className="truncate font-[family-name:var(--font-heading)] text-[17px] font-bold text-foreground">
        {establishment?.name ?? 'Seu estabelecimento'}
      </span>

      {/* O avatar é o botão de sair: no design não há item "Sair" visível, mas
          a ação precisa continuar alcançável em algum lugar. */}
      <button
        type="button"
        onClick={() => void signOut()}
        title="Sair da conta"
        className="flex items-center gap-3 rounded-full transition-opacity hover:opacity-80"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-[14px] font-semibold text-foreground"
        >
          {initial}
        </span>
        <span className="hidden text-[15px] text-foreground sm:inline">{email}</span>
        <span className="sr-only">Sair da conta</span>
      </button>
    </header>
  );
}
