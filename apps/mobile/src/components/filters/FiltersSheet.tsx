import type { City, EstablishmentAttribute } from '@agenda/core';
import { useEffect, useState } from 'react';
import { Modal, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttributeSearchModal } from '@/components/filters/AttributeSearchModal';
import { CitySearchModal } from '@/components/filters/CitySearchModal';
import { DateRangeField } from '@/components/filters/DateRangeField';
import { FilterSection } from '@/components/filters/FilterSection';
import { FilterSlider } from '@/components/filters/FilterSlider';
import { SwitchRow } from '@/components/filters/SwitchRow';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { QUICK_ATTRIBUTE_METAS } from '@/data/lookup';
import { useCitiesQuery, useMusicStylesQuery } from '@/hooks/queries';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useFiltersStore } from '@/store/useFiltersStore';
import { colors } from '@/theme/colors';
import { ScrollView, Text, View } from '@/tw';
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

export interface FiltersSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function FiltersSheet({ visible, onClose }: FiltersSheetProps) {
  const insets = useSafeAreaInsets();

  const storedFilters = useFiltersStore((state) => state.filters);
  const replaceFilters = useFiltersStore((state) => state.replaceFilters);
  const { data: cities } = useCitiesQuery();
  const { data: musicStyles } = useMusicStylesQuery();

  // estado provisório: só aplica ao tocar "Aplicar filtros"
  const [draft, setDraft] = useState<EventFilters>(storedFilters);
  const [draftCityIds, setDraftCityIds] = useState<string[]>(storedFilters.cityIds);
  const [draftAttributeIds, setDraftAttributeIds] = useState<EstablishmentAttribute[]>(
    storedFilters.attributeIds,
  );
  const [isCitySearchOpen, setIsCitySearchOpen] = useState(false);
  const [isAttributeSearchOpen, setIsAttributeSearchOpen] = useState(false);

  // Re-semeia o rascunho na transição fechado → aberto (adjusting state during
  // render, conforme a doc do React — evita efeito em cascata).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(storedFilters);
      setDraftCityIds(storedFilters.cityIds);
      setDraftAttributeIds(storedFilters.attributeIds);
    }
  }

  const toggleDraftCity = (id: string) =>
    setDraftCityIds((current) =>
      current.includes(id) ? current.filter((cityId) => cityId !== id) : [...current, id],
    );

  const toggleDraftAttribute = (id: EstablishmentAttribute) =>
    setDraftAttributeIds((current) =>
      current.includes(id) ? current.filter((attrId) => attrId !== id) : [...current, id],
    );

  // Scroll dynamics states
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const canScroll = contentHeight > scrollViewHeight;
  const isAtMin = scrollY <= 0;
  const isAtMax = canScroll && scrollY + scrollViewHeight >= contentHeight - 1;

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
          // seleção explícita, não toggle: o gesto é "usar minha localização",
          // que nunca deve desmarcar a cidade recém-resolvida.
          if (!isVirtualCityId(city.id)) {
            setDraftCityIds((current) =>
              current.includes(city.id) ? current : [...current, city.id],
            );
          }
        });
      }
    } finally {
      queueMicrotask(() => {
        setResolvingLocation(false);
      });
    }
  };

  // Só resolve a localização enquanto o sheet está aberto: como o componente
  // vive montado no feed, disparar na montagem pediria permissão de GPS antes
  // de o usuário abrir os filtros.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const fetchLocation = async () => {
      const result = await request();
      if (cancelled || !result || !cities) return;
      const { city } = resolveCityFromLocation(result.coords, result.geocode, cities);
      queueMicrotask(() => {
        if (!cancelled) setCurrentCity(city);
      });
    };
    fetchLocation();
    return () => {
      cancelled = true;
    };
  }, [visible, request, cities]);

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
    setDraftAttributeIds([]);
  };

  const apply = () => {
    replaceFilters({ ...draft, cityIds: draftCityIds, attributeIds: draftAttributeIds });
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible && !isCitySearchOpen && !isAttributeSearchOpen}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <GuardedPressable
            accessibilityRole="button"
            accessibilityLabel="Fechar filtros"
            onPress={onClose}
            className="flex-1"
          />
          <View className="bg-popover h-[92%] overflow-hidden rounded-t-3xl">
            <View className="items-center pt-2.5 pb-1">
              <View className="bg-muted-foreground/40 h-1 w-9 rounded-full" />
            </View>
            <ScreenHeader
              title="Filtros"
              right={
                <GuardedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar filtros"
                  onPress={onClose}
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
                  <Chip
                    label={
                      draftCityIds.length > 0
                        ? `Buscar cidade (${draftCityIds.length})`
                        : 'Buscar cidade'
                    }
                    selected={draftCityIds.length > 0}
                    onPress={() => setIsCitySearchOpen(true)}
                  />
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

              <FilterSection title="Diferenciais">
                {/* Legenda dentro da seção (e não como prop do FilterSection): o
                    filtro é E, não OU, e sem hover no mobile o aviso precisa
                    estar sempre visível. */}
                <View className="flex-row items-center gap-1.5">
                  <Icon name="circle-info" color={colors.mutedForeground} size={12} />
                  <Text className="font-body text-muted-foreground flex-1 text-[11px]">
                    Mostra apenas bares com todos os selecionados
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {QUICK_ATTRIBUTE_METAS.map((meta) => (
                    <Chip
                      key={meta.id}
                      label={meta.label}
                      selected={draftAttributeIds.includes(meta.id)}
                      onPress={() => toggleDraftAttribute(meta.id)}
                    />
                  ))}
                  <Chip
                    label={
                      draftAttributeIds.length > 0
                        ? `Buscar diferencial (${draftAttributeIds.length})`
                        : 'Buscar diferencial'
                    }
                    selected={draftAttributeIds.length > 0}
                    onPress={() => setIsAttributeSearchOpen(true)}
                  />
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
                  onValueChange={(value) =>
                    patch({ maxPrice: value >= MAX_PRICE_LIMIT ? null : value })
                  }
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
        </View>
      </Modal>
      {/* Irmão do sheet, não aninhado: Modal dentro de Modal é instável no
          Android. E os dois nunca ficam visíveis juntos — dois Modal abertos
          disputam o Dialog nativo no Android (toques no de cima são engolidos)
          e a apresentação empilhada no iOS rouba o foco do TextInput. */}
      <CitySearchModal
        visible={isCitySearchOpen}
        initialSelected={draftCityIds}
        onClose={() => setIsCitySearchOpen(false)}
        onConfirm={(ids) => {
          setDraftCityIds(ids);
          setIsCitySearchOpen(false);
        }}
      />
      {/* Mesmas regras do CitySearchModal: irmão do sheet, nunca aninhado, e os
          dois nunca visíveis ao mesmo tempo. */}
      <AttributeSearchModal
        visible={isAttributeSearchOpen}
        initialSelected={draftAttributeIds}
        onClose={() => setIsAttributeSearchOpen(false)}
        onConfirm={(ids) => {
          setDraftAttributeIds(ids);
          setIsAttributeSearchOpen(false);
        }}
      />
    </>
  );
}
