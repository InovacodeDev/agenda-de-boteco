import { useRouter } from 'expo-router';
import { ChevronRight, Heart, LogOut, MapPin, User } from 'lucide-react-native';

import { Screen } from '../../src/components/layout/Screen';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Button } from '../../src/components/ui/Button';
import { CITIES } from '../../src/data';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useFavoritesStore } from '../../src/store/useFavoritesStore';
import { usePreferencesStore } from '../../src/store/usePreferencesStore';
import { colors } from '../../src/theme/colors';
import { headingLetterSpacing } from '../../src/theme/typography';
import { Pressable, Text, View } from '../../src/tw';

function SignedOutProfile() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center gap-4 px-8 pt-16">
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
        <User color={colors.mutedForeground} size={28} />
      </View>
      <View className="items-center gap-2">
        <Text
          className="font-heading text-[20px] text-foreground"
          style={{ letterSpacing: headingLetterSpacing(20) }}
        >
          Entre na sua conta
        </Text>
        <Text className="text-center font-body text-[14px] text-muted-foreground">
          Para favoritar, avaliar e receber avisos dos bares que você ama.
        </Text>
      </View>
      <Button
        label="Entrar"
        fullWidth
        onPress={() => router.push('/login')}
        className="mt-2"
      />
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
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];

  const name = user?.name || 'Você';
  const email = user?.email || '';
  const firstLetter = name[0].toUpperCase();

  return (
    <View className="flex-1 gap-6 px-4 pt-4">
      <View className="flex-row items-center gap-4 rounded-2xl bg-card p-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <Text className="font-heading text-[28px] text-primary">{firstLetter}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-body-semibold text-[18px] text-foreground" numberOfLines={1}>
            {name}
          </Text>
          {email ? (
            <Text className="font-body text-[13px] text-muted-foreground" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 items-center justify-center rounded-2xl bg-card p-4 gap-1">
          <Text className="font-heading text-[20px] text-foreground">{totalFavorites}</Text>
          <Text className="font-body text-[12px] text-muted-foreground">Favoritos</Text>
        </View>
        <View className="flex-1 items-center justify-center rounded-2xl bg-card p-4 gap-1">
          <Text className="font-heading text-[20px] text-foreground" numberOfLines={1}>{city.name}</Text>
          <Text className="font-body text-[12px] text-muted-foreground">Cidade</Text>
        </View>
        <View className="flex-1 items-center justify-center rounded-2xl bg-card p-4 gap-1">
          <Text className="font-heading text-[20px] text-foreground">0</Text>
          <Text className="font-body text-[12px] text-muted-foreground">Reviews</Text>
        </View>
      </View>

      <View className="rounded-2xl bg-card overflow-hidden">
        <Pressable
          onPress={() => router.push('/favorites')}
          className="flex-row items-center justify-between px-4 py-4 border-b border-border active:bg-surface/50"
        >
          <View className="flex-row items-center gap-3">
            <Heart color={colors.primary} size={18} />
            <Text className="font-body-medium text-[15px] text-foreground">Meus favoritos</Text>
          </View>
          <ChevronRight color={colors.mutedForeground} size={16} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/city')}
          className="flex-row items-center justify-between px-4 py-4 active:bg-surface/50"
        >
          <View className="flex-row items-center gap-3">
            <MapPin color={colors.primary} size={18} />
            <Text className="font-body-medium text-[15px] text-foreground">Mudar cidade</Text>
          </View>
          <ChevronRight color={colors.mutedForeground} size={16} />
        </Pressable>
      </View>

      <View className="flex-1" />

      <Pressable
        onPress={() => signOut()}
        className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-transparent active:bg-destructive/10 mb-4"
      >
        <LogOut color={colors.destructive} size={16} />
        <Text className="font-body-semibold text-[15px] text-destructive">
          Sair
        </Text>
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
