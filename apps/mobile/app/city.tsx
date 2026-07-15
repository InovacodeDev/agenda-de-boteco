import type { City } from '@agenda/core';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { useCitiesQuery } from '@/hooks/queries';
import { useUserLocation } from '@/hooks/useUserLocation';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { colors } from '@/theme/colors';
import { ScrollView, Text, View } from '@/tw';
import { resolveCityFromLocation } from '@/utils/geo';

export default function CityScreen() {
  const router = useRouter();
  const cityId = usePreferencesStore((state) => state.cityId);
  const setCity = usePreferencesStore((state) => state.setCity);
  const setCustomCity = usePreferencesStore((state) => state.setCustomCity);
  const { request, status } = useUserLocation();
  const { data: cities } = useCitiesQuery();

  const [currentCity, setCurrentCity] = useState<City | null>(null);

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

  const handleSelectCity = (cityObj: City, isVirtual: boolean) => {
    if (isVirtual) {
      setCustomCity(cityObj);
    } else {
      setCity(cityObj.id);
    }
    router.back();
  };

  const useMyLocation = async () => {
    const result = await request();
    if (!result) {
      return;
    }
    const { city, isCatalog } = resolveCityFromLocation(result.coords, result.geocode, cities ?? []);
    if (isCatalog) {
      setCity(city.id);
    } else {
      setCustomCity(city);
    }
    router.back();
  };

  return (
    <Screen header={<ScreenHeader title="Escolha sua cidade" showBack />}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
        <Button
          label={status === 'loading' ? 'Localizando…' : 'Usar minha localização'}
          variant="outline"
          fullWidth
          className="border-foreground/50"
          style={{ flex: 1, backgroundColor: colors.background, borderWidth: 0.5 }}
          icon={<Icon name="location-dot" color={colors.foreground} size={16} />}
          onPress={useMyLocation}
        />
        {status === 'denied' ? (
          <Text className="font-body text-muted-foreground text-center text-[12px]">
            Permissão de localização negada — escolha sua cidade abaixo.
          </Text>
        ) : null}
        <View className="gap-3">
          {currentCity ? (
            <GuardedPressable
              key={currentCity.id}
              accessibilityRole="button"
              accessibilityState={{ selected: currentCity.id === cityId }}
              onPress={() => handleSelectCity(currentCity, currentCity.id.startsWith('geo:'))}
              className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
            >
              <View>
                <Text className="font-body-semibold text-foreground text-[15px]">
                  {currentCity.name} (atual)
                </Text>
                <Text className="font-body text-muted-foreground text-[12px]">{currentCity.uf}</Text>
              </View>
              {currentCity.id === cityId ? <Icon name="check" color={colors.primary} size={18} /> : null}
            </GuardedPressable>
          ) : null}
          {(cities ?? [])
            .filter((c) => c.id !== currentCity?.id)
            .map((city) => {
              const selected = city.id === cityId;
              return (
                <GuardedPressable
                  key={city.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleSelectCity(city, false)}
                  className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
                >
                  <View>
                    <Text className="font-body-semibold text-foreground text-[15px]">
                      {city.name}
                    </Text>
                    <Text className="font-body text-muted-foreground text-[12px]">{city.uf}</Text>
                  </View>
                  {selected ? <Icon name="check" color={colors.primary} size={18} /> : null}
                </GuardedPressable>
              );
            })}
        </View>
      </ScrollView>
    </Screen>
  );
}
