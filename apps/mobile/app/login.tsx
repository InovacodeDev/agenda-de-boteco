import brandLogo from '@assets/logo.png';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  type AuthProvider,
  signInWithEmailOtp,
  signInWithProvider,
  verifyEmailOtp,
} from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/colors';
import { gradientNight } from '@/theme/gradients';
import { headingLetterSpacing } from '@/theme/typography';
import { Image, KeyboardAvoidingView, ScrollView, Text, TextInput, View } from '@/tw';

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
      <KeyboardAvoidingView behavior="padding" className="flex-1">
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
                className="font-heading text-foreground text-[26px]"
                style={{ letterSpacing: headingLetterSpacing(26) }}
              >
                Entre para curtir mais
              </Text>
              <Text className="font-body text-muted-foreground text-[14px] leading-5">
                Salve favoritos, avalie bares e receba avisos dos seus lugares favoritos.
              </Text>
            </View>

            {unavailable ? (
              <View className="border-border bg-surface/80 flex-row items-start gap-2.5 rounded-2xl border p-4">
                <Icon name="circle-info" color={colors.accent} size={18} />
                <View className="flex-1 gap-1">
                  <Text className="font-body-semibold text-foreground text-[14px]">
                    Login indisponível no momento
                  </Text>
                  <Text className="font-body text-muted-foreground text-[13px] leading-5">
                    Estamos finalizando a configuração das contas. Você já pode explorar a agenda
                    normalmente — favoritar e avaliar liberam assim que o login estiver no ar.
                  </Text>
                </View>
              </View>
            ) : null}

            {errorMessage ? (
              <Text className="font-body text-destructive text-[13px]">{errorMessage}</Text>
            ) : null}

            <View className="gap-3">
              <Button
                label="Continuar com Google"
                variant="white"
                fullWidth
                disabled={unavailable || busy}
                style={{ flex: 1, flexDirection: 'row' }}
                onPress={() => handleProvider('google')}
                icon={<Icon name="google" size={18} />}
              />
              <Button
                label="Continuar com Apple"
                variant="outline"
                fullWidth
                disabled={unavailable || busy}
                style={{ flex: 1, flexDirection: 'row' }}
                onPress={() => handleProvider('apple')}
                icon={<Icon name="apple" color={colors.foreground} size={16} />}
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
                    className="border-border bg-surface font-body text-foreground h-12 rounded-full border px-5 py-2.5 text-[14px]"
                    accessibilityLabel="Seu e-mail"
                  />
                  <Button
                    label={busy ? 'Enviando…' : 'Enviar código de acesso'}
                    fullWidth
                    disabled={unavailable || busy || !email.trim()}
                    onPress={handleEmail}
                    className="bg-accent"
                    icon={<Icon name="envelope" variant="regular" color={colors.primaryForeground} size={16} />}
                  />
                </View>
              ) : emailStep === 'sent' ? (
                <View className="gap-3">
                  <Text className="font-body text-muted-foreground text-center text-[13px]">
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
                    className="border-border bg-surface font-body text-foreground h-12 rounded-full border px-5 py-2.5 text-center text-[14px]"
                    style={{ letterSpacing: 6 }}
                    accessibilityLabel="Código de acesso"
                  />
                  <Button
                    label={busy ? 'Verificando…' : 'Entrar'}
                    fullWidth
                    disabled={unavailable || busy || otpToken.trim().length !== 6}
                    onPress={handleVerifyOtp}
                    className="bg-accent"
                    icon={<Icon name="envelope" variant="regular" color={colors.primaryForeground} size={16} />}
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
                  style={{ flex: 1, flexDirection: 'row' }}
                  icon={<Icon name="envelope" variant="regular" color={colors.foreground} size={16} />}
                />
              )}
            </View>

            <Text className="font-body text-muted-foreground text-center text-[12px]">
              Ao continuar, você aceita os termos do Agenda de Boteco.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
