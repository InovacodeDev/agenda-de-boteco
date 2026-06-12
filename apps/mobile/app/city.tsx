import { useRouter } from 'expo-router';
import { Check, MapPin } from 'lucide-react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { CITIES } from '@/data';
import { useUserLocation } from '@/hooks/useUserLocation';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { colors } from '@/theme/colors';
import { ScrollView, Text, View } from '@/tw';
import { nearestCity } from '@/utils/geo';

export default function CityScreen() {
  const router = useRouter();
  const cityId = usePreferencesStore((state) => state.cityId);
  const setCity = usePreferencesStore((state) => state.setCity);
  const { request, status } = useUserLocation();

  const selectCity = (id: string) => {
    setCity(id);
    router.back();
  };

  const useMyLocation = async () => {
    const coords = await request();
    if (coords) {
      selectCity(nearestCity(coords, CITIES).id);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Escolha sua cidade" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
        <Button
          label={status === 'loading' ? 'Localizando…' : 'Usar minha localização'}
          variant="outline"
          fullWidth
          className="border-foreground/50"
          style={{ flex: 1, backgroundColor: colors.background, borderWidth: 0.5 }}
          icon={<MapPin color={colors.foreground} size={16} />}
          onPress={useMyLocation}
        />
        {status === 'denied' ? (
          <Text className="font-body text-muted-foreground text-center text-[12px]">
            Permissão de localização negada — escolha sua cidade abaixo.
          </Text>
        ) : null}
        <View className="gap-3">
          {CITIES.map((city) => {
            const selected = city.id === cityId;
            return (
              <GuardedPressable
                key={city.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => selectCity(city.id)}
                className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
              >
                <View>
                  <Text className="font-body-semibold text-foreground text-[15px]">
                    {city.name}
                  </Text>
                  <Text className="font-body text-muted-foreground text-[12px]">{city.uf}</Text>
                </View>
                {selected ? <Check color={colors.primary} size={18} /> : null}
              </GuardedPressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
