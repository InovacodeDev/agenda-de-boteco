import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { cityByIdOrDefault } from '@/data/lookup';
import { useCitiesQuery, useEstablishmentsQuery } from '@/hooks/queries';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { ScrollView, Text } from '@/tw';

/** Web não suporta react-native-maps: lista dos bares da cidade */
export function MapScreen() {
  const cityId = usePreferencesStore((state) => state.cityId);
  const { data: cities } = useCitiesQuery();
  const city = cityByIdOrDefault(cities ?? [], cityId);
  const { data: establishments } = useEstablishmentsQuery(city?.id);

  return (
    <Screen>
      <ScreenHeader title="Mapa" showLogo />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
        <Text className="font-body text-muted-foreground text-[13px]">
          O mapa interativo está disponível no app. Bares em {city?.name ?? '…'}:
        </Text>
        {(establishments ?? []).map((establishment) => (
          <EstablishmentCard key={establishment.id} establishment={establishment} />
        ))}
      </ScrollView>
    </Screen>
  );
}
