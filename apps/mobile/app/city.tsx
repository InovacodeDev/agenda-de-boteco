import { useRouter } from 'expo-router';
import { Check, MapPin } from 'lucide-react-native';

import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { Button } from '../src/components/ui/Button';
import { CITIES } from '../src/data';
import { useUserLocation } from '../src/hooks/useUserLocation';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { colors } from '../src/theme/colors';
import { Pressable, ScrollView, Text, View } from '../src/tw';
import { nearestCity } from '../src/utils/geo';

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
          icon={<MapPin color={colors.foreground} size={16} />}
          onPress={useMyLocation}
        />
        {status === 'denied' ? (
          <Text className="text-center font-body text-[12px] text-muted-foreground">
            Permissão de localização negada — escolha sua cidade abaixo.
          </Text>
        ) : null}
        <View className="gap-3">
          {CITIES.map((city) => {
            const selected = city.id === cityId;
            return (
              <Pressable
                key={city.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => selectCity(city.id)}
                className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-3.5 active:opacity-80"
              >
                <View>
                  <Text className="font-body-semibold text-[15px] text-foreground">
                    {city.name}
                  </Text>
                  <Text className="font-body text-[12px] text-muted-foreground">{city.uf}</Text>
                </View>
                {selected ? <Check color={colors.primary} size={18} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
