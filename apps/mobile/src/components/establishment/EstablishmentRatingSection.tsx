import {
  type RatingValue,
  useUpsertEstablishmentRating,
  useUserEstablishmentRating,
} from '@agenda/core';
import { useState } from 'react';

import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { RatingStars } from '@/components/ui/RatingStars';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';

export interface EstablishmentRatingSectionProps {
  establishmentId: string;
  ratingAvg: number;
  ratingCount: number;
}

const STARS: RatingValue[] = [1, 2, 3, 4, 5];

export function EstablishmentRatingSection({
  establishmentId,
  ratingAvg,
  ratingCount,
}: EstablishmentRatingSectionProps) {
  const requireAuth = useRequireAuth();
  const authStatus = useAuthStore((state) => state.status);
  const isSignedIn = authStatus === 'signedIn';

  const { data: userRatingData, isPending: isUserRatingPending } =
    useUserEstablishmentRating(establishmentId);
  const upsertMutation = useUpsertEstablishmentRating();

  const [feedback, setFeedback] = useState<string | null>(null);

  const currentRating = userRatingData?.rating ?? 0;

  const handleSelectRating = (star: RatingValue) => {
    requireAuth(() => {
      upsertMutation.mutate(
        { establishmentId, rating: star },
        {
          onSuccess: () => {
            setFeedback(
              currentRating > 0
                ? 'Sua avaliação foi atualizada!'
                : 'Obrigado por avaliar este boteco!',
            );
            setTimeout(() => setFeedback(null), 3500);
          },
          onError: () => {
            setFeedback('Não foi possível registrar a avaliação.');
            setTimeout(() => setFeedback(null), 4000);
          },
        },
      );
    });
  };

  return (
    <View className="bg-card gap-5 rounded-2xl p-6">
      {/* Resumo geral */}
      <View className="items-center gap-2">
        <RatingStars avg={ratingAvg} count={ratingCount} />
        <Text className="font-body text-muted-foreground text-center text-[13px]">
          {ratingCount === 0
            ? 'Este boteco ainda não possui avaliações. Seja o primeiro!'
            : `Avaliações de ${ratingCount} ${ratingCount === 1 ? 'pessoa' : 'pessoas'} que já curtiram a noite por aqui.`}
        </Text>
      </View>

      <View className="bg-border/60 h-[1px] w-full" />

      {/* Seção interativa do usuário */}
      <View className="items-center gap-3">
        <Text className="font-body-semibold text-foreground text-[14px]">
          Sua avaliação
        </Text>

        <Text className="font-body text-muted-foreground text-center text-[12px]">
          {!isSignedIn
            ? 'Faça login para deixar sua nota para o boteco.'
            : currentRating > 0
              ? `Você avaliou com nota ${currentRating}. Toque em uma estrela para alterar.`
              : 'Toque nas estrelas para atribuir uma nota de 1 a 5.'}
        </Text>

        {/* 5 estrelas tocáveis */}
        <View className="flex-row items-center gap-2 pt-1">
          {STARS.map((star) => {
            const isFilled = star <= currentRating;
            return (
              <GuardedPressable
                key={star}
                accessibilityLabel={`Avaliar com ${star} estrelas`}
                accessibilityRole="button"
                disabled={upsertMutation.isPending || isUserRatingPending}
                onPress={() => handleSelectRating(star)}
                className="h-11 w-11 items-center justify-center rounded-xl"
              >
                <Icon
                  name="star"
                  variant={isFilled ? 'solid' : 'regular'}
                  color={isFilled ? colors.accent : colors.mutedForeground}
                  size={30}
                />
              </GuardedPressable>
            );
          })}
        </View>

        {upsertMutation.isPending ? (
          <Text className="font-body text-muted-foreground text-[12px]">
            Salvando sua avaliação…
          </Text>
        ) : feedback ? (
          <Text className="font-body-medium text-primary text-[12px]">
            {feedback}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
