'use client';

import { getOwnedEstablishmentId, useAuthStore } from '@agenda/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

type OwnerCheck = 'checking' | 'linked' | 'unlinked';

/**
 * Guard do painel: sem sessão vai para /login; com sessão mas sem bar vinculado
 * vai para o onboarding. O isolamento real é o RLS — este check é só navegação.
 */
export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const [check, setCheck] = useState<OwnerCheck>('checking');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'signedOut' || status === 'unavailable') {
      router.replace('/login');
      return;
    }
    let active = true;
    void getOwnedEstablishmentId().then((id) => {
      if (!active) return;
      if (id) {
        setCheck('linked');
        return;
      }
      setCheck('unlinked');
      router.replace('/onboarding');
    });
    return () => {
      active = false;
    };
  }, [status, router]);

  if (check !== 'linked') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[14px] text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto bg-background p-8">{children}</main>
      </div>
    </div>
  );
}
