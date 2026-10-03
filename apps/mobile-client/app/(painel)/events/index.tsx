import {
  type Event,
  flattenPages,
  formatEventDate,
  getFriendlyErrorMessage,
  useDeleteOwnedEvent,
  useDeleteOwnedEventGroup,
  useOwnedEvents,
} from '@agenda/core';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Icon,
  Image,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { FlashList } from '@shopify/flash-list';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

type FilterTab = 'all' | 'published' | 'draft';

export default function EventsListScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [pendingSeries, setPendingSeries] = useState<Event | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const eventsQuery = useOwnedEvents();
  const allEvents = flattenPages(eventsQuery.data);
  const isPending = eventsQuery.isPending;

  const deleteEvent = useDeleteOwnedEvent();
  const deleteGroup = useDeleteOwnedEventGroup();
  const isDeleting = deleteEvent.isPending || deleteGroup.isPending;

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    return allEvents.filter((e) => e.status === filter);
  }, [allEvents, filter]);

  const handleDeletePress = (event: Event) => {
    if (event.recurrence_group_id) {
      setPendingSeries(event);
    } else {
      setDeleteId(event.id);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEvent.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (err: unknown) {
      Alert.alert('Erro ao excluir', getFriendlyErrorMessage(err));
    }
  };

  const handleDeleteOccurrence = async () => {
    if (!pendingSeries) return;
    try {
      await deleteEvent.mutateAsync(pendingSeries.id);
      setPendingSeries(null);
    } catch (err: unknown) {
      Alert.alert('Erro ao excluir', getFriendlyErrorMessage(err));
    }
  };

  const handleDeleteEntireSeries = async () => {
    if (!pendingSeries?.recurrence_group_id) return;
    try {
      await deleteGroup.mutateAsync(pendingSeries.recurrence_group_id);
      setPendingSeries(null);
    } catch (err: unknown) {
      Alert.alert('Erro ao excluir', getFriendlyErrorMessage(err));
    }
  };

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Eventos da Casa"
        subtitle={`${allEvents.length} cadastrados`}
        rightAction={
          <Button
            label="Novo evento"
            variant="solid"
            icon={<Icon name="plus" size={14} color="#0f0f0f" weight="bold" />}
            onPress={() => router.push('/(painel)/events/new')}
            className="h-9 px-3"
          />
        }
      />

      <View className="p-4 pb-2">
        <SegmentedTabs<FilterTab>
          options={[
            { id: 'all', label: 'Todos', count: allEvents.length },
            {
              id: 'published',
              label: 'Publicados',
              count: allEvents.filter((e) => e.status === 'published').length,
            },
            {
              id: 'draft',
              label: 'Rascunhos',
              count: allEvents.filter((e) => e.status === 'draft').length,
            },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#1dd75e" />
          <Text className="font-body text-muted-foreground mt-3 text-sm">Carregando eventos…</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Icon name="calendar-blank" size={40} color="#737373" />}
          title="Nenhum evento encontrado"
          message={
            filter === 'all'
              ? 'Você ainda não cadastrou nenhum evento para este estabelecimento.'
              : `Nenhum evento com status "${filter === 'published' ? 'Publicado' : 'Rascunho'}".`
          }
          actionLabel="Cadastrar novo evento"
          onAction={() => router.push('/(painel)/events/new')}
        />
      ) : (
        <View className="flex-1 px-4">
          <FlashList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            numColumns={isTablet ? 2 : 1}
            renderItem={({ item }) => {
              const startsAtMidnight =
                new Date(item.starts_at).getHours() === 0 &&
                new Date(item.starts_at).getMinutes() === 0;

              return (
                <View className={isTablet ? 'p-2' : 'pb-4'}>
                  <Card className="overflow-hidden p-0">
                    <View className="relative h-36 w-full bg-surface">
                      {item.banner_url ? (
                        <Image
                          source={{ uri: item.banner_url }}
                          contentFit="cover"
                          className="h-full w-full"
                        />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <Icon name="image" size={32} color="#737373" />
                        </View>
                      )}
                      <View className="absolute top-3 right-3">
                        <Badge
                          label={item.status === 'published' ? 'Publicado' : 'Rascunho'}
                          variant={item.status === 'published' ? 'published' : 'draft'}
                        />
                      </View>
                    </View>

                    <View className="p-4">
                      <Text
                        numberOfLines={1}
                        className="font-heading text-foreground text-base font-bold"
                      >
                        {item.name}
                      </Text>

                      <View className="mt-1 flex-row items-center gap-2">
                        <Text className="font-body text-muted-foreground text-xs">
                          {formatEventDate(item.starts_at, !startsAtMidnight)}
                        </Text>
                        {item.recurrence_group_id ? (
                          <Badge label="Série" variant="accent" />
                        ) : null}
                      </View>

                      {item.attraction ? (
                        <Text
                          numberOfLines={1}
                          className="font-body text-foreground/80 mt-1 text-xs"
                        >
                          Atração: {item.attraction}
                        </Text>
                      ) : null}

                      <View className="mt-4 flex-row items-center gap-2 border-t border-border/60 pt-3">
                        <Button
                          label="Editar"
                          variant="solid"
                          icon={<Icon name="pencil" size={14} color="#0f0f0f" />}
                          onPress={() => router.push(`/(painel)/events/${item.id}` as Href)}
                          className="h-9 flex-1 px-3 text-xs"
                        />
                        <Button
                          variant="ghost"
                          icon={<Icon name="trash-can" size={16} color="#f53d7a" />}
                          onPress={() => handleDeletePress(item)}
                          className="h-9 w-9 p-0"
                        />
                      </View>
                    </View>
                  </Card>
                </View>
              );
            }}
            onEndReached={() => {
              if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
                eventsQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              eventsQuery.isFetchingNextPage ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#1dd75e" />
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* Confirmação de exclusão para evento único */}
      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Excluir evento?"
        message="Esta ação não poderá ser desfeita e o evento sairá da agenda."
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        destructive
        busy={isDeleting}
        onConfirm={handleConfirmSingleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Confirmação de exclusão para evento de série */}
      <ConfirmDialog
        visible={Boolean(pendingSeries)}
        title="Excluir evento de repetição"
        message={`"${pendingSeries?.name}" faz parte de uma série de eventos recorrentes. Como deseja proceder?`}
        confirmLabel="Excluir série toda"
        cancelLabel="Só esta ocorrência"
        destructive
        busy={isDeleting}
        onConfirm={handleDeleteEntireSeries}
        onCancel={handleDeleteOccurrence}
      />
    </Screen>
  );
}
