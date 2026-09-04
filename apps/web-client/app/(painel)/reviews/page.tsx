'use client';

import { useFeatureFlag } from '@agenda/core';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ComingSoon } from '@/components/ComingSoon';

export default function AvaliacoesPage() {
  const router = useRouter();
  const enabled = useFeatureFlag('panel-reviews');

  // Feature ainda não liberada: acesso direto por URL volta ao dashboard.
  useEffect(() => {
    if (!enabled) router.replace('/');
  }, [enabled, router]);

  if (!enabled) return null;

  return (
    <ComingSoon
      title="Avaliações"
      description="Modere comentários e responda quem avaliou o seu bar."
    />
  );
}
