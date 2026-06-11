import { useRouter } from 'expo-router';
import { LogOut, User } from 'lucide-react-native';

import { Screen } from '../../src/components/layout/Screen';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/useAuthStore';
import { colors } from '../../src/theme/colors';
import { headingLetterSpacing } from '../../src/theme/typography';
import { Text, View } from '../../src/tw';

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

  return (
    <View className="flex-1 gap-4 px-4 pt-4">
      <View className="flex-row items-center gap-3 rounded-2xl bg-card p-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <User color={colors.primary} size={24} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-body-semibold text-[16px] text-foreground" numberOfLines={1}>
            {user?.name ?? 'Sua conta'}
          </Text>
          {user?.email ? (
            <Text className="font-body text-[13px] text-muted-foreground" numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </View>
      </View>
      <Button
        label="Sair"
        variant="outline"
        fullWidth
        icon={<LogOut color={colors.foreground} size={16} />}
        onPress={() => signOut()}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const status = useAuthStore((state) => state.status);

  if (status === 'signedIn') {
    return (
      <Screen>
        <ScreenHeader title="Perfil" />
        <SignedInProfile />
      </Screen>
    );
  }

  return (
    <Screen>
      <SignedOutProfile />
    </Screen>
  );
}
