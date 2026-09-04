import { useEffect, useReducer } from 'react';

import { getConfiguredAnalytics } from '../services/analytics';

const forceRender = (tick: number) => tick + 1;

/**
 * Lê uma feature flag do adapter de analytics configurado. Sem adapter (dev
 * sem env var), fecha por padrão (`false`) — mesmo princípio de
 * `isCurrentUserEstablishmentOwner`: ausência de configuração não lança, só
 * degrada. Flags carregam de forma assíncrona (ex.: PostHog busca depois do
 * init); como o valor lido de `instance.isFeatureEnabled` é derivado a cada
 * render, só precisamos de um "tick" para re-renderizar quando `onFeatureFlags`
 * disparar — sem duplicar a leitura num `setState` síncrono dentro do efeito.
 */
export function useFeatureFlag(key: string): boolean {
  const [, rerender] = useReducer(forceRender, 0);
  const instance = getConfiguredAnalytics();

  useEffect(() => {
    if (!instance) return;
    return instance.onFeatureFlags(rerender);
  }, [instance]);

  return instance?.isFeatureEnabled(key) ?? false;
}
