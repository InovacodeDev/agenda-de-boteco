/**
 * Hook de proximidade server-side. Arredonda a origem (coarseLatLng) antes de
 * montar a queryKey para que micro-movimentos do GPS não disparem refetch, e
 * delega ao service `listNearbyEstablishments` (RPC PostGIS ou fallback mock).
 * A query só roda quando há origem (`enabled`).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { listNearbyEstablishments } from '../services/proximity';
import { catalogKeys } from '../services/queryKeys';
import { coarseLatLng, type LatLng } from '../utils/geo';

export interface UseNearbyEstablishmentsParams {
  origin: LatLng | null;
  radiusKm?: number;
}

export function useNearbyEstablishments({
  origin,
  radiusKm,
}: UseNearbyEstablishmentsParams) {
  const coarse = origin ? coarseLatLng(origin) : null;

  return useQuery({
    queryKey: catalogKeys.establishments.nearby(
      coarse?.lat ?? 0,
      coarse?.lng ?? 0,
      radiusKm,
    ),
    queryFn: () =>
      listNearbyEstablishments({
        lat: coarse?.lat ?? 0,
        lng: coarse?.lng ?? 0,
        radiusKm,
      }),
    enabled: origin !== null,
    // Mantém o resultado anterior durante refetch (ex.: invalidação por realtime
    // ou mudança de raio) para o feed não piscar "todos os eventos" enquanto a
    // nova lista de proximidade carrega.
    placeholderData: keepPreviousData,
  });
}
