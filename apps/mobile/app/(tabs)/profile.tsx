import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';

import { Screen } from '../../src/components/layout/Screen';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/theme/colors';
import { headingLetterSpacing } from '../../src/theme/typography';
import { Text, View } from '../../src/tw';

export default function ProfileScreen() {
  const router = useRouter();
  return (
    <Screen>
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
    </Screen>
  );
}
