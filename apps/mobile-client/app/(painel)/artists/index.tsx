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
  View,
} from '@agenda/shared-ui-mobile';
import { FlashList } from '@shopify/flash-list';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

const DEBOUNCE_MS = 300;

export default function ArtistsListScreen() {
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

  const sortOptions = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'name', label: 'Nome do artista' },
    { value: 'region', label: 'Região / Bairro' },
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
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  const handleOpenInstagram = (handle: string) => {
    const url = buildInstagramProfileUrl(handle);
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    });
  };

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Banco de Artistas"
        subtitle="Músicos interessados em tocar no seu bar"
      />

      <View className="p-4 pb-2 flex-col gap-3">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nome…"
              leftIcon={<Icon name="magnifying-glass" size={16} color="#737373" />}
            />
          </View>
          <View className="flex-1">
            <TextInput
              value={region}
              onChangeText={setRegion}
              placeholder="Buscar por região…"
              leftIcon={<Icon name="location-dot" size={16} color="#737373" />}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <SelectField
              value={musicStyleId}
              onValueChange={setMusicStyleId}
              options={styleOptions}
              searchable
              placeholder="Estilo musical"
            />
          </View>
          <View className="flex-1">
            <SelectField
              value={sort}
              onValueChange={(v) => setSort(v as MusicianLeadSort)}
              options={sortOptions}
              placeholder="Ordenar por"
            />
          </View>
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
          title="Nenhum músico encontrado"
          message="Tente ajustar os filtros ou termos da busca para encontrar novos talentos."
        />
      ) : (
        <View className="flex-1 px-4">
          <FlashList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={isTablet ? 2 : 1}
            renderItem={({ item }) => {
              const styles = (item.music_style_ids ?? [])
                .map((id) => styleById.get(id))
                .filter(Boolean);
              const instagramHandle = item.instagram ? formatInstagramHandle(item.instagram) : null;

              return (
                <View className={isTablet ? 'p-2' : 'pb-4'}>
                  <Card className="p-5">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-heading text-foreground text-base font-bold">
                          {item.name}
                        </Text>
                        {item.region ? (
                          <View className="mt-1 flex-row items-center gap-1">
                            <Icon name="location-dot" size={12} color="#a6a6a6" />
                            <Text className="font-body text-muted-foreground text-xs">
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

                    <View className="mt-4 flex-row items-center gap-2 border-t border-border/60 pt-3">
                      {item.phone ? (
                        <Button
                          label="WhatsApp"
                          variant="solid"
                          icon={<Icon name="whatsapp" size={16} color="#0f0f0f" />}
                          onPress={() => handleOpenWhatsApp(item.phone)}
                          className="h-9 flex-1 px-3 text-xs"
                        />
                      ) : null}
                      {item.instagram && instagramHandle ? (
                        <Button
                          label={instagramHandle}
                          variant="outline"
                          icon={<Icon name="instagram" size={16} color="#fafafa" />}
                          onPress={() => handleOpenInstagram(item.instagram)}
                          className="h-9 flex-1 px-3 text-xs"
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
