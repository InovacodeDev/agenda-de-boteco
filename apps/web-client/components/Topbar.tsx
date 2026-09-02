'use client';

import { signOut, useAuthStore } from '@agenda/core';
import { useState } from 'react';

import { LogoutConfirmModal } from '@/components/ui/LogoutConfirmModal';
import { useOwnedEstablishment } from '@/hooks/use-owned-establishment';

export function Topbar() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const { data: establishment } = useOwnedEstablishment();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initial = email?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <header className="border-border bg-background flex items-center justify-between gap-4 border-b px-8 py-5">
      <span className="font-heading text-foreground truncate text-[18px] font-600">
        {establishment?.name ?? 'Seu estabelecimento'}
      </span>

      <div
        className="relative"
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && event.currentTarget.contains(next)) return;
          setOpen(false);
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Menu da conta"
          className="flex items-center gap-3 rounded-full transition-opacity hover:opacity-80"
        >
          <span
            aria-hidden
            className="bg-surface-elevated text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
          >
            {initial}
          </span>
          <span className="sr-only">Menu da conta</span>
        </button>

        {open ? (
          <div
            role="menu"
            className="border-border bg-popover absolute top-full right-0 z-10 mt-1.5 w-56 rounded-xl border p-1.5 shadow-[var(--shadow-card)]"
          >
            <div className="text-muted-foreground truncate px-3 py-2 text-[13px]">{email}</div>
            <div className="border-border my-1 border-t" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="text-foreground hover:bg-surface-elevated w-full rounded-lg px-3 py-2 text-left text-[14px] transition-colors"
            >
              Sair
            </button>
          </div>
        ) : null}
      </div>

      <LogoutConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void signOut()}
      />
    </header>
  );
}
