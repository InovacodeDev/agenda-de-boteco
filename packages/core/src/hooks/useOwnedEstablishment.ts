import { useQuery } from '@tanstack/react-query';

import { getEstablishment } from '../services/catalog';
import { getOwnedEstablishmentId } from '../services/establishment-owner';
import { catalogKeys } from '../services/queryKeys';

export function useOwnedEstablishmentId() {
  return useQuery({
    queryKey: catalogKeys.panel.ownedEstablishmentId,
    queryFn: () => getOwnedEstablishmentId(),
  });
}

export function useOwnedEstablishment() {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: catalogKeys.establishments.detail(establishmentId ?? ''),
    queryFn: () => getEstablishment(establishmentId ?? ''),
    enabled: Boolean(establishmentId),
  });
}
