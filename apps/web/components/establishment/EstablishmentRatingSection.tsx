'use client';

import {
  type RatingValue,
  useAuthStore,
  useUpsertEstablishmentRating,
  useUserEstablishmentRating,
} from '@agenda/core';
import { useState } from 'react';

import { StarIcon } from '@/components/ui/icons';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface EstablishmentRatingSectionProps {
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

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentRating = userRatingData?.rating ?? 0;
  const activeRating = hoveredStar ?? currentRating;

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
            setFeedback('Não foi possível registrar a avaliação. Tente novamente.');
            setTimeout(() => setFeedback(null), 4000);
          },
        },
      );
    });
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-card p-6">
      {/* Resumo geral do boteco */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <StarIcon size={24} className="text-accent" />
          <span className="text-[28px] font-[family-name:var(--font-heading)] font-bold text-foreground">
            {ratingAvg.toFixed(1)}
          </span>
        </div>
        <p className="text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
          {ratingCount === 0
            ? 'Este boteco ainda não possui avaliações. Seja o primeiro!'
            : `Avaliações de ${ratingCount} ${ratingCount === 1 ? 'pessoa' : 'pessoas'} que já curtiram a noite por aqui.`}
        </p>
      </div>

      <div className="h-px w-full bg-border/60" />

      {/* Seção interativa do usuário */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
          Sua avaliação
        </span>

        <p className="text-center text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
          {!isSignedIn
            ? 'Faça login para deixar sua nota para o boteco.'
            : currentRating > 0
              ? `Você avaliou com nota ${currentRating}. Clique em uma estrela para alterar.`
              : 'Clique nas estrelas para atribuir uma nota de 1 a 5.'}
        </p>

        {/* 5 estrelas interativas */}
        <div
          className="flex items-center gap-1.5"
          onMouseLeave={() => setHoveredStar(null)}
        >
          {STARS.map((star) => {
            const isFilled = star <= activeRating;
            return (
              <button
                key={star}
                type="button"
                aria-label={`Avaliar com ${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                disabled={upsertMutation.isPending || isUserRatingPending}
                onClick={() => handleSelectRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                className="group flex h-9 w-9 items-center justify-center rounded-lg transition-transform hover:scale-115 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                <StarIcon
                  size={26}
                  filled={isFilled}
                  className={isFilled ? 'text-accent' : 'text-muted-foreground/40'}
                />
              </button>
            );
          })}
        </div>

        {upsertMutation.isPending ? (
          <span className="text-[12px] font-[family-name:var(--font-body)] text-muted-foreground animate-pulse">
            Salvando sua avaliação…
          </span>
        ) : feedback ? (
          <span className="text-[12px] font-[family-name:var(--font-body)] font-medium text-primary animate-fade-in">
            {feedback}
          </span>
        ) : null}
      </div>
    </div>
  );
}
