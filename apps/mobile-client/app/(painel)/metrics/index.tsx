import {
  aggregateMetrics,
  flattenPages,
  useMetricsEvents,
  useOwnedFavoritesCount,
  useOwnedMetrics,
} from '@agenda/core';
import {
  Card,
  EmptyState,
  Icon,
  Screen,
  ScreenHeader,
  ScrollView,
  SelectField,
  Sparkline,
  StatCard,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { EventMetricsRow } from '@/components/EventMetricsRow';
import { EventMetricsSheet } from '@/components/EventMetricsSheet';
import { useResponsive } from '@/hooks/useResponsive';
import { scrollContentClassName } from '@/lib/screenLayout';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export default function MetricsScreen() {
  const { isTablet } = useResponsive();
  const [sinceDays, setSinceDays] = useState('30');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: rows, isPending: metricsPending } = useOwnedMetrics(Number(sinceDays));
  const { data: favoritesByEvent } = useOwnedFavoritesCount();

  const { byEvent, byDay, totals } = useMemo(
    () => aggregateMetrics(rows ?? [], favoritesByEvent ?? {}),
    [rows, favoritesByEvent],
  );

  const eventIds = useMemo(() => byEvent.map((summary) => summary.eventId), [byEvent]);
  const eventsQuery = useMetricsEvents(eventIds);
  const events = flattenPages(eventsQuery.data);

  const isPending = metricsPending || eventsQuery.isPending;

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const reachedThreshold =
      layoutMeasurement.height + contentOffset.y >= contentSize.height * 0.8;
    if (reachedThreshold && eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  };

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const selectedSummary = selectedEventId
    ? (byEvent.find((s) => s.eventId === selectedEventId) ?? null)
    : null;
  const selectedEvent = selectedEventId ? (eventsById.get(selectedEventId) ?? null) : null;
  const closeSheet = () => setSelectedEventId(null);

  return (
    <Screen noTopInset noBottomInset>
      <ScreenHeader
        title="Métricas"
        subtitle="Visualizações e cliques dos seus eventos, somando app e site."
      />

      <ScrollView
        contentContainerClassName={`${scrollContentClassName(isTablet)} gap-5`}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        <View className="flex-row items-center justify-end">
          <View className="w-48">
            <SelectField value={sinceDays} onValueChange={setSinceDays} options={PERIOD_OPTIONS} />
          </View>
        </View>

        {isPending ? (
          <View className="items-center justify-center p-8">
            <ActivityIndicator size="large" color="#1dd75e" />
            <Text className="font-body text-muted-foreground mt-3 text-sm">Carregando…</Text>
          </View>
        ) : (
          <>
            <View className={`gap-3 ${isTablet ? 'flex-row flex-wrap' : 'flex-col'}`}>
              <View className={isTablet ? 'w-[48%] grow' : 'w-full'}>
                <StatCard
                  title="Visualizações"
                  value={totals.views}
                  icon={<Icon name="eye" size={18} color="#1dd75e" />}
                />
              </View>
              <View className={isTablet ? 'w-[48%] grow' : 'w-full'}>
                <StatCard
                  title="Cliques"
                  value={
                    totals.clicksByKind.click_map +
                    totals.clicksByKind.click_contact +
                    totals.clicksByKind.click_share
                  }
                  icon={<Icon name="location-dot" size={18} color="#f9a91f" />}
                />
              </View>
              <View className={isTablet ? 'w-[48%] grow' : 'w-full'}>
                <StatCard
                  title="Favoritos"
                  value={totals.favorites}
                  icon={<Icon name="heart" size={18} color="#f53d7a" />}
                />
              </View>
              <View className={isTablet ? 'w-[48%] grow' : 'w-full'}>
                <Card className="flex-1 justify-between p-4">
                  <Text className="font-body-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Evolução
                  </Text>
                  <View className="my-2 items-center">
                    <Sparkline data={byDay} width={isTablet ? 260 : 200} height={40} />
                  </View>
                </Card>
              </View>
            </View>

            {byEvent.length === 0 ? (
              <EmptyState message="Nenhum dado de métrica no período selecionado." />
            ) : (
              <View className={`gap-3 ${isTablet ? 'flex-row flex-wrap' : 'flex-col'}`}>
                {byEvent.map((summary) => {
                  const event = eventsById.get(summary.eventId);
                  if (!event) return null;
                  return (
                    <View key={summary.eventId} className={isTablet ? 'w-[48%] grow' : 'w-full'}>
                      <EventMetricsRow
                        name={event.name}
                        summary={summary}
                        onViewDetails={() => setSelectedEventId(summary.eventId)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
            {eventsQuery.isFetchingNextPage ? (
              <View className="items-center py-2">
                <ActivityIndicator size="small" color="#1dd75e" />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <EventMetricsSheet
        name={selectedEvent?.name ?? null}
        summary={selectedSummary}
        byDay={byDay}
        isTablet={isTablet}
        onClose={closeSheet}
      />
    </Screen>
  );
}
