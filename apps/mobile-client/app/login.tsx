import {
  claimEstablishmentOwner,
  getFriendlyErrorMessage,
  getOwnedEstablishmentId,
  isCurrentUserEstablishmentOwner,
  sendPasswordReset,
  signInWithEmailOtp,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  updatePassword,
  useAuthStore,
  useResendCooldown,
  verifyEmailOtp,
} from '@agenda/core';
import {
  Button,
  Field,
  Icon,
  Screen,
  ScrollView,
  SegmentedTabs,
  Text,
  TextInput,
  View,
} from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';

type Tab = 'signIn' | 'signUp';
type SignUpStep = 'email' | 'code';

const DENIED_MESSAGE =
  'Esta conta não tem acesso ao painel do estabelecimento. Se você é dono de um bar, crie seu acesso na aba "Criar conta".';

export default function LoginScreen() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [tab, setTab] = useState<Tab>('signIn');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success' | 'denied'; message: string } | null>(null);

  const resend = useResendCooldown();

  useEffect(() => {
    if (status !== 'signedIn' || claiming) return;
    let active = true;

    void (async () => {
      try {
        const isOwner = await isCurrentUserEstablishmentOwner();
        if (!active) return;
        if (!isOwner) {
          await signOut();
          queueMicrotask(() => {
            setNotice({ tone: 'denied', message: DENIED_MESSAGE });
          });
          return;
        }
        const establishmentId = await getOwnedEstablishmentId();
        if (!active) return;
        if (establishmentId) {
          router.replace('/(painel)');
        } else {
          router.replace('/onboarding');
        }
      } catch (err: unknown) {
        if (!active) return;
        queueMicrotask(() => {
          setNotice({ tone: 'error', message: getFriendlyErrorMessage(err) });
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [status, claiming, router]);

  const handleSignIn = async () => {
    setNotice(null);
    setBusy(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err: unknown) {
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setNotice(null);
    try {
      await signInWithOAuth('google');
    } catch (err: unknown) {
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(err) });
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setNotice({ tone: 'error', message: 'Digite seu e-mail para recuperar a senha.' });
      return;
    }
    setNotice(null);
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      Alert.alert('Recuperação de senha', 'Enviamos as instruções para o seu e-mail.');
    } catch (err: unknown) {
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUpStart = async () => {
    if (!email.trim()) {
      setNotice({ tone: 'error', message: 'Informe um e-mail válido.' });
      return;
    }
    setNotice(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      resend.start();
      setSignUpStep('code');
      setNotice({
        tone: 'success',
        message: 'Código enviado! Verifique sua caixa de entrada.',
      });
    } catch (err: unknown) {
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleSignUpVerify = async () => {
    if (code.trim().length !== 6 || password.length < 6) {
      setNotice({
        tone: 'error',
        message: 'O código deve ter 6 dígitos e a senha no mínimo 6 caracteres.',
      });
      return;
    }
    setNotice(null);
    setBusy(true);
    setClaiming(true);
    try {
      await verifyEmailOtp(email.trim(), code.trim());
      await updatePassword(password);
      await claimEstablishmentOwner();
      setClaiming(false);
      router.replace('/onboarding');
    } catch (err: unknown) {
      setClaiming(false);
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-md">
            <View className="mb-8 items-center">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
                <Icon name="store" size={32} color="#1dd75e" />
              </View>
              <Text className="font-heading text-foreground text-2xl font-bold">
                Agenda de Boteco
              </Text>
              <Text className="font-body text-muted-foreground mt-1 text-sm">
                Painel Administrativo do Bar
              </Text>
            </View>

            <SegmentedTabs<Tab>
              options={[
                { id: 'signIn', label: 'Entrar' },
                { id: 'signUp', label: 'Criar conta' },
              ]}
              value={tab}
              onChange={(newTab) => {
                setTab(newTab);
                setNotice(null);
              }}
              className="mb-6"
            />

            {notice ? (
              <View
                className={`mb-6 rounded-xl border p-4 ${
                  notice.tone === 'success'
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-destructive/40 bg-destructive/10'
                }`}
              >
                <Text
                  className={`font-body text-xs leading-relaxed ${
                    notice.tone === 'success' ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {notice.message}
                </Text>
              </View>
            ) : null}

            {tab === 'signIn' ? (
              <View className="flex-col gap-4">
                <Field label="E-mail">
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seu@email.com"
                  />
                </Field>

                <Field label="Senha">
                  <TextInput
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                  />
                </Field>

                <View className="items-end">
                  <Button
                    label="Esqueci minha senha"
                    variant="ghost"
                    onPress={handleForgotPassword}
                    className="h-auto p-0"
                  />
                </View>

                <Button
                  label="Entrar no Painel"
                  busy={busy}
                  onPress={handleSignIn}
                  variant="solid"
                  fullWidth
                  className="mt-2"
                />

                <View className="my-3 flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-border" />
                  <Text className="font-body text-muted-foreground text-xs uppercase">ou</Text>
                  <View className="h-px flex-1 bg-border" />
                </View>

                <Button
                  label="Entrar com Google"
                  variant="outline"
                  onPress={handleGoogleSignIn}
                  icon={<Icon name="google" size={18} color="#fafafa" />}
                  fullWidth
                />
              </View>
            ) : signUpStep === 'email' ? (
              <View className="flex-col gap-4">
                <Text className="font-body text-muted-foreground text-sm">
                  Informe o e-mail do responsável pelo estabelecimento para receber o código de verificação.
                </Text>

                <Field label="E-mail profissional">
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="contato@seubar.com.br"
                  />
                </Field>

                <Button
                  label="Enviar código de verificação"
                  busy={busy}
                  onPress={handleSignUpStart}
                  variant="solid"
                  fullWidth
                  className="mt-2"
                />
              </View>
            ) : (
              <View className="flex-col gap-4">
                <Text className="font-body text-muted-foreground text-sm">
                  Digite o código de 6 dígitos enviado para{' '}
                  <Text className="font-body-semibold text-foreground">{email}</Text> e defina sua senha.
                </Text>

                <Field label="Código de 6 dígitos">
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                  />
                </Field>

                <Field label="Nova Senha (mínimo 6 caracteres)">
                  <TextInput
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                  />
                </Field>

                <Button
                  label="Concluir cadastro de dono"
                  busy={busy}
                  onPress={handleSignUpVerify}
                  variant="solid"
                  fullWidth
                  className="mt-2"
                />

                <Button
                  label="Voltar para e-mail"
                  variant="ghost"
                  onPress={() => setSignUpStep('email')}
                  fullWidth
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
