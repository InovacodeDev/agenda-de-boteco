import type { City } from '@agenda/core';
import { useCityDraftStore } from '@agenda/core';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateRangeField } from '@/components/filters/DateRangeField';
import { FilterSection } from '@/components/filters/FilterSection';
import { FilterSlider } from '@/components/filters/FilterSlider';
import { SwitchRow } from '@/components/filters/SwitchRow';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { useCitiesQuery, useMusicStylesQuery } from '@/hooks/queries';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useFiltersStore } from '@/store/useFiltersStore';
import { colors } from '@/theme/colors';
import { ScrollView, View } from '@/tw';
import { cn } from '@/utils/cn';
import type { DateBucket, EventFilters, SortBy } from '@/utils/filters';
import { DEFAULT_EVENT_FILTERS } from '@/utils/filters';
import { isVirtualCityId, resolveCityFromLocation } from '@/utils/geo';

const DATE_OPTIONS: Array<{ label: string; bucket: DateBucket }> = [
  { label: 'Qualquer dia', bucket: 'any' },
  { label: 'Hoje', bucket: 'today' },
  { label: 'Amanhã', bucket: 'tomorrow' },
  { label: 'Fim de semana', bucket: 'weekend' },
];

const SORT_OPTIONS: Array<{ label: string; value: SortBy }> = [
  { label: 'Data', value: 'date' },
  { label: 'Distância', value: 'distance' },
  { label: 'Avaliação', value: 'rating' },
  { label: 'Preço', value: 'price' },
];

const MAX_PRICE_LIMIT = 100;

