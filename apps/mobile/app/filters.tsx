import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterSection } from '../src/components/filters/FilterSection';
import { FilterSlider } from '../src/components/filters/FilterSlider';
import { SwitchRow } from '../src/components/filters/SwitchRow';
import { Button } from '../src/components/ui/Button';
import { Chip } from '../src/components/ui/Chip';
import { GuardedPressable } from '../src/components/ui/GuardedPressable';
import { CITIES, MUSIC_STYLES } from '../src/data';
import { useFiltersStore } from '../src/store/useFiltersStore';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { colors } from '../src/theme/colors';
import { headingLetterSpacing } from '../src/theme/typography';
import { ScrollView, Text, View } from '../src/tw';
import type { DateBucket, EventFilters } from '../src/utils/filters';
import { DEFAULT_EVENT_FILTERS } from '../src/utils/filters';

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
    <View className="flex-1 bg-popover">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 p-5"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className="font-heading text-[20px] text-foreground"
            style={{ letterSpacing: headingLetterSpacing(20) }}
          >
            Filtros
          </Text>
          <GuardedPressable
            accessibilityRole="button"
            accessibilityLabel="Fechar filtros"
            onPress={() => router.back()}
            hitSlop={8}
            className="active:opacity-80"
          >
            <X color={colors.mutedForeground} size={20} />
          </GuardedPressable>
        </View>

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
            {CITIES.map((city) => (
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
            {MUSIC_STYLES.map((style) => (
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
        className="flex-row gap-3 border-t border-border bg-popover px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button label="Limpar" variant="outline" onPress={clear} className="flex-1" />
        <Button label="Aplicar filtros" onPress={apply} className="flex-1" />
      </View>
    </View>
  );
}
