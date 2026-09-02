'use client';

import { signOut, useAuthStore } from '@agenda/core';

import { useOwnedEstablishment } from '@/hooks/use-owned-establishment';

export function Topbar() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const { data: establishment } = useOwnedEstablishment();

  const initial = email?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <header className="border-border bg-background flex items-center justify-between gap-4 border-b px-8 py-5">
      <span className="font-heading text-foreground truncate text-[18px] font-600">
        {establishment?.name ?? 'Seu estabelecimento'}
      </span>

      {/* O avatar é o botão de sair: no design não há item "Sair" visível, mas
          a ação precisa continuar alcançável em algum lugar. */}
      <button
        type="button"
        onClick={() => void signOut()}
        title="Sair da conta"
        className="relative flex items-center gap-3 rounded-full transition-opacity hover:opacity-80"
      >
        <span
          aria-hidden
          className="bg-surface-elevated text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
        >
          {initial}
        </span>
        <span className="text-foreground hidden text-[15px] sm:inline">{email}</span>
        <span className="sr-only">Sair da conta</span>
      </button>
    </header>
  );
}
