import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpsertEstablishmentRatingInput } from '../schemas/ratings';
import {
  getUserEstablishmentRating,
  listEstablishmentRatingsForOwner,
  upsertEstablishmentRating,
} from '../services/establishment-ratings';
import { catalogKeys } from '../services/queryKeys';

/**
 * Consulta a avaliação dada pelo usuário autenticado para o bar especificado.
 */
export function useUserEstablishmentRating(establishmentId: string) {
  return useQuery({
    queryKey: catalogKeys.establishmentRatings.user(establishmentId),
    queryFn: () => getUserEstablishmentRating(establishmentId),
    enabled: Boolean(establishmentId),
  });
}

/**
 * Consulta todas as avaliações recebidas pelo bar para o painel do proprietário.
 */
export function useOwnerEstablishmentRatings(establishmentId: string) {
  return useQuery({
    queryKey: catalogKeys.establishmentRatings.byEstablishment(establishmentId),
    queryFn: () => listEstablishmentRatingsForOwner(establishmentId),
    enabled: Boolean(establishmentId),
  });
}

/**
 * Mutação para enviar ou atualizar a nota dada a um estabelecimento.
 * Invalida automaticamente o cache da avaliação do usuário, das avaliações do bar
 * e dos dados gerais do estabelecimento (média e contagem de ratings).
 */
export function useUpsertEstablishmentRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertEstablishmentRatingInput) =>
      upsertEstablishmentRating(input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.establishmentRatings.user(variables.establishmentId),
      });
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.establishmentRatings.byEstablishment(
          variables.establishmentId,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.establishments.detail(variables.establishmentId),
      });
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.establishments.root,
      });
    },
  });
}
