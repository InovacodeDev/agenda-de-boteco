'use client';

import {
  calculateRatingsSummary,
  formatEventDate,
  useFeatureFlag,
  useOwnerEstablishmentRatings,
} from '@agenda/core';
import { StarIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { useOwnedEstablishmentId } from '@/hooks/use-owned-establishment';

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

export default function AvaliacoesPage() {
  const router = useRouter();
  const enabled = useFeatureFlag('panel-reviews');

  useEffect(() => {
    if (!enabled) router.replace('/');
  }, [enabled, router]);

  const { data: establishmentId, isPending: isEstIdPending } =
    useOwnedEstablishmentId();
  const { data: ratings, isPending: isRatingsPending } =
    useOwnerEstablishmentRatings(establishmentId ?? '');

  const isPending = isEstIdPending || isRatingsPending;

  const summary = useMemo(
    () => calculateRatingsSummary(ratings ?? []),
    [ratings],
  );

  if (!enabled) return null;

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-foreground text-2xl font-bold">
          Avaliações
        </h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe as notas recebidas pelo seu estabelecimento e o histórico de clientes.
        </p>
      </header>

      {isPending ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">Carregando avaliações…</p>
        </div>
      ) : !establishmentId ? (
        <EmptyState
          icon={<StarIcon size={32} />}
          message="Nenhum estabelecimento vinculado a esta conta."
        />
      ) : (
        <>
          {/* Métricas e Resumo */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Média Geral */}
            <div className="border-border bg-card flex flex-col justify-between rounded-2xl border p-6">
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Média Geral
              </span>
              <div className="my-3 flex items-baseline gap-2">
                <span className="font-heading text-foreground text-4xl font-bold">
                  {summary.avg.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-sm font-medium">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 text-accent">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    size={18}
                    weight={star <= Math.round(summary.avg) ? 'fill' : 'regular'}
                    className={
                      star <= Math.round(summary.avg)
                        ? 'text-accent'
                        : 'text-muted-foreground/30'
                    }
                  />
                ))}
              </div>
              <span className="text-muted-foreground mt-3 text-xs">
                Baseado em {summary.count}{' '}
                {summary.count === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>

            {/* Total de Avaliações */}
            <div className="border-border bg-card flex flex-col justify-between rounded-2xl border p-6">
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Total de Avaliações
              </span>
              <div className="my-3">
                <span className="font-heading text-foreground text-4xl font-bold">
                  {summary.count}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {summary.count === 0
                  ? 'Nenhuma avaliação registrada até o momento.'
                  : 'Clientes que avaliaram a experiência no boteco.'}
              </p>
            </div>

            {/* Distribuição de Notas */}
            <div className="border-border bg-card flex flex-col justify-between rounded-2xl border p-6">
              <span className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                Distribuição das Notas
              </span>
              <div className="flex flex-col gap-1.5">
                {STAR_LEVELS.map((star) => {
                  const starCount = summary.distribution[star] ?? 0;
                  const percentage =
                    summary.count > 0
                      ? Math.round((starCount / summary.count) * 100)
                      : 0;

                  return (
                    <div key={star} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground flex w-5 shrink-0 items-center gap-0.5 font-medium">
                          {star}
                          <StarIcon size={12} weight="fill" className="text-accent" />
                        </span>
                        <div className="bg-surface-elevated h-2 w-28 sm:w-36 shrink-0 overflow-hidden rounded-full">
                          <div
                            className="bg-accent h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-right text-xs font-medium whitespace-nowrap">
                        {starCount.toLocaleString('pt-BR')} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Histórico das Avaliações */}
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-foreground text-lg font-bold">
              Histórico de Avaliações
            </h2>

            {!ratings || ratings.length === 0 ? (
              <EmptyState
                icon={<StarIcon size={32} />}
                message="Seu estabelecimento ainda não recebeu nenhuma avaliação de clientes."
              />
            ) : (
              <div className="border-border bg-card divide-border divide-y overflow-hidden rounded-2xl border">
                {ratings.map((ratingItem) => (
                  <div
                    key={ratingItem.id}
                    className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-elevated/40"
                  >
                    <span className="text-muted-foreground text-xs font-medium">
                      {formatEventDate(ratingItem.created_at, true)}
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-accent">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            size={16}
                            weight={star <= ratingItem.rating ? 'fill' : 'regular'}
                            className={
                              star <= ratingItem.rating
                                ? 'text-accent'
                                : 'text-muted-foreground/30'
                            }
                          />
                        ))}
                      </div>
                      <span className="text-foreground text-sm font-semibold">
                        {ratingItem.rating}.0
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
