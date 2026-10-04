import {
  calculateRatingsSummary,
  formatEventDate,
  useOwnedEstablishmentId,
  useOwnerEstablishmentRatings,
} from '@agenda/core';
import {
  Card,
  EmptyState,
  Icon,
  Screen,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { useMemo } from 'react';
import { ActivityIndicator } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';
import { scrollContentClassName } from '@/lib/screenLayout';

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

export default function ReviewsScreen() {
  const { isTablet } = useResponsive();
  const { data: establishmentId, isPending: isEstIdPending } = useOwnedEstablishmentId();
  const { data: ratings, isPending: isRatingsPending } = useOwnerEstablishmentRatings(
    establishmentId ?? '',
  );

  const isPending = isEstIdPending || isRatingsPending;

  const summary = useMemo(() => calculateRatingsSummary(ratings ?? []), [ratings]);

  return (
    <Screen noTopInset noBottomInset>
      <ScreenHeader
        title="Avaliações"
        subtitle="Acompanhe as notas recebidas pelo seu estabelecimento e o histórico de clientes."
      />

      <ScrollView contentContainerClassName={`${scrollContentClassName(isTablet)} gap-5`}>
        {isPending ? (
          <View className="items-center justify-center p-8">
            <ActivityIndicator size="large" color="#1dd75e" />
            <Text className="font-body text-muted-foreground mt-3 text-sm">
              Carregando avaliações…
            </Text>
          </View>
        ) : !establishmentId ? (
          <EmptyState
            icon={<Icon name="star" size={32} color="#f9a91f" />}
            message="Nenhum estabelecimento vinculado a esta conta."
          />
        ) : (
          <>
            <View className={`gap-4 ${isTablet ? 'flex-row flex-wrap' : 'flex-col'}`}>
              <Card className={isTablet ? 'w-[31%] grow justify-between p-6' : 'w-full justify-between p-6'}>
                <Text className="font-body-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Média Geral
                </Text>
                <View className="my-3 flex-row items-end gap-2">
                  <Text className="font-heading text-foreground text-4xl font-bold">
                    {summary.avg.toFixed(1)}
                  </Text>
                  <Text className="font-body text-muted-foreground mb-1 text-sm font-medium">
                    / 5.0
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name="star"
                      size={18}
                      color="#f9a91f"
                      variant={star <= Math.round(summary.avg) ? 'solid' : 'regular'}
                    />
                  ))}
                </View>
                <Text className="font-body text-muted-foreground mt-3 text-xs">
                  Baseado em {summary.count} {summary.count === 1 ? 'avaliação' : 'avaliações'}
                </Text>
              </Card>

              <Card className={isTablet ? 'w-[31%] grow justify-between p-6' : 'w-full justify-between p-6'}>
                <Text className="font-body-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Total de Avaliações
                </Text>
                <Text className="font-heading text-foreground my-3 text-4xl font-bold">
                  {summary.count}
                </Text>
                <Text className="font-body text-muted-foreground text-xs">
                  {summary.count === 0
                    ? 'Nenhuma avaliação registrada até o momento.'
                    : 'Clientes que avaliaram a experiência no boteco.'}
                </Text>
              </Card>

              <Card className={isTablet ? 'w-[31%] grow justify-between p-6' : 'w-full justify-between p-6'}>
                <Text className="font-body-medium text-muted-foreground mb-2 text-xs uppercase tracking-wider">
                  Distribuição das Notas
                </Text>
                <View className="gap-1.5">
                  {STAR_LEVELS.map((star) => {
                    const starCount = summary.distribution[star] ?? 0;
                    const percentage =
                      summary.count > 0 ? Math.round((starCount / summary.count) * 100) : 0;
                    return (
                      <View key={star} className="flex-row items-center justify-between gap-3">
                        <View className="min-w-0 flex-1 flex-row items-center gap-2">
                          <Text className="font-body text-muted-foreground w-5 text-xs font-medium">
                            {star}
                          </Text>
                          <Icon name="star" size={12} color="#f9a91f" variant="solid" />
                          <View className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-elevated">
                            <View
                              style={{ width: `${percentage}%` }}
                              className="h-full rounded-full bg-accent"
                            />
                          </View>
                        </View>
                        <Text className="font-body text-muted-foreground shrink-0 text-xs font-medium">
                          {starCount.toLocaleString('pt-BR')} ({percentage}%)
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </View>

            <View>
              <Text className="font-heading text-foreground mb-3 text-lg font-bold">
                Histórico de Avaliações
              </Text>

              {!ratings || ratings.length === 0 ? (
                <EmptyState
                  icon={<Icon name="star" size={32} color="#f9a91f" />}
                  message="Seu estabelecimento ainda não recebeu nenhuma avaliação de clientes."
                />
              ) : (
                <View className="gap-2.5">
                  {ratings.map((ratingItem) => (
                    <Card
                      key={ratingItem.id}
                      className="flex-row items-center justify-between gap-3 p-4"
                    >
                      <Text className="font-body text-muted-foreground min-w-0 flex-1 text-xs font-medium">
                        {formatEventDate(ratingItem.created_at, true)}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <View className="flex-row items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Icon
                              key={star}
                              name="star"
                              size={16}
                              color="#f9a91f"
                              variant={star <= ratingItem.rating ? 'solid' : 'regular'}
                            />
                          ))}
                        </View>
                        <Text className="font-heading text-foreground text-sm font-semibold">
                          {ratingItem.rating}.0
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
