import { useRouter } from 'expo-router';
import { ChevronRight, Heart, LogOut, MapPin, User } from 'lucide-react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { cityByIdOrDefault } from '@/data/lookup';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { colors } from '@/theme/colors';
import { headingLetterSpacing } from '@/theme/typography';
import { Pressable, Text, View } from '@/tw';

function SignedOutProfile() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center gap-4 px-8 pt-16">
      <View className="bg-surface-elevated h-16 w-16 items-center justify-center rounded-2xl">
        <User color={colors.mutedForeground} size={28} />
      </View>
      <View className="items-center gap-2">
        <Text
          className="font-heading text-foreground text-[20px]"
          style={{ letterSpacing: headingLetterSpacing(20) }}
        >
          Entre na sua conta
        </Text>
        <Text className="font-body text-muted-foreground text-center text-[14px]">
          Para favoritar, avaliar e receber avisos dos bares que você ama.
        </Text>
      </View>
      <Button label="Entrar" fullWidth onPress={() => router.push('/login')} className="mt-2" />
    </View>
  );
}

function SignedInProfile() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();

  const eventIds = useFavoritesStore((state) => state.eventIds);
  const establishmentIds = useFavoritesStore((state) => state.establishmentIds);
  const totalFavorites = eventIds.length + establishmentIds.length;

  const cityId = usePreferencesStore((state) => state.cityId);
  const city = cityByIdOrDefault(cityId);

  const name = user?.name || 'Você';
  const email = user?.email || '';
  const firstLetter = name[0].toUpperCase();

  return (
    <View className="flex-1 gap-6 px-4 pt-4">
      <View className="bg-card flex-row items-center gap-4 rounded-2xl p-4">
        <View className="bg-primary/10 border-primary/20 h-16 w-16 items-center justify-center rounded-full border">
          <Text className="font-heading text-primary text-[28px]">{firstLetter}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-body-semibold text-foreground text-[18px]" numberOfLines={1}>
            {name}
          </Text>
          {email ? (
            <Text className="font-body text-muted-foreground text-[13px]" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="bg-card flex-1 items-center justify-center gap-1 rounded-2xl p-4">
          <Text className="font-heading text-foreground text-[20px]">{totalFavorites}</Text>
          <Text className="font-body text-muted-foreground text-[12px]">Favoritos</Text>
        </View>
        <View className="bg-card flex-1 items-center justify-center gap-1 rounded-2xl p-4">
          <Text className="font-heading text-foreground text-[20px]" numberOfLines={1}>
            {city.name}
          </Text>
          <Text className="font-body text-muted-foreground text-[12px]">Cidade</Text>
        </View>
        <View className="bg-card flex-1 items-center justify-center gap-1 rounded-2xl p-4">
          <Text className="font-heading text-foreground text-[20px]">0</Text>
          <Text className="font-body text-muted-foreground text-[12px]">Reviews</Text>
        </View>
      </View>

      <View className="bg-card overflow-hidden rounded-2xl">
        <Pressable
          onPress={() => router.push('/favorites')}
          className="border-border active:bg-surface/50 flex-row items-center justify-between border-b px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <Heart color={colors.primary} size={18} />
            <Text className="font-body-medium text-foreground text-[15px]">Meus favoritos</Text>
          </View>
          <ChevronRight color={colors.mutedForeground} size={16} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/city')}
          className="active:bg-surface/50 flex-row items-center justify-between px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <MapPin color={colors.primary} size={18} />
            <Text className="font-body-medium text-foreground text-[15px]">Mudar cidade</Text>
          </View>
          <ChevronRight color={colors.mutedForeground} size={16} />
        </Pressable>
      </View>

      <View className="flex-1" />

      <Pressable
        onPress={() => signOut()}
        className="border-destructive/20 active:bg-destructive/10 mb-4 h-12 w-full flex-row items-center justify-center gap-2 rounded-xl border bg-transparent"
      >
        <LogOut color={colors.destructive} size={16} />
        <Text className="font-body-semibold text-destructive text-[15px]">Sair</Text>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const status = useAuthStore((state) => state.status);

  return (
    <Screen>
      <ScreenHeader title="Perfil" showLogo />
      {status === 'signedIn' ? <SignedInProfile /> : <SignedOutProfile />}
    </Screen>
  );
}
