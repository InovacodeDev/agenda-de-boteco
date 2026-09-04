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
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center text-[14px]">
        Carregando…
      </div>
    );
  }

  if (adminCheck === 'denied') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-[32px]">🚫</span>
        <h1 className="text-foreground text-[18px] font-semibold">Acesso negado</h1>
        <p className="text-muted-foreground max-w-sm text-[14px]">
          Sua conta não tem permissão de administrador. Fale com o responsável pelo painel.
        </p>
        <button
          type="button"
          onClick={() => void useAuthStore.getState().signOut()}
          className="bg-surface-elevated text-muted-foreground hover:text-foreground rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors"
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
      <main className="bg-background flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
