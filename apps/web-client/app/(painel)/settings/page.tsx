'use client';

import { useFeatureFlag } from '@agenda/core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ComingSoon } from '@/components/ComingSoon';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const enabled = useFeatureFlag('panel-settings');

  // Feature ainda não liberada: acesso direto por URL volta ao dashboard.
  useEffect(() => {
    if (!enabled) router.replace('/');
  }, [enabled, router]);

  if (!enabled) return null;

  return (
    <ComingSoon
      title="Configurações"
      description="Preferências de conta, notificações e privacidade."
    />
  );
}
