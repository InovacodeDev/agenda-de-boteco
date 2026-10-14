import {
  claimEstablishmentOwner,
  getFriendlyErrorMessage,
  getOwnedEstablishmentId,
  isCurrentUserEstablishmentOwner,
  sendPasswordReset,
  signInWithEmailOtp,
  signInWithOAuth,
  signInWithPassword,
  updatePassword,
  useAuthStore,
  useResendCooldown,
  verifyEmailOtp,
} from '@agenda/core';
import {
  Button,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type ToastInput,
  useToast,
  View,
} from '@agenda/shared-ui-mobile';
import brandLogo from '@assets/logo.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleIcon } from '@/components/GoogleIcon';
import { signOutAndUnregister } from '@/lib/push';

type Tab = 'signIn' | 'signUp';

/**
 * O cadastro é em duas etapas, como no web-client: o código por e-mail prova a
 * posse do endereço e só depois a senha é gravada e o acesso liberado.
 */
type SignUpStep = 'email' | 'code';

const DENIED_MESSAGE =
  'Esta conta não tem acesso ao painel do estabelecimento. Se você é dono de um bar, crie seu acesso na aba "Criar conta".';

/**
 * Marca que o Google foi acionado pela aba "Criar conta". O OAuth sai do app
 * (browser externo) e a intenção não sobrevive em memória — equivalente ao
 * OAUTH_SIGNUP_KEY em sessionStorage do web-client.
 */
const OAUTH_SIGNUP_KEY = 'mobile-client:oauth-signup';

const TABS: { id: Tab; label: string }[] = [
  { id: 'signIn', label: 'Entrar' },
  { id: 'signUp', label: 'Criar conta' },
];

const PLACEHOLDER_COLOR = '#a6a6a6';

/** Mesmo `--gradient-night` do web-client: 160deg, violeta profundo até o fundo em 60%. */
const NIGHT_GRADIENT = ['#1b122b', '#0f0f0f'] as const;

function FieldLabel({ children }: { children: ReactNode }) {
  return <Text className="font-body-semibold text-foreground text-[13px]">{children}</Text>;
}

