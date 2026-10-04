import {
  getFriendlyErrorMessage,
  getUserAuthProvider,
  signOutOtherSessions,
  updatePassword,
  useAuthStore,
} from '@agenda/core';
import { Button, Card, Field, Icon, Text, TextInput, View } from '@agenda/shared-ui-mobile';
import { useEffect, useState } from 'react';

import { FOREGROUND, PRIMARY, SectionHeader } from './SectionHeader';

interface AccountSectionProps {
  onSuccessNotice: (message: string) => void;
}

export function AccountSection({ onSuccessNotice }: AccountSectionProps) {
  const user = useAuthStore((state) => state.user);

  const [provider, setProvider] = useState<'google' | 'email'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busyPassword, setBusyPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [busySignOutOthers, setBusySignOutOthers] = useState(false);
  const [sessionsNotice, setSessionsNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getUserAuthProvider().then((detected) => {
      if (!active) return;
      queueMicrotask(() => {
        setProvider(detected === 'google' ? 'google' : 'email');
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const handlePasswordSubmit = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da senha não confere com a nova senha.');
      return;
    }

    setBusyPassword(true);
    try {
      await updatePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      onSuccessNotice('Senha atualizada com sucesso.');
    } catch (error: unknown) {
      setPasswordError(getFriendlyErrorMessage(error));
    } finally {
      setBusyPassword(false);
    }
  };

  const handleSignOutOthers = async () => {
    setBusySignOutOthers(true);
    setSessionsNotice(null);
    try {
      await signOutOtherSessions();
      setSessionsNotice('Sessões em outros dispositivos foram desconectadas.');
    } catch (error: unknown) {
      setSessionsNotice(getFriendlyErrorMessage(error));
    } finally {
      setBusySignOutOthers(false);
    }
  };

  const resetFeedback = () => {
    setPasswordSuccess(false);
    setPasswordError(null);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        icon="user"
        iconColor={PRIMARY}
        iconBoxClassName="bg-primary/10"
        title="Conta e Acesso"
        description="Gerencie as credenciais de acesso ao painel do seu estabelecimento."
      />

      <View className="flex-col gap-6">
        <View className="flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <View className="flex-col">
            <Text className="font-body-semibold text-muted-foreground text-xs uppercase tracking-wider">
              E-mail de login
            </Text>
            <Text className="font-body-medium text-foreground text-sm">{user?.email ?? '—'}</Text>
          </View>

          <View className="flex-row">
            {provider === 'google' ? (
              <View className="flex-row items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-1">
                <Icon name="google" size={14} color={FOREGROUND} variant="brands" />
                <Text className="font-body-medium text-foreground text-xs">Conectado com Google</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-3 py-1">
                <Icon name="envelope" size={14} color="#a6a6a6" weight="bold" />
                <Text className="font-body-medium text-muted-foreground text-xs">E-mail e Senha</Text>
              </View>
            )}
          </View>
        </View>

        {provider === 'google' ? (
          <View className="flex-row items-start gap-3 rounded-xl border border-border/60 bg-surface/50 p-4">
            <Icon name="shield-check" size={20} color={PRIMARY} weight="bold" />
            <Text className="font-body text-muted-foreground flex-1 text-xs leading-relaxed">
              Sua conta utiliza a autenticação do Google. A segurança e recuperação de senha são
              gerenciadas diretamente na sua conta Google.
            </Text>
          </View>
        ) : (
          <View className="flex-col gap-4">
            <View className="flex-col">
              <Text className="font-heading text-foreground text-sm">Alterar senha</Text>
              <Text className="font-body text-muted-foreground text-xs">
                Defina uma nova senha para acessar o painel administrativo.
              </Text>
            </View>

            <Field label="Nova senha">
              <TextInput
                secureTextEntry
                autoComplete="new-password"
                value={newPassword}
                onChangeText={(value) => {
                  resetFeedback();
                  setNewPassword(value);
                }}
                placeholder="Mínimo de 6 caracteres"
              />
            </Field>

            <Field label="Confirmar nova senha">
              <TextInput
                secureTextEntry
                autoComplete="new-password"
                value={confirmPassword}
                onChangeText={(value) => {
                  resetFeedback();
                  setConfirmPassword(value);
                }}
                placeholder="Repita a nova senha"
              />
            </Field>

            {passwordError ? (
              <Text className="font-body text-destructive text-xs">{passwordError}</Text>
            ) : null}

            {passwordSuccess ? (
              <View className="flex-row items-center gap-1.5">
                <Icon name="check" size={16} color={PRIMARY} weight="bold" />
                <Text className="font-body-medium text-primary text-xs">
                  Senha alterada com sucesso.
                </Text>
              </View>
            ) : null}

            <View className="flex-row justify-end">
              <Button
                label={busyPassword ? 'Salvando…' : 'Salvar nova senha'}
                variant="solid"
                disabled={busyPassword || !newPassword || !confirmPassword}
                onPress={() => void handlePasswordSubmit()}
                className="h-10 px-4"
              />
            </View>
          </View>
        )}

        <View className="border-t border-border/60 pt-5">
          <View className="flex-col gap-3">
            <View className="flex-col">
              <Text className="font-heading text-foreground text-sm">Sessões ativas</Text>
              <Text className="font-body text-muted-foreground text-xs">
                Se você acessou o painel em um computador de balcão compartilhado, pode desconectar
                outros acessos.
              </Text>
            </View>

            <View className="flex-row">
              <Button
                label={busySignOutOthers ? 'Desconectando…' : 'Desconectar outros dispositivos'}
                variant="outline"
                disabled={busySignOutOthers}
                icon={<Icon name="laptop" size={16} color={FOREGROUND} weight="bold" />}
                onPress={() => void handleSignOutOthers()}
                className="h-10 px-4"
              />
            </View>
          </View>

          {sessionsNotice ? (
            <Text className="font-body text-muted-foreground mt-2 text-xs">{sessionsNotice}</Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
