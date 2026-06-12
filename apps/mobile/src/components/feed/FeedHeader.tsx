import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';

import brandLogo from '../../../assets/logo.png';
import type { City } from '../../data/schemas';
import { colors } from '../../theme/colors';
import { Image, Text, View } from '../../tw';
import { GuardedPressable } from '../ui/GuardedPressable';

export interface FeedHeaderProps {
  city: City;
}

/** Header do feed: logo à esquerda, chip de cidade à direita (→ /cidade) */
export function FeedHeader({ city }: FeedHeaderProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between">
      <Image
        source={brandLogo}
        className="h-10 w-10 rounded-lg"
        contentFit="cover"
        accessibilityLabel="Agenda de Boteco"
      />
      <GuardedPressable
        accessibilityRole="button"
        accessibilityLabel={`Cidade selecionada: ${city.name}, ${city.uf}`}
        onPress={() => router.push('/city')}
        className="h-9 flex-row items-center gap-1.5 rounded-full bg-surface-elevated px-3 active:opacity-80"
      >
        <MapPin color={colors.primary} size={14} />
        <Text className="font-body-semibold text-[13px] text-foreground">{city.name}</Text>
        <Text className="font-body text-[13px] text-muted-foreground">/{city.uf}</Text>
      </GuardedPressable>
    </View>
  );
}
