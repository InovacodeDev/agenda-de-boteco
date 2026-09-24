import {
  aggregateMetrics,
  calculateRatingsSummary,
  flattenPages,
  formatEventDate,
  useOwnedEstablishmentId,
  useOwnedEvents,
  useOwnedFavoritesCount,
  useOwnedMetrics,
  useOwnerEstablishmentRatings,
} from '@agenda/core';
import {
  Card,
  EmptyState,
  Icon,
  Modal,
  Pressable,
  Screen,
  ScreenHeader,
  ScrollView,
  SegmentedTabs,
  SelectField,
  Sparkline,
  StatCard,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { useMemo, useState } from 'react';
import { ActivityIndicator, TouchableWithoutFeedback } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

type SectionTab = 'metrics' | 'reviews';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

export default function MetricsAndReviewsScreen() {
  const { isTablet } = useResponsive();
  const [section, setSection] = useState<SectionTab>('metrics');
  const [sinceDays, setSinceDays] = useState('30');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: establishmentId } = useOwnedEstablishmentId();

  const eventsQuery = useOwnedEvents();
  const events = flattenPages(eventsQuery.data);

  const { data: rows, isPending: metricsPending } = useOwnedMetrics(Number(sinceDays));
  const { data: favoritesByEvent } = useOwnedFavoritesCount();

  const { data: ratings, isPending: ratingsPending } = useOwnerEstablishmentRatings(
    establishmentId ?? '',
  );

  const isPending = metricsPending || eventsQuery.isPending;

  const { byEvent, byDay, totals } = useMemo(
    () => aggregateMetrics(rows ?? [], favoritesByEvent ?? {}),
    [rows, favoritesByEvent],
  );

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const ratingsSummary = useMemo(
    () => calculateRatingsSummary(ratings ?? []),
    [ratings],
  );

  const selectedEventSummary = selectedEventId
    ? byEvent.find((s) => s.eventId === selectedEventId)
    : null;
  const selectedEvent = selectedEventId ? eventsById.get(selectedEventId) : null;

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Desempenho & Avaliações"
        subtitle="Métricas de público e satisfação dos clientes"
      />

      <View className="p-4 pb-2">
        <SegmentedTabs<SectionTab>
          options={[
            { id: 'metrics', label: 'Métricas de Eventos' },
            { id: 'reviews', label: 'Avaliações do Bar', count: ratings?.length },
          ]}
          value={section}
          onChange={setSection}
        />
      </View>

      <ScrollView contentContainerClassName="p-4 gap-5">
        {section === 'metrics' ? (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="font-heading text-foreground text-base font-semibold">
                Período de Análise
              </Text>
              <View className="w-48">
                <SelectField
                  value={sinceDays}
                  onValueChange={setSinceDays}
                  options={PERIOD_OPTIONS}
                />
              </View>
            </View>

            {isPending ? (
              <View className="items-center justify-center p-8">
                <ActivityIndicator size="large" color="#1dd75e" />
                <Text className="font-body text-muted-foreground mt-3 text-sm">Carregando métricas…</Text>
              </View>
            ) : (
              <>
                <View
                  className={`gap-3 ${
                    isTablet ? 'flex-row flex-wrap' : 'flex-col'
                  }`}
                >
                  <View className={isTablet ? 'w-[48%] flex-grow' : 'w-full'}>
                    <StatCard
                      title="Visualizações"
                      value={totals.views}
                      icon={<Icon name="eye" size={18} color="#1dd75e" />}
                      sublabel="Acessos a páginas de eventos"
                    />
                  </View>

                  <View className={isTablet ? 'w-[48%] flex-grow' : 'w-full'}>
                    <StatCard
                      title="Cliques em Ações"
                      value={
                        totals.clicksByKind.click_map +
                        totals.clicksByKind.click_contact +
                        totals.clicksByKind.click_share
                      }
                      icon={<Icon name="location-dot" size={18} color="#f9a91f" />}
                      sublabel="Mapa, contatos e compartilhamentos"
                    />
                  </View>

                  <View className={isTablet ? 'w-[48%] flex-grow' : 'w-full'}>
                    <StatCard
                      title="Favoritos"
                      value={totals.favorites}
                      icon={<Icon name="heart" size={18} color="#f53d7a" />}
                      sublabel="Pessoas que salvaram seus eventos"
                    />
                  </View>

                  <View className={isTablet ? 'w-[48%] flex-grow' : 'w-full'}>
                    <Card className="flex-1 justify-between p-4">
                      <Text className="font-body-medium text-muted-foreground text-xs uppercase tracking-wider">
                        Evolução Diária
                      </Text>
                      <View className="my-2 items-center">
                        <Sparkline data={byDay} width={isTablet ? 260 : 200} height={40} />
                      </View>
                      <Text className="font-body text-muted-foreground text-[11px]">
                        Tendência de acessos nos últimos {sinceDays} dias
                      </Text>
                    </Card>
                  </View>
                </View>

                <View className="mt-2">
                  <Text className="font-heading text-foreground mb-3 text-base font-bold">
                    Desempenho por Evento
                  </Text>

                  {byEvent.length === 0 ? (
                    <Card className="items-center p-6 text-center">
                      <Text className="font-body text-muted-foreground text-sm">
                        Nenhum registro de acesso registrado no período selecionado.
                      </Text>
                    </Card>
                  ) : (
                    <View className="flex-col gap-3">
                      {byEvent.map((summary) => {
                        const event = eventsById.get(summary.eventId);
                        if (!event) return null;

                        return (
                          <Pressable
                            key={summary.eventId}
                            onPress={() => setSelectedEventId(summary.eventId)}
                          >
                            <Card className="active:border-primary/40 p-4">
                              <View className="flex-row items-center justify-between">
                                <Text
                                  numberOfLines={1}
                                  className="font-heading text-foreground flex-1 text-sm font-bold"
                                >
                                  {event.name}
                                </Text>
                                <Icon name="chevron-right" size={16} color="#737373" />
                              </View>

                              <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-3">
                                <View className="items-center">
                                  <Text className="font-body text-muted-foreground text-[10px] uppercase">
                                    Views
                                  </Text>
                                  <Text className="font-heading text-foreground mt-0.5 text-sm font-semibold">
                                    {summary.views}
                                  </Text>
                                </View>

                                <View className="items-center">
                                  <Text className="font-body text-muted-foreground text-[10px] uppercase">
                                    Cliques
                                  </Text>
                                  <Text className="font-heading text-foreground mt-0.5 text-sm font-semibold">
                                    {summary.clicksByKind.click_map +
                                      summary.clicksByKind.click_contact +
                                      summary.clicksByKind.click_share}
                                  </Text>
                                </View>

                                <View className="items-center">
                                  <Text className="font-body text-muted-foreground text-[10px] uppercase">
                                    Favoritos
                                  </Text>
                                  <Text className="font-heading text-foreground mt-0.5 text-sm font-semibold">
                                    {summary.favorites}
                                  </Text>
                                </View>
                              </View>
                            </Card>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            )}
          </>
        ) : (
          /* Seção de Avaliações */
          <View className="flex-col gap-5">
            {ratingsPending ? (
              <View className="items-center justify-center p-8">
                <ActivityIndicator size="large" color="#1dd75e" />
                <Text className="font-body text-muted-foreground mt-3 text-sm">Carregando avaliações…</Text>
              </View>
            ) : !ratings || ratings.length === 0 ? (
              <EmptyState
                icon={<Icon name="star" size={40} color="#f9a91f" />}
                title="Ainda não há avaliações"
                message="Seu estabelecimento ainda não recebeu notas dos frequentadores no app."
              />
            ) : (
              <>
                <Card className="p-6">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="font-heading text-foreground text-4xl font-bold">
                        {ratingsSummary.avg.toFixed(1)}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            name="star"
                            size={16}
                            color="#f9a91f"
                            variant={star <= Math.round(ratingsSummary.avg) ? 'solid' : 'regular'}
                          />
                        ))}
                      </View>
                      <Text className="font-body text-muted-foreground mt-2 text-xs">
                        Baseado em {ratingsSummary.count}{' '}
                        {ratingsSummary.count === 1 ? 'avaliação' : 'avaliações'}
                      </Text>
                    </View>

                    <View className="flex-1 pl-6">
                      {STAR_LEVELS.map((star) => {
                        const count = ratingsSummary.distribution[star] ?? 0;
                        const pct = ratingsSummary.count > 0 ? (count / ratingsSummary.count) * 100 : 0;
                        return (
                          <View key={star} className="my-0.5 flex-row items-center gap-2">
                            <Text className="font-body text-muted-foreground w-3 text-right text-xs">
                              {star}
                            </Text>
                            <View className="h-1.5 flex-1 rounded-full bg-surface">
                              <View
                                style={{ width: `${pct}%` }}
                                className="h-full rounded-full bg-accent"
                              />
                            </View>
                            <Text className="font-body text-muted-foreground w-6 text-xs">{count}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Card>

                <View>
                  <Text className="font-heading text-foreground mb-3 text-base font-bold">
                    Histórico Recente
                  </Text>
                  <View className="flex-col gap-2.5">
                    {ratings.map((item) => (
                      <Card key={item.id} className="flex-row items-center justify-between p-4">
                        <View>
                          <Text className="font-body text-muted-foreground text-xs">
                            {formatEventDate(item.created_at, true)}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Icon
                              key={s}
                              name="star"
                              size={14}
                              color="#f9a91f"
                              variant={s <= item.rating ? 'solid' : 'regular'}
                            />
                          ))}
                        </View>
                      </Card>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de Detalhe do Evento Selecionado */}
      <Modal
        visible={Boolean(selectedEventSummary)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEventId(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedEventId(null)}>
          <View className="flex-1 justify-end bg-black/60">
            <TouchableWithoutFeedback onPress={() => {}}>
              <View className="rounded-t-3xl border-t border-border bg-card p-6">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text
                    numberOfLines={1}
                    className="font-heading text-foreground flex-1 text-lg font-bold"
                  >
                    {selectedEvent?.name ?? 'Detalhes do Evento'}
                  </Text>
                  <Pressable
                    onPress={() => setSelectedEventId(null)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-surface"
                  >
                    <Icon name="xmark" size={16} color="#a6a6a6" />
                  </Pressable>
                </View>

                {selectedEventSummary ? (
                  <View className="flex-col gap-4 py-2">
                    <View className="flex-row gap-3">
                      <StatCard
                        title="Views"
                        value={selectedEventSummary.views}
                        icon={<Icon name="eye" size={16} color="#1dd75e" />}
                      />
                      <StatCard
                        title="Favoritos"
                        value={selectedEventSummary.favorites}
                        icon={<Icon name="heart" size={16} color="#f53d7a" />}
                      />
                    </View>

                    <Card className="p-4">
                      <Text className="font-heading text-foreground mb-3 text-sm font-semibold">
                        Cliques Detalhados
                      </Text>
                      <View className="flex-col gap-2">
                        <View className="flex-row items-center justify-between">
                          <Text className="font-body text-muted-foreground text-xs">
                            Ver no mapa:
                          </Text>
                          <Text className="font-body-bold text-foreground text-xs">
                            {selectedEventSummary.clicksByKind.click_map}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="font-body text-muted-foreground text-xs">
                            Contato / WhatsApp:
                          </Text>
                          <Text className="font-body-bold text-foreground text-xs">
                            {selectedEventSummary.clicksByKind.click_contact}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text className="font-body text-muted-foreground text-xs">
                            Compartilhar:
                          </Text>
                          <Text className="font-body-bold text-foreground text-xs">
                            {selectedEventSummary.clicksByKind.click_share}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </View>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}
