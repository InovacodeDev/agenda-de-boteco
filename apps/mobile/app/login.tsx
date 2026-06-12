import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Apple, Info, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform,StyleSheet } from 'react-native';

import brandLogo from '../assets/logo.png';
import { Screen } from '../src/components/layout/Screen';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { Button } from '../src/components/ui/Button';
import {
  type AuthProvider,
  signInWithEmailOtp,
  signInWithProvider,
  verifyEmailOtp,
} from '../src/services/auth';
import { useAuthStore } from '../src/store/useAuthStore';
import { colors } from '../src/theme/colors';
import { gradientNight } from '../src/theme/gradients';
import { headingLetterSpacing } from '../src/theme/typography';
import { Image, KeyboardAvoidingView, ScrollView,Text, TextInput, View } from '../src/tw';

type EmailStep = 'hidden' | 'editing' | 'sent';

export default function LoginScreen() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [emailStep, setEmailStep] = useState<EmailStep>('hidden');
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerifyOtp = async () => {
    if (!otpToken.trim() || otpToken.length !== 6) {
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      await verifyEmailOtp(email.trim(), otpToken.trim());
    } catch {
      setErrorMessage('Código inválido ou expirado. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

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
    <Screen background={<LinearGradient {...gradientNight} style={StyleSheet.absoluteFill} />}>
      <ScreenHeader showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="grow justify-end p-6"
          keyboardShouldPersistTaps="handled"
        >
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
                    className="h-12 rounded-full border border-border bg-surface px-5 py-2.5 font-body text-[14px] text-foreground"
                    accessibilityLabel="Seu e-mail"
                  />
                  <Button
                    label={busy ? 'Enviando…' : 'Enviar código de acesso'}
                    fullWidth
                    disabled={unavailable || busy || !email.trim()}
                    onPress={handleEmail}
                    style={{ backgroundColor: colors.accent }}
                    icon={<Mail color={colors.primaryForeground} size={16} />}
                  />
                </View>
              ) : emailStep === 'sent' ? (
                <View className="gap-3">
                  <Text className="text-center font-body text-[13px] text-muted-foreground">
                    Enviamos um código de acesso para {email.trim()}. Insira-o abaixo:
                  </Text>
                  <TextInput
                    value={otpToken}
                    onChangeText={setOtpToken}
                    placeholder="000000"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="h-12 rounded-full border border-border bg-surface px-5 py-2.5 text-center font-body text-[14px] text-foreground"
                    style={{ letterSpacing: 6 }}
                    accessibilityLabel="Código de acesso"
                  />
                  <Button
                    label={busy ? 'Verificando…' : 'Entrar'}
                    fullWidth
                    disabled={unavailable || busy || otpToken.trim().length !== 6}
                    onPress={handleVerifyOtp}
                    style={{ backgroundColor: colors.accent }}
                    icon={<Mail color={colors.primaryForeground} size={16} />}
                  />
                  <Button
                    label="Alterar e-mail"
                    variant="outline"
                    fullWidth
                    disabled={busy}
                    onPress={() => {
                      setEmailStep('editing');
                      setOtpToken('');
                    }}
                  />
                </View>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
