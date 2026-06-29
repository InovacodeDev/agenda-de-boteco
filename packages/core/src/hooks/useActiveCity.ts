import { useMemo } from 'react';

import { resolveActiveCity } from '../data/lookup';
import type { City } from '../schemas';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useCitiesQuery } from './queries';

/**
 * Cidade ativa do app, unindo catálogo (TanStack Query) + preferências (store).
 * Resolve tanto cidades do catálogo quanto a cidade virtual (geolocalização
 * fora do catálogo). Retorna `undefined` enquanto o catálogo carrega e não há
 * cidade virtual — a tela decide o estado de loading.
 */
export function useActiveCity(): City | undefined {
  const { data: cities } = useCitiesQuery();
  const cityId = usePreferencesStore((state) => state.cityId);
  const customCity = usePreferencesStore((state) => state.customCity);

  return useMemo(
    () => resolveActiveCity(cities ?? [], cityId, customCity),
    [cities, cityId, customCity],
  );
}
