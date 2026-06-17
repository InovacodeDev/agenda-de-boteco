import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useEstablishmentsQuery } from '@/hooks/queries';
import { useActiveCity } from '@/hooks/useActiveCity';
import { ScrollView, Text } from '@/tw';

/** Web não suporta react-native-maps: lista dos bares da cidade */
export function MapScreen() {
  const city = useActiveCity();
  const { data: establishments } = useEstablishmentsQuery(city?.id);

  return (
    <Screen header={<ScreenHeader title="Mapa" showLogo />}>
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