export default function FiltersSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const storedFilters = useFiltersStore((state) => state.filters);
  const replaceFilters = useFiltersStore((state) => state.replaceFilters);
  const draftCityIds = useCityDraftStore((state) => state.draftCityIds);
  const setDraftCityIds = useCityDraftStore((state) => state.setDraftCityIds);
  const toggleDraftCity = useCityDraftStore((state) => state.toggleDraftCity);
  const { data: cities } = useCitiesQuery();
  const { data: musicStyles } = useMusicStylesQuery();

  // estado provisório: só aplica ao tocar "Aplicar filtros"
  const [draft, setDraft] = useState<EventFilters>(storedFilters);

  useEffect(() => {
    setDraftCityIds(storedFilters.cityIds);
    // seeda só na montagem — a partir daí o rascunho é a fonte de verdade
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll dynamics states
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const canScroll = contentHeight > scrollViewHeight;
  const isAtMin = scrollY <= 0;
  const isAtMax = canScroll && (scrollY + scrollViewHeight >= contentHeight - 1);

  const showHeaderDivider = !isAtMin;
  const showFooterDivider = !isAtMax;

  // Current location resolution
  const { request } = useUserLocation();
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const handleUseMyLocation = async () => {
    setResolvingLocation(true);
    try {
      const result = await request();
      if (result && cities) {
        const { city } = resolveCityFromLocation(result.coords, result.geocode, cities);
        queueMicrotask(() => {
          setCurrentCity(city);
          toggleDraftCity(city.id);
        });
      }
    } finally {
      queueMicrotask(() => {
        setResolvingLocation(false);
      });
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      const result = await request();
      if (result && cities) {
        const { city } = resolveCityFromLocation(result.coords, result.geocode, cities);
        queueMicrotask(() => {
          setCurrentCity(city);
        });
      }
    };
    fetchLocation();
  }, [request, cities]);

  const patch = (partial: Partial<EventFilters>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const toggleDraftStyle = (styleId: string) =>
    patch({
      styleIds: draft.styleIds.includes(styleId)
        ? draft.styleIds.filter((id) => id !== styleId)
        : [...draft.styleIds, styleId],
    });

  const clear = () => {
    setDraft(DEFAULT_EVENT_FILTERS);
    setDraftCityIds([]);
  };

  const apply = () => {
    replaceFilters({ ...draft, cityIds: draftCityIds });
    router.back();
  };

  return (
    <View className="bg-popover flex-1">
      {Platform.OS === 'ios' && <View className="h-2" />}
      <ScreenHeader
        title="Filtros"
        right={
          <GuardedPressable
            accessibilityRole="button"
            accessibilityLabel="Fechar filtros"
            onPress={() => router.back()}
            hitSlop={8}
            className="active:opacity-80"
          >
            <Icon name="xmark" color={colors.mutedForeground} size={20} />
          </GuardedPressable>
        }
      />
      {showHeaderDivider && <View className="border-border border-b" />}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 px-5 pb-5 pt-4"
        scrollEventThrottle={16}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          setScrollY(e.nativeEvent.contentOffset.y);
        }}
        onContentSizeChange={(_, height) => {
          setContentHeight(height);
        }}
        onLayout={(e) => {
          setScrollViewHeight(e.nativeEvent.layout.height);
        }}
      >
        <FilterSection title="Data">
          <View className="flex-row flex-wrap gap-2">
            {DATE_OPTIONS.map(({ label, bucket }) => (
              <Chip
                key={bucket}
                label={label}
                selected={!draft.dateRange && draft.dateBucket === bucket}
                onPress={() => patch({ dateBucket: bucket, dateRange: null })}
              />
            ))}
          </View>
          <DateRangeField
            value={draft.dateRange}
            onChange={(range) => patch({ dateRange: range, dateBucket: 'any' })}
          />
        </FilterSection>

        <FilterSection title="Ordenar por">
          <View className="flex-row flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={draft.sortBy === opt.value}
                onPress={() => patch({ sortBy: opt.value })}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Cidade">
          <View className="flex-row flex-wrap gap-2">
            {/* Cidade virtual (geolocalização fora do catálogo) não entra no multi
                — o recorte de cidadeIds é estrito de catálogo (feed vazio se marcada).
                Cai no chip "Minha localização" em vez de prometer um filtro que não filtra. */}
            {currentCity && !isVirtualCityId(currentCity.id) ? (
              <Chip
                key={currentCity.id}
                label={`${currentCity.name} (atual)`}
                selected={draftCityIds.includes(currentCity.id)}
                onPress={() => toggleDraftCity(currentCity.id)}
              />
            ) : (
              <Chip
                label={resolvingLocation ? 'Buscando...' : 'Minha localização'}
                selected={false}
                onPress={handleUseMyLocation}
              />
            )}
            {(cities ?? [])
              .filter((c) => c.id !== currentCity?.id)
              .slice(0, 5)
              .map((city) => (
                <Chip
                  key={city.id}
                  label={city.name}
                  selected={draftCityIds.includes(city.id)}
                  onPress={() => toggleDraftCity(city.id)}
                />
              ))}
            <Chip label="Buscar cidade" selected={false} onPress={() => router.push('/city-search')} />
          </View>
        </FilterSection>

        <FilterSection title="Distância" trailing={`${draft.maxDistanceKm} km`}>
          <FilterSlider
            value={draft.maxDistanceKm}
            minimumValue={1}
            maximumValue={50}
            onValueChange={(value) => patch({ maxDistanceKm: value })}
          />
        </FilterSection>

        <FilterSection title="Estilo musical">
          <View className="flex-row flex-wrap gap-2">
            {(musicStyles ?? []).map((style) => (
              <Chip
                key={style.id}
                label={`${style.emoji} ${style.name}`}
                selected={draft.styleIds.includes(style.id)}
                onPress={() => toggleDraftStyle(style.id)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Avaliação mínima" trailing={`${draft.minRating} ★`}>
          <FilterSlider
            value={draft.minRating}
            minimumValue={0}
            maximumValue={5}
            step={0.5}
            onValueChange={(value) => patch({ minRating: value })}
          />
        </FilterSection>

        <FilterSection
          title="Preço máximo"
          trailing={draft.maxPrice === null ? 'Sem limite' : `R$ ${draft.maxPrice}`}
        >
          <FilterSlider
            value={draft.maxPrice ?? MAX_PRICE_LIMIT}
            minimumValue={0}
            maximumValue={MAX_PRICE_LIMIT}
            step={5}
            onValueChange={(value) => patch({ maxPrice: value >= MAX_PRICE_LIMIT ? null : value })}
          />
        </FilterSection>

        <SwitchRow
          title="Aberto agora"
          subtitle="Apenas estabelecimentos abertos"
          value={draft.openNow}
          onValueChange={(value) => patch({ openNow: value })}
        />
      </ScrollView>

      <View
        className={cn(
          'bg-popover flex-row gap-3 px-5 pt-4 pb-4',
          showFooterDivider && 'border-border border-t',
        )}
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label="Limpar"
          variant="outline"
          onPress={clear}
          className="border-foreground/50 flex-1 border-[0.5px]"
          style={{ backgroundColor: colors.background }}
        />
        <Button
          label="Aplicar filtros"
          onPress={apply}
          className="flex-1"
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    </View>
  );
}
