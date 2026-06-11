import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Apple, ArrowLeft, Mail } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import appIcon from '../assets/icon.png';
import { Button } from '../src/components/ui/Button';
import { CircleIconButton } from '../src/components/ui/CircleIconButton';
import { colors } from '../src/theme/colors';
import { gradientNight } from '../src/theme/gradients';
import { headingLetterSpacing } from '../src/theme/typography';
import { Image, Text, View } from '../src/tw';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <LinearGradient {...gradientNight} style={StyleSheet.absoluteFill} />
      <View
        className="flex-1 justify-between p-6"
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
      >
        <CircleIconButton
          accessibilityLabel="Voltar"
          icon={<ArrowLeft color={colors.foreground} size={20} />}
          onPress={() => router.back()}
          className="bg-surface"
        />

        <View className="gap-5">
          <Image
            source={appIcon}
            className="h-16 w-16 rounded-xl"
            contentFit="cover"
            accessibilityLabel="Agenda de Boteco"
          />
          <View className="gap-2">
            <Text
              className="font-heading text-[26px] text-foreground"
              style={{ letterSpacing: headingLetterSpacing(26) }}
            >
              Entre para curtir mais
            </Text>
            <Text className="font-body text-[14px] leading-5 text-muted-foreground">
              Salve favoritos, avalie bares e receba avisos dos seus lugares favoritos.
            </Text>
          </View>

          <View className="gap-3">
            <Button
              label="Continuar com Google"
              variant="white"
              fullWidth
              icon={
                <Text className="font-body-bold text-[15px] text-primary-foreground">
                  G
                </Text>
              }
            />
            <Button
              label="Continuar com Apple"
              variant="outline"
              fullWidth
              icon={<Apple color={colors.foreground} size={16} />}
            />
            <Button
              label="Continuar com e-mail"
              variant="outline"
              fullWidth
              icon={<Mail color={colors.foreground} size={16} />}
            />
          </View>

          <Text className="text-center font-body text-[12px] text-muted-foreground">
            Ao continuar, você aceita os termos do Agenda de Boteco.
          </Text>
        </View>
      </View>
    </View>
  );
}
