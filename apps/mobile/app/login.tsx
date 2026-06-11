import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Apple, ArrowLeft, Info, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import brandLogo from '../assets/logo.png';
import { Button } from '../src/components/ui/Button';
import { CircleIconButton } from '../src/components/ui/CircleIconButton';
import {
  type AuthProvider,
  signInWithEmailOtp,
  signInWithProvider,
} from '../src/services/auth';
import { useAuthStore } from '../src/store/useAuthStore';
import { colors } from '../src/theme/colors';
import { gradientNight } from '../src/theme/gradients';
import { headingLetterSpacing } from '../src/theme/typography';
import { Image, Text, TextInput, View } from '../src/tw';

type EmailStep = 'hidden' | 'editing' | 'sent';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((state) => state.status);

  const [emailStep, setEmailStep] = useState<EmailStep>('hidden');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unavailable = status === 'unavailable';

  useEffect(() => {
    if (status === 'signedIn') {
      router.back();
    }
  }, [status, router]);

  const handleProvider = async (provider: AuthProvider) => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithProvider(provider);
    } catch {
      setErrorMessage('Não foi possível entrar agora. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (emailStep === 'hidden') {
      setEmailStep('editing');
      return;
    }
    if (!email.trim()) {
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setEmailStep('sent');
    } catch {
      setErrorMessage('Não foi possível enviar o link. Confira o e-mail e tente de novo.');
    } finally {
      setBusy(false);
    }
  };

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
            source={brandLogo}
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

          {unavailable ? (
            <View className="flex-row items-start gap-2.5 rounded-2xl border border-border bg-surface/80 p-4">
              <Info color={colors.accent} size={18} />
              <View className="flex-1 gap-1">
                <Text className="font-body-semibold text-[14px] text-foreground">
                  Login indisponível no momento
                </Text>
                <Text className="font-body text-[13px] leading-5 text-muted-foreground">
                  Estamos finalizando a configuração das contas. Você já pode explorar a
                  agenda normalmente — favoritar e avaliar liberam assim que o login
                  estiver no ar.
                </Text>
              </View>
            </View>
          ) : null}

          {errorMessage ? (
            <Text className="font-body text-[13px] text-destructive">{errorMessage}</Text>
          ) : null}

          <View className="gap-3">
            <Button
              label="Continuar com Google"
              variant="white"
              fullWidth
              disabled={unavailable || busy}
              onPress={() => handleProvider('google')}
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
              disabled={unavailable || busy}
              onPress={() => handleProvider('apple')}
              icon={<Apple color={colors.foreground} size={16} />}
            />
            {emailStep === 'editing' ? (
              <View className="gap-3">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="h-12 rounded-full border border-border bg-surface px-5 font-body text-[14px] text-foreground"
                  accessibilityLabel="Seu e-mail"
                />
                <Button
                  label={busy ? 'Enviando…' : 'Enviar link de acesso'}
                  fullWidth
                  disabled={unavailable || busy || !email.trim()}
                  onPress={handleEmail}
                  icon={<Mail color={colors.primaryForeground} size={16} />}
                />
              </View>
            ) : emailStep === 'sent' ? (
              <Text className="text-center font-body text-[13px] text-primary">
                Enviamos um link de acesso para {email.trim()}. Confira sua caixa de
                entrada.
              </Text>
            ) : (
              <Button
                label="Continuar com e-mail"
                variant="outline"
                fullWidth
                disabled={unavailable || busy}
                onPress={handleEmail}
                icon={<Mail color={colors.foreground} size={16} />}
              />
            )}
          </View>

          <Text className="text-center font-body text-[12px] text-muted-foreground">
            Ao continuar, você aceita os termos do Agenda de Boteco.
          </Text>
        </View>
      </View>
    </View>
  );
}
