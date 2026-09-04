'use client';

import { catalogKeys, getEstablishment, getOwnedEstablishmentId } from '@agenda/core';
import { useQuery } from '@tanstack/react-query';

/**
 * Query keys do painel. Fica local (Regra dos 3 do AGENTS.md): só o web-client
 * consome o vínculo dono↔bar. Se o mobile-client da Fase 6 passar a usar,
 * promove para @agenda/core.
 */
export const panelKeys = {
  ownedEstablishmentId: ['panel', 'owned-establishment-id'] as const,
} as const;

/** Id do estabelecimento do dono logado, ou null se ainda não houver vínculo. */
export function useOwnedEstablishmentId() {
  return useQuery({
    queryKey: panelKeys.ownedEstablishmentId,
    queryFn: () => getOwnedEstablishmentId(),
  });
}

/** Estabelecimento completo do dono logado. Só dispara depois de haver vínculo. */
export function useOwnedEstablishment() {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: catalogKeys.establishments.detail(establishmentId ?? ''),
    queryFn: () => getEstablishment(establishmentId ?? ''),
    enabled: Boolean(establishmentId),
  });
}
