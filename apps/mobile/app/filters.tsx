import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterSection } from '@/components/filters/FilterSection';
import { FilterSlider } from '@/components/filters/FilterSlider';
import { SwitchRow } from '@/components/filters/SwitchRow';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { useCitiesQuery, useMusicStylesQuery } from '@/hooks/queries';
import { useFiltersStore } from '@/store/useFiltersStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { colors } from '@/theme/colors';
import { ScrollView, View } from '@/tw';
import type { DateBucket, EventFilters } from '@/utils/filters';
import { DEFAULT_EVENT_FILTERS } from '@/utils/filters';

const DATE_OPTIONS: Array<{ label: string; bucket: DateBucket }> = [
  { label: 'Qualquer dia', bucket: 'any' },
  { label: 'Hoje', bucket: 'today' },
  { label: 'Amanhã', bucket: 'tomorrow' },
  { label: 'Fim de semana', bucket: 'weekend' },
];

const MAX_PRICE_LIMIT = 100;

export default function FiltersSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const storedFilters = useFiltersStore((state) => state.filters);
  const replaceFilters = useFiltersStore((state) => state.replaceFilters);
  const cityId = usePreferencesStore((state) => state.cityId);
  const setCity = usePreferencesStore((state) => state.setCity);
  const { data: cities } = useCitiesQuery();
  const { data: musicStyles } = useMusicStylesQuery();

  // estado provisório: só aplica ao tocar "Aplicar filtros"
  const [draft, setDraft] = useState<EventFilters>(storedFilters);
  const [draftCityId, setDraftCityId] = useState(cityId);

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
  };

  const apply = () => {
    replaceFilters(draft);
    setCity(draftCityId);
    router.back();
  };

  return (
    <View className="bg-popover flex-1">
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
            <X color={colors.mutedForeground} size={20} />
          </GuardedPressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 px-5 pb-5">
        <FilterSection title="Data">
          <View className="flex-row flex-wrap gap-2">
            {DATE_OPTIONS.map(({ label, bucket }) => (
              <Chip
                key={bucket}
                label={label}
                selected={draft.dateBucket === bucket}
                onPress={() => patch({ dateBucket: bucket })}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Cidade">
          <View className="flex-row flex-wrap gap-2">
            {(cities ?? []).map((city) => (
              <Chip
                key={city.id}
                label={city.name}
                selected={draftCityId === city.id}
                onPress={() => setDraftCityId(city.id)}
              />
            ))}
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
        className="border-border bg-popover flex-row gap-3 border-t px-5 pt-4"
        style={{ flex: 1, paddingBottom: insets.bottom + 32 }}
      >
        <Button
          label="Limpar"
          variant="outline"
          onPress={clear}
          className="border-foreground/50 flex-1 border-[0.5px]"
          style={{ backgroundColor: colors.background }}
        />
        <Button label="Aplicar filtros" onPress={apply} className="flex-1" />
      </View>
    </View>
  );
}
