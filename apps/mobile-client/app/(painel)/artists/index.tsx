import {
  buildInstagramProfileUrl,
  buildWhatsAppUrl,
  formatInstagramHandle,
  type MusicianLeadSort,
  useMusicianLeads,
  useMusicStylesQuery,
} from '@agenda/core';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Screen,
  ScreenHeader,
  SelectField,
  Text,
  TextInput,
  useToast,
  View,
} from '@agenda/shared-ui-mobile';
import { FlashList } from '@shopify/flash-list';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';
import { listContentStyle } from '@/lib/screenLayout';

const DEBOUNCE_MS = 300;

export default function ArtistsListScreen() {
  const toast = useToast();
  const { isTablet } = useResponsive();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [region, setRegion] = useState('');
  const [debouncedRegion, setDebouncedRegion] = useState('');
  const [musicStyleId, setMusicStyleId] = useState('');
  const [sort, setSort] = useState<MusicianLeadSort>('recent');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRegion(region);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [region]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      region: debouncedRegion || undefined,
      musicStyleId: musicStyleId || undefined,
    }),
    [debouncedSearch, debouncedRegion, musicStyleId],
  );

  const { data: musicStyles = [] } = useMusicStylesQuery();
  const styleById = useMemo(() => new Map(musicStyles.map((s) => [s.id, s])), [musicStyles]);

  const styleOptions = [
    { value: '', label: 'Todos os estilos' },
    ...musicStyles.map((s) => ({
      value: s.id,
      label: s.name,
      emoji: s.emoji,
    })),
  ];

  const filterCellClassName = isTablet ? 'min-w-0 flex-1' : 'w-full';

  const sortOptions = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'name', label: 'Nome' },
    { value: 'region', label: 'Região' },
  ];

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useMusicianLeads(
    filters,
    sort,
  );
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  const handleOpenWhatsApp = (phone: string) => {
    const cleanNumber = phone.replace(/\D/g, '');
    const url = buildWhatsAppUrl(`55${cleanNumber}`);
    Linking.openURL(url).catch(() => {
      toast.show({ tone: 'error', message: 'Não foi possível abrir o WhatsApp.' });
    });
  };

  const handleOpenInstagram = (handle: string) => {
    const url = buildInstagramProfileUrl(handle);
    if (!url) return;
    Linking.openURL(url).catch(() => {
      toast.show({ tone: 'error', message: 'Não foi possível abrir o Instagram.' });
    });
  };

  return (
    <Screen noTopInset noBottomInset>
      <ScreenHeader title="Artistas" subtitle="Músicos que se cadastraram para tocar no seu bar." />

      <View
        className={`gap-3 pb-2 pt-4 ${isTablet ? 'flex-row px-8' : 'flex-col px-5'}`}
      >
        <View className={filterCellClassName}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome…"
            leftIcon={<Icon name="magnifying-glass" size={16} color="#737373" />}
          />
        </View>
        <View className={filterCellClassName}>
          <TextInput
            value={region}
            onChangeText={setRegion}
            placeholder="Buscar por região…"
            leftIcon={<Icon name="location-dot" size={16} color="#737373" />}
          />
        </View>
        <View className={filterCellClassName}>
          <SelectField
            value={musicStyleId}
            onValueChange={setMusicStyleId}
            options={styleOptions}
            searchable
            placeholder="Estilo musical"
          />
        </View>
        <View className={filterCellClassName}>
          <SelectField
            value={sort}
            onValueChange={(v) => setSort(v as MusicianLeadSort)}
            options={sortOptions}
            placeholder="Ordenar por"
          />
        </View>
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#1dd75e" />
          <Text className="font-body text-muted-foreground mt-3 text-sm">Carregando artistas…</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Icon name="microphone" size={40} color="#737373" />}
          message="Nenhum artista encontrado."
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={isTablet ? 2 : 1}
            contentContainerStyle={listContentStyle(isTablet)}
            renderItem={({ item }) => {
              const styles = (item.music_style_ids ?? [])
                .map((id) => styleById.get(id))
                .filter(Boolean);
              const instagramHandle = item.instagram ? formatInstagramHandle(item.instagram) : null;

              return (
                <View className={isTablet ? 'p-2' : 'pb-4'}>
                  <Card className="p-5">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={2}
                          className="font-heading text-foreground text-base font-bold"
                        >
                          {item.name}
                        </Text>
                        {item.region ? (
                          <View className="mt-1 flex-row items-center gap-1">
                            <Icon name="location-dot" size={12} color="#a6a6a6" />
                            <Text className="font-body text-muted-foreground min-w-0 flex-1 text-xs">
                              {item.region}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {item.price_range ? (
                        <Text className="font-body-bold text-primary text-sm font-semibold">
                          {item.price_range}
                        </Text>
                      ) : null}
                    </View>

                    {styles.length > 0 ? (
                      <View className="mt-3 flex-row flex-wrap gap-1.5">
                        {styles.map((style) => (
                          <Badge
                            key={style?.id}
                            label={`${style?.emoji ? `${style.emoji} ` : ''}${style?.name}`}
                            variant="muted"
                          />
                        ))}
                      </View>
                    ) : null}

                    <View className="mt-4 flex-row flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                      {item.phone ? (
                        <Button
                          label="WhatsApp"
                          variant="solid"
                          icon={<Icon name="whatsapp" size={16} color="#0f0f0f" />}
                          onPress={() => handleOpenWhatsApp(item.phone)}
                          className="min-w-[120px] flex-1 px-3"
                        />
                      ) : null}
                      {item.instagram && instagramHandle ? (
                        <Button
                          label={instagramHandle}
                          variant="outline"
                          icon={<Icon name="instagram" size={16} color="#fafafa" />}
                          onPress={() => handleOpenInstagram(item.instagram)}
                          className="min-w-[120px] flex-1 px-3"
                        />
                      ) : null}
                    </View>
                  </Card>
                </View>
              );
            }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#1dd75e" />
                </View>
              ) : null
            }
          />
        </View>
      )}
    </Screen>
  );
}
