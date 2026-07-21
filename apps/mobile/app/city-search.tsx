import type { City } from '@agenda/core';
import { useCityDraftStore } from '@agenda/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { useCitiesQuery } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import { ScrollView, Text, TextInput, View } from '@/tw';
import { normalizeText } from '@/utils/filters';

export default function CitySearchSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cities } = useCitiesQuery();
  const draftCityIds = useCityDraftStore((state) => state.draftCityIds);
  const setDraftCityIds = useCityDraftStore((state) => state.setDraftCityIds);

  const [selected, setSelected] = useState<string[]>(draftCityIds);
  const [query, setQuery] = useState('');

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    const list = cities ?? [];
    if (!q) return list;
    return list.filter((c) => normalizeText(c.name).includes(q));
  }, [cities, query]);

  const confirm = () => {
    setDraftCityIds(selected);
    router.back();
  };

  return (
    <View className="bg-popover flex-1">
      <ScreenHeader
        title="Buscar cidade"
        right={
          <GuardedPressable
            accessibilityRole="button"
            accessibilityLabel="Fechar busca de cidade"
            onPress={() => router.back()}
            hitSlop={8}
            className="active:opacity-80"
          >
            <Icon name="xmark" color={colors.mutedForeground} size={20} />
          </GuardedPressable>
        }
      />
      <View className="px-5 pt-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Digite o nome da cidade"
          placeholderTextColor={colors.mutedForeground}
          autoFocus
          className="bg-card text-foreground font-body h-12 rounded-2xl px-4 text-[14px]"
        />
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-3 px-5 pb-5 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {results.map((city: City) => {
          const isSelected = selected.includes(city.id);
          return (
            <GuardedPressable
              key={city.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => toggle(city.id)}
              className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
            >
              <View>
                <Text className="font-body-semibold text-foreground text-[15px]">{city.name}</Text>
                <Text className="font-body text-muted-foreground text-[12px]">{city.uf}</Text>
              </View>
              {isSelected ? <Icon name="check" color={colors.primary} size={18} /> : null}
            </GuardedPressable>
          );
        })}
        {results.length === 0 ? (
          <Text className="font-body text-muted-foreground text-center text-[13px]">
            Nenhuma cidade encontrada.
          </Text>
        ) : null}
      </ScrollView>
      <View className="bg-popover px-5 pt-4 pb-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button label="Confirmar" onPress={confirm} fullWidth style={{ backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}