function TextLink({
  label,
  onPress,
  disabled = false,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'muted';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      className={disabled ? 'opacity-50' : 'active:opacity-60'}
    >
      <Text
        className={`font-body-medium text-[13px] ${
          tone === 'primary' ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const status = useAuthStore((state) => state.status);

  const [tab, setTab] = useState<Tab>('signIn');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  /** Ligado enquanto o cadastro conclui, para o efeito de sessão não interferir. */
  const [claiming, setClaiming] = useState(false);

  const resend = useResendCooldown();

  const unavailable = status === 'unavailable';
  const isCodeStep = tab === 'signUp' && signUpStep === 'code';

  const canSubmit = (() => {
    if (busy || unavailable) return false;
    if (tab === 'signIn') return email.trim().length > 0 && password.length >= 6;
    if (signUpStep === 'email') return email.trim().length > 0;
    return code.trim().length === 6 && password.length >= 6;
  })();

  useEffect(() => {
    if (status !== 'signedIn' || claiming) return;
    let active = true;

    void (async () => {
      try {
        const cameFromGoogleSignUp = await AsyncStorage.getItem(OAUTH_SIGNUP_KEY);
        if (cameFromGoogleSignUp) {
          await AsyncStorage.removeItem(OAUTH_SIGNUP_KEY);
          await claimEstablishmentOwner();
        }
        if (!active) return;
        const isOwner = await isCurrentUserEstablishmentOwner();
        if (!active) return;
        if (!isOwner) {
          await signOutAndUnregister();
          if (!active) return;
          toast.show({
            tone: 'error',
            message: DENIED_MESSAGE,
            action: {
              label: 'Criar meu acesso',
              onPress: () => {
                setTab('signUp');
                setPassword('');
              },
            },
          });
          return;
        }
        const establishmentId = await getOwnedEstablishmentId();
        if (!active) return;
        router.replace(establishmentId ? '/(painel)' : '/onboarding');
      } catch (error: unknown) {
        if (active) toast.show({ tone: 'error', message: getFriendlyErrorMessage(error) });
      }
    })();

    return () => {
      active = false;
    };
  }, [status, claiming, router, toast]);

  const run = async (action: () => Promise<void>, onDone?: ToastInput) => {
    toast.dismissAll();
    setBusy(true);
    try {
      await action();
      if (onDone) toast.show(onDone);
    } catch (error: unknown) {
      toast.show({ tone: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUpStart = async () => {
    if (!email.trim() || busy || unavailable) return;
    toast.dismissAll();
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setSignUpStep('code');
      resend.start();
      toast.show({
        tone: 'success',
        message: `Enviamos um código para ${email.trim()}. Ele confirma que o e-mail é seu.`,
      });
    } catch (error: unknown) {
      toast.show({ tone: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUpVerify = async () => {
    toast.dismissAll();
    setBusy(true);
    setClaiming(true);
    try {
      await verifyEmailOtp(email.trim(), code.trim());
      await updatePassword(password);
      await claimEstablishmentOwner();
      router.replace('/onboarding');
    } catch (error: unknown) {
      toast.show({ tone: 'error', message: getFriendlyErrorMessage(error) });
      setClaiming(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (tab === 'signIn') {
      void run(() => signInWithPassword(email.trim(), password));
      return;
    }
    if (signUpStep === 'email') {
      void handleSignUpStart();
      return;
    }
    void handleSignUpVerify();
  };

  const handleReset = () => {
    if (!email.trim()) {
      toast.show({ tone: 'error', message: 'Informe seu e-mail para recuperar a senha.' });
      return;
    }
    void run(() => sendPasswordReset(email.trim()), {
      tone: 'success',
      message: 'Enviamos um link de recuperação para o seu e-mail.',
    });
  };

  const handleGoogle = () => {
    void run(async () => {
      if (tab === 'signUp') {
        await AsyncStorage.setItem(OAUTH_SIGNUP_KEY, '1');
      }
      await signInWithOAuth('google');
    });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    toast.dismissAll();
    setSignUpStep('email');
    setCode('');
  };

  const submitLabel =
    tab === 'signIn' ? 'Entrar' : signUpStep === 'email' ? 'Enviar código' : 'Criar acesso';

  return (
    <View className="bg-background flex-1">
      <LinearGradient
        colors={NIGHT_GRADIENT}
        locations={[0, 0.6]}
        start={{ x: 0.33, y: 0 }}
        end={{ x: 0.67, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow items-center justify-center px-6 py-12"
            keyboardShouldPersistTaps="handled"
          >
            <View className="w-full max-w-[440px] items-center">
              <Image
                source={brandLogo}
                accessibilityLabel="Agenda de Boteco"
                contentFit="contain"
                className="h-20 w-20 rounded-[20px] bg-white p-2"
              />

              <Text className="font-heading text-foreground mt-5 text-center text-[30px] leading-9 tracking-tight">
                Painel do Estabelecimento
              </Text>
              <Text className="font-body text-muted-foreground mt-1.5 text-center text-[15px] leading-[22px]">
                Cadastre eventos e apareça no app dos amantes da noite
              </Text>

              <View className="border-border bg-card mt-7 w-full rounded-2xl border p-5">
                <View
                  accessibilityRole="tablist"
                  className="bg-surface flex-row rounded-xl p-1"
                >
                  {TABS.map((item) => {
                    const selected = tab === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        onPress={() => switchTab(item.id)}
                        className={`h-11 flex-1 items-center justify-center rounded-lg ${
                          selected ? 'bg-background' : ''
                        }`}
                      >
                        <Text
                          className={`font-body-semibold text-[15px] ${
                            selected
                              ? 'text-foreground'
                              : item.id === 'signUp'
                                ? 'text-primary'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {unavailable ? (
                  <View className="bg-surface mt-4 rounded-xl px-3.5 py-2.5">
                    <Text className="font-body text-muted-foreground text-[12px]">
                      Login indisponível: configuração do Supabase ausente.
                    </Text>
                  </View>
                ) : null}

                <View className="mt-5">
                  <FieldLabel>E-mail</FieldLabel>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seu@bar.com"
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isCodeStep}
                    containerClassName="mt-1.5"
                    className={isCodeStep ? 'text-muted-foreground' : undefined}
                  />

                  {isCodeStep ? (
                    <View className="mt-4">
                      <FieldLabel>Código do e-mail</FieldLabel>
                      <TextInput
                        value={code}
                        onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                        placeholder="000000"
                        placeholderTextColor={PLACEHOLDER_COLOR}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                        containerClassName="mt-1.5"
                        className="text-center tracking-[6px]"
                      />
                    </View>
                  ) : null}

                  {tab === 'signIn' || isCodeStep ? (
                    <View className="mt-4">
                      <View className="flex-row items-baseline justify-between gap-4">
                        <FieldLabel>{tab === 'signIn' ? 'Senha' : 'Crie uma senha'}</FieldLabel>
                        {tab === 'signIn' ? (
                          <TextLink label="Esqueci minha senha" disabled={busy} onPress={handleReset} />
                        ) : null}
                      </View>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••"
                        placeholderTextColor={PLACEHOLDER_COLOR}
                        secureTextEntry
                        autoComplete={tab === 'signIn' ? 'current-password' : 'new-password'}
                        textContentType={tab === 'signIn' ? 'password' : 'newPassword'}
                        returnKeyType="go"
                        onSubmitEditing={handleSubmit}
                        containerClassName="mt-1.5"
                      />
                    </View>
                  ) : null}

                  <Button
                    label={submitLabel}
                    busy={busy}
                    disabled={!canSubmit}
                    onPress={handleSubmit}
                    fullWidth
                    className="mt-5"
                    style={canSubmit ? styles.primaryGlow : undefined}
                  />

                  {isCodeStep ? (
                    <View className="mt-3 items-center gap-3">
                      <TextLink
                        tone="muted"
                        label={
                          resend.isReady
                            ? 'Reenviar código'
                            : `Reenviar em ${resend.remainingSeconds}s`
                        }
                        disabled={busy || !resend.isReady}
                        onPress={() => void handleSignUpStart()}
                      />
                      {resend.hasReachedHourlyLimit ? (
                        <Text className="font-body text-muted-foreground text-center text-[12px] leading-[18px]">
                          Você já solicitou 2 códigos nesta hora. Aguarde antes de tentar novamente
                          para não ser bloqueado temporariamente.
                        </Text>
                      ) : null}
                      <TextLink
                        tone="muted"
                        label="Usar outro e-mail"
                        disabled={busy}
                        onPress={() => {
                          setSignUpStep('email');
                          setCode('');
                          toast.dismissAll();
                          resend.reset();
                        }}
                      />
                    </View>
                  ) : null}
                </View>

                <View className="my-5 flex-row items-center gap-3">
                  <View className="bg-border h-px flex-1" />
                  <Text className="font-body text-muted-foreground text-[12px]">ou continue com</Text>
                  <View className="bg-border h-px flex-1" />
                </View>

                <Button
                  label="Google"
                  variant="outline"
                  disabled={busy || unavailable}
                  onPress={handleGoogle}
                  icon={<GoogleIcon size={18} />}
                  fullWidth
                  className="bg-surface"
                />

                {tab === 'signIn' ? (
                  <View className="border-border mt-5 items-center gap-2.5 border-t pt-5">
                    <Text className="font-body-medium text-foreground text-[15px]">
                      Primeira vez aqui?
                    </Text>
                    <Button
                      label="Criar conta do meu estabelecimento"
                      variant="outline"
                      className="border-2 border-primary"
                      labelClassName="text-primary"
                      onPress={() => switchTab('signUp')}
                      fullWidth
                    />
                  </View>
                ) : null}
              </View>

              <View className="mt-4">
                <TextLink
                  tone="muted"
                  label="Política de Privacidade"
                  onPress={() => router.push('/privacy')}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  primaryGlow: {
    shadowColor: '#1dd75e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
});
