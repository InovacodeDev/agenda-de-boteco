import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EstablishmentCard } from '../../components/establishment/EstablishmentCard';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { CITIES, ESTABLISHMENTS } from '../../data';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { ScrollView, Text, View } from '../../tw';

/** Web não suporta react-native-maps: lista dos bares da cidade */
export function MapScreen() {
  const insets = useSafeAreaInsets();
  const cityId = usePreferencesStore((state) => state.cityId);
  const city = CITIES.find((item) => item.id === cityId) ?? CITIES[0];
  const establishments = ESTABLISHMENTS.filter(
    (establishment) => establishment.city_id === city.id,
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScreenHeader title="Mapa" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
        <Text className="font-body text-[13px] text-muted-foreground">
          O mapa interativo está disponível no app. Bares em {city.name}:
        </Text>
        {establishments.map((establishment) => (
          <EstablishmentCard key={establishment.id} establishment={establishment} />
        ))}
      </ScrollView>
    </View>
  );
}
