import { useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  isAuthAvailable,
  requestAccountDeletion,
  signInWithEmailOtp,
  verifyEmailOtp,
} from '@/services/auth';
import { colors } from '@/theme/colors';
import { headingLetterSpacing } from '@/theme/typography';
import { ScrollView, Text, TextInput, View } from '@/tw';
import { getFriendlyErrorMessage } from '@/utils/errors';

/**
 * Página pública de exclusão de conta.
 *
 * Atende ao requisito do Google Play (Data deletion URL): menciona o app,
 * descreve os passos e especifica os dados apagados/mantidos. Além do texto,
 * oferece um formulário de solicitação: e-mail → OTP de confirmação → enfileira
 * a exclusão (RPC request_account_deletion). Um cron de hora em hora processa a
 * fila e apaga as contas (ver supabase/migrations/...account_deletion_queue).
 *
 * Servida pelo target web (web.output: 'static') em
 * https://agenda-de-boteco.expo.app/delete-account e também renderiza no app
 * (`/excluir-conta` continua funcionando como alias — ver deepLinks.ts).
 */

const APP_NAME = 'Agenda de Boteco';
const CONTACT_EMAIL = 'contato@inovacode.dev';

type Step = 'email' | 'otp' | 'done';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6 gap-2">
      <Text
        className="font-heading text-foreground text-[18px]"
        style={{ letterSpacing: headingLetterSpacing(18) }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-body text-muted-foreground text-[15px] leading-6">{children}</Text>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-2 pl-1">
      <Text className="text-primary text-[15px] leading-6">•</Text>
      <Text className="font-body text-muted-foreground flex-1 text-[15px] leading-6">
        {children}
      </Text>
    </View>
  );
}

function DeletionForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unavailable = !isAuthAvailable();

  const handleSendCode = async () => {
    if (!email.trim()) {
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setStep('otp');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (otp.trim().length !== 6) {
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      // verifyEmailOtp autentica a sessão; só então request_account_deletion
      // consegue enfileirar o auth.uid() correspondente.
      await verifyEmailOtp(email.trim(), otp.trim());
      await requestAccountDeletion();
      setStep('done');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (unavailable) {
    return (
      <View className="border-border bg-surface/80 mb-8 flex-row items-start gap-2.5 rounded-2xl border p-4">
        <Icon name="circle-info" color={colors.accent} size={18} />
        <Text className="font-body text-muted-foreground flex-1 text-[13px] leading-5">
          A solicitação online está indisponível no momento. Envie um e-mail para {CONTACT_EMAIL}{' '}
          para excluir sua conta.
        </Text>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View className="border-primary/30 bg-primary/10 mb-8 gap-2 rounded-2xl border p-4">
        <View className="flex-row items-center gap-2">
          <Icon name="check" color={colors.primary} size={18} />
          <Text className="font-body-semibold text-foreground text-[15px]">
            Solicitação registrada
          </Text>
        </View>
        <Text className="font-body text-muted-foreground text-[13px] leading-5">
          Se houver uma conta associada a esse e-mail, ela e os dados vinculados serão excluídos em
          até 1 hora. Você não precisa fazer mais nada.
        </Text>
      </View>
    );
  }

  return (
    <View className="border-border bg-surface/60 mb-8 gap-3 rounded-2xl border p-4">
      <Text className="font-body-semibold text-foreground text-[15px]">
        Solicitar exclusão online
      </Text>

      {errorMessage ? (
        <Text className="font-body text-destructive text-[13px]">{errorMessage}</Text>
      ) : null}

      {step === 'email' ? (
        <>
          <Text className="font-body text-muted-foreground text-[13px] leading-5">
            Informe o e-mail da sua conta. Enviaremos um código para confirmar que é você.
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{ paddingHorizontal: 12 }}
            className="border-border bg-surface font-body text-foreground h-12 rounded-full border py-2.5 text-[14px]"
            accessibilityLabel="E-mail da conta"
          />
          <Button
            label={busy ? 'Enviando…' : 'Enviar código de confirmação'}
            fullWidth
            disabled={busy || !email.trim()}
            onPress={handleSendCode}
            style={{ backgroundColor: colors.destructive }}
            icon={<Icon name="envelope" variant="regular" color={colors.foreground} size={16} />}
          />
        </>
      ) : (
        <>
          <Text className="font-body text-muted-foreground text-[13px] leading-5">
            Enviamos um código para {email.trim()}. Digite-o abaixo para confirmar a exclusão.
          </Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            autoCorrect={false}
            className="border-border bg-surface font-body text-foreground h-12 rounded-full border px-5 py-2.5 text-center text-[14px]"
            style={{ letterSpacing: 6 }}
            accessibilityLabel="Código de confirmação"
          />
          <Button
            label={busy ? 'Confirmando…' : 'Confirmar exclusão da conta'}
            fullWidth
            disabled={busy || otp.trim().length !== 6}
            onPress={handleConfirm}
            style={{ backgroundColor: colors.destructive }}
            icon={<Icon name="trash-can" variant="regular" color={colors.foreground} size={16} />}
          />
          <Button
            label="Usar outro e-mail"
            variant="outline"
            fullWidth
            disabled={busy}
            style={{ backgroundColor: colors.background }}
            onPress={() => {
              setStep('email');
              setOtp('');
              setErrorMessage(null);
            }}
          />
        </>
      )}
    </View>
  );
}

export default function DeleteAccountScreen() {
  return (
    <Screen header={<ScreenHeader title="Excluir sua conta" showBack />}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full px-5 pb-16 pt-2"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-body text-muted-foreground mb-6 text-[13px]">{APP_NAME}</Text>

        <View className="mb-6">
          <Paragraph>
            Esta página explica como excluir sua conta do {APP_NAME} e quais dados são removidos. A
            exclusão é permanente e não pode ser desfeita.
          </Paragraph>
        </View>

        <DeletionForm />

        <Section title="Como excluir pelo app (se estiver logado)">
          <Paragraph>
            Você também pode excluir a conta dentro do app: abra a aba “Perfil”, toque em “Excluir
            conta” no rodapé e confirme. O processo de remoção é o mesmo descrito abaixo.
          </Paragraph>
        </Section>

        <Section title="Quais dados são excluídos">
          <Paragraph>Ao excluir a conta, removemos de forma permanente:</Paragraph>
          <Bullet>Seu cadastro de autenticação (e-mail e nome associados à conta).</Bullet>
          <Bullet>
            Seus favoritos sincronizados (eventos e estabelecimentos salvos na conta).
          </Bullet>
          <Paragraph>
            O app não coleta telefone, foto, dados financeiros, dados de saúde nem identificadores
            de publicidade — portanto não há esses dados a remover.
          </Paragraph>
        </Section>

        <Section title="Quais dados podem ser mantidos">
          <Paragraph>
            Não retemos dados pessoais após a exclusão. Preferências salvas apenas no seu
            dispositivo (como a cidade selecionada) são removidas ao desinstalar o app. Registros
            técnicos mínimos, quando existirem por exigência legal, são anônimos e não identificam
            você.
          </Paragraph>
        </Section>

        <Section title="Prazo e contato">
          <Paragraph>
            As solicitações são processadas em até 1 hora. Em caso de dúvida, escreva para{' '}
            {CONTACT_EMAIL}.
          </Paragraph>
        </Section>
      </ScrollView>
    </Screen>
  );
}
