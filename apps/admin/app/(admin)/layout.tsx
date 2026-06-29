'use client';

import { isCurrentUserAdmin, useAuthStore } from '@agenda/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Sidebar } from '@/components/Sidebar';

type AdminCheck = 'checking' | 'allowed' | 'denied';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const [adminCheck, setAdminCheck] = useState<AdminCheck>('checking');

  // Sem sessão → login. Com sessão → confere is_admin no banco.
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'signedOut' || status === 'unavailable') {
      router.replace('/login');
      return;
    }
    let active = true;
    void isCurrentUserAdmin().then((isAdmin) => {
      if (active) setAdminCheck(isAdmin ? 'allowed' : 'denied');
    });
    return () => {
      active = false;
    };
  }, [status, router]);

  if (status === 'loading' || (status === 'signedIn' && adminCheck === 'checking')) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[14px] text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (adminCheck === 'denied') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-[32px]">🚫</span>
        <h1 className="text-[18px] font-semibold text-foreground">Acesso negado</h1>
        <p className="max-w-sm text-[14px] text-muted-foreground">
          Sua conta não tem permissão de administrador. Fale com o responsável pelo painel.
        </p>
        <button
          type="button"
          onClick={() => void useAuthStore.getState().signOut()}
          className="rounded-full bg-surface-elevated px-5 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Sair
        </button>
      </div>
    );
  }

  if (adminCheck !== 'allowed') return null;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background p-8">{children}</main>
    </div>
  );
}
