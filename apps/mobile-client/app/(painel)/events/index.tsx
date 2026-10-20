import {
  buildPanelEventPreviewUrl,
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
  Text,
  useToast,
  View,
} from '@agenda/shared-ui-mobile';
import { FlashList } from '@shopify/flash-list';
import { type Href, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/useResponsive';
import { resolveDevAssetUrl } from '@/lib/devUrl';
import { listContentStyle } from '@/lib/screenLayout';

const BACKDROP_PADDING = 20;

function EventBanner({ url }: { url: string | null | undefined }) {
  const shownUrl = url ? resolveDevAssetUrl(url) : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!shownUrl || failedUrl === shownUrl) {
    return (
      <View className="h-full w-full items-center justify-center">
        <Icon name="image" size={32} color="#737373" />
      </View>
    );
  }

  return (
    <Image
      key={shownUrl}
      source={{ uri: shownUrl }}
      contentFit="cover"
      transition={150}
      recyclingKey={shownUrl}
      onError={() => setFailedUrl(shownUrl)}
      className="h-full w-full"
    />
  );
}

export default function EventsListScreen() {
  const router = useRouter();
  const toast = useToast();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const [pendingSeries, setPendingSeries] = useState<Event | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const eventsQuery = useOwnedEvents();
  const allEvents = flattenPages(eventsQuery.data);
  const isPending = eventsQuery.isPending;

  const deleteEvent = useDeleteOwnedEvent();
  const deleteGroup = useDeleteOwnedEventGroup();
  const isDeleting = deleteEvent.isPending || deleteGroup.isPending;

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
      toast.show({ tone: 'error', message: getFriendlyErrorMessage(err) });
    }
  };

  const handleDeleteOccurrence = async () => {
    if (!pendingSeries) return;
    try {
      await deleteEvent.mutateAsync(pendingSeries.id);
      setPendingSeries(null);
    } catch (err: unknown) {
      toast.show({ tone: 'error', message: getFriendlyErrorMessage(err) });
    }
  };

  const handleDeleteEntireSeries = async () => {
    if (!pendingSeries?.recurrence_group_id) return;
    try {
      await deleteGroup.mutateAsync(pendingSeries.recurrence_group_id);
      setPendingSeries(null);
    } catch (err: unknown) {
      toast.show({ tone: 'error', message: getFriendlyErrorMessage(err) });
    }
  };

  const handleOpenPublicPage = (event: Event) => {
    const baseUrl = process.env.EXPO_PUBLIC_WEB_URL;
    if (!baseUrl) return;
    WebBrowser.openBrowserAsync(buildPanelEventPreviewUrl(event.external_id, baseUrl));
  };

  return (
    <Screen noTopInset noBottomInset>
      <ScreenHeader
        title="Eventos"
        subtitle="Gerencie a programação do seu bar."
        rightAction={
          <Button
            label="Novo evento"
            variant="solid"
            icon={<Icon name="plus" size={14} color="#0f0f0f" weight="bold" />}
            onPress={() => router.push('/(painel)/events/new')}
            className="px-3"
          />
        }
      />

      {isPending ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#1dd75e" />
          <Text className="font-body text-muted-foreground mt-3 text-sm">Carregando…</Text>
        </View>
      ) : allEvents.length === 0 ? (
        <EmptyState
          icon={<Icon name="calendar-blank" size={40} color="#737373" />}
          message="Nenhum evento por aqui ainda. Cadastre o primeiro e apareça no feed."
          actionLabel="Criar primeiro evento"
          onAction={() => router.push('/(painel)/events/new')}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={allEvents}
            keyExtractor={(item) => item.id}
            numColumns={isTablet ? 2 : 1}
            contentContainerStyle={listContentStyle(isTablet)}
            renderItem={({ item }) => {
              const startsAtMidnight =
                new Date(item.starts_at).getHours() === 0 &&
                new Date(item.starts_at).getMinutes() === 0;
              const isDraft = item.status === 'draft';

              return (
                <View className={isTablet ? 'p-2' : 'pb-4'}>
                  <Card className="overflow-hidden p-0">
                    <View className="relative h-36 w-full bg-surface">
                      <EventBanner url={item.banner_url} />
                      <View className="absolute top-3 right-3">
                        <Badge
                          label={item.status === 'published' ? 'Publicado' : 'Rascunho'}
                          variant={item.status === 'published' ? 'published' : 'draft'}
                        />
                      </View>
                    </View>

                    <View className="p-4">
                      <Text
                        numberOfLines={2}
                        className="font-heading text-foreground text-base font-bold"
                      >
                        {item.name}
                      </Text>

                      <View className="mt-1 flex-row flex-wrap items-center gap-2">
                        <Text className="font-body text-muted-foreground text-xs">
                          {formatEventDate(item.starts_at, !startsAtMidnight)}
                        </Text>
                        {item.recurrence_group_id ? (
                          <Badge label="Série" variant="accent" />
                        ) : null}
                      </View>

                      <View className="mt-4 flex-row items-center gap-2 border-t border-border/60 pt-3">
                        <Button
                          label="Editar"
                          variant="solid"
                          icon={<Icon name="pencil" size={14} color="#0f0f0f" />}
                          onPress={() => router.push(`/(painel)/events/${item.id}` as Href)}
                          className="flex-1 px-3"
                        />
                        <Button
                          variant="ghost"
                          disabled={isDraft}
                          icon={
                            <Icon
                              name="eye"
                              size={16}
                              color={isDraft ? '#737373' : '#fafafa'}
                            />
                          }
                          onPress={() => handleOpenPublicPage(item)}
                          className="h-11 min-h-0 w-11 p-0"
                        />
                        <Button
                          variant="ghost"
                          icon={<Icon name="trash-can" size={16} color="#f53d7a" />}
                          onPress={() => handleDeletePress(item)}
                          className="h-11 min-h-0 w-11 p-0"
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

      <ConfirmDialog
        visible={Boolean(deleteId)}
        title="Excluir evento?"
        message="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        busy={isDeleting}
        onConfirm={() => void handleConfirmSingleDelete()}
        onCancel={() => setDeleteId(null)}
      />

      <Modal
        visible={Boolean(pendingSeries)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingSeries(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPendingSeries(null)}>
          <View
            className="flex-1 items-center justify-center bg-black/60"
            style={{
              paddingTop: insets.top + BACKDROP_PADDING,
              paddingBottom: insets.bottom + BACKDROP_PADDING,
              paddingLeft: insets.left + BACKDROP_PADDING,
              paddingRight: insets.right + BACKDROP_PADDING,
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
                <Text className="font-heading text-foreground mb-2 text-lg font-bold">
                  Excluir evento da série
                </Text>
                <Text className="font-body text-muted-foreground mb-6 text-sm leading-[22px]">
                  &quot;{pendingSeries?.name}&quot; se repete. Escolha o que apagar — a ação não
                  pode ser desfeita.
                </Text>
                <View className="flex-col gap-2">
                  <Button
                    label="Apagar só esta ocorrência"
                    variant="destructive"
                    disabled={isDeleting}
                    onPress={handleDeleteOccurrence}
                  />
                  <Button
                    label="Apagar a série inteira a partir de hoje"
                    variant="destructive"
                    disabled={isDeleting}
                    onPress={handleDeleteEntireSeries}
                  />
                  <Button
                    label="Cancelar"
                    variant="ghost"
                    disabled={isDeleting}
                    onPress={() => setPendingSeries(null)}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}
