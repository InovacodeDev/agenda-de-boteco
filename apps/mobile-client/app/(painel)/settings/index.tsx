import {
  getFriendlyErrorMessage,
  signOut,
  updatePassword,
  useAuthStore,
} from '@agenda/core';
import {
  Button,
  Card,
  ConfirmDialog,
  Field,
  Icon,
  Pressable,
  Screen,
  ScreenHeader,
  ScrollView,
  SwitchRow,
  Text,
  TextInput,
  View,
} from '@agenda/shared-ui-mobile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

interface NotificationSettings {
  channelEmail: boolean;
  channelPush: boolean;
  alertReviews: boolean;
  alertMusicians: boolean;
  alertEventStatus: boolean;
  alertEmptySchedule: boolean;
  alertWeeklyDigest: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  channelEmail: true,
  channelPush: true,
  alertReviews: true,
  alertMusicians: true,
  alertEventStatus: true,
  alertEmptySchedule: true,
  alertWeeklyDigest: false,
};

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busyPassword, setBusyPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [busySignOutOthers, setBusySignOutOthers] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(`mobile-client:notifications:${user.id}`);
        if (!active) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
          queueMicrotask(() => setNotifications({ ...DEFAULT_SETTINGS, ...parsed }));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const updateNotificationSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    if (user?.id) {
      void AsyncStorage.setItem(
        `mobile-client:notifications:${user.id}`,
        JSON.stringify(next),
      );
    }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não confere com a nova senha.');
      return;
    }

    setBusyPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Sucesso', 'Sua senha foi alterada.');
    } catch (err: unknown) {
      setPasswordError(getFriendlyErrorMessage(err));
    } finally {
      setBusyPassword(false);
    }
  };

  const handleSignOutOthers = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusySignOutOthers(true);
    try {
      await supabase.auth.signOut({ scope: 'others' });
      Alert.alert('Sessões encerradas', 'Outros aparelhos conectados foram desconectados.');
    } catch (err: unknown) {
      Alert.alert('Erro', getFriendlyErrorMessage(err));
    } finally {
      setBusySignOutOthers(false);
    }
  };

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Configurações"
        subtitle="Preferências de conta, alertas e privacidade"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="p-5 gap-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-3xl flex-col gap-6">
            {/* Conta do Usuário */}
            <Card className="p-5">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <Icon name="user" size={20} color="#1dd75e" />
                </View>
                <View className="flex-1">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Conta de Operador
                  </Text>
                  <Text className="font-body text-muted-foreground text-xs">
                    {user?.email ?? 'Usuário conectado'}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-col gap-4 border-t border-border/60 pt-4">
                <Text className="font-heading text-foreground text-sm font-semibold">
                  Alterar Senha
                </Text>

                <Field label="Nova Senha">
                  <TextInput
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                  />
                </Field>

                <Field label="Confirmar Nova Senha">
                  <TextInput
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                  />
                </Field>

                {passwordError ? (
                  <Text className="font-body text-destructive text-xs">{passwordError}</Text>
                ) : null}

                <View className="flex-row items-center justify-end">
                  <Button
                    label="Atualizar Senha"
                    variant="solid"
                    disabled={!newPassword || busyPassword}
                    busy={busyPassword}
                    onPress={handlePasswordSubmit}
                    className="h-10 px-4 text-xs"
                  />
                </View>
              </View>

              <View className="mt-5 border-t border-border/60 pt-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="font-body-medium text-foreground text-sm">
                      Sessões ativas
                    </Text>
                    <Text className="font-body text-muted-foreground text-xs">
                      Desconecte sua conta em outros navegadores ou aparelhos.
                    </Text>
                  </View>

                  <Button
                    label="Desconectar outros"
                    variant="outline"
                    busy={busySignOutOthers}
                    onPress={handleSignOutOthers}
                    className="h-9 px-3 text-xs"
                  />
                </View>
              </View>
            </Card>

            {/* Notificações e Alertas */}
            <Card className="p-5">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <Icon name="bell-simple" size={20} color="#1dd75e" />
                </View>
                <View className="flex-1">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Notificações & Alertas
                  </Text>
                  <Text className="font-body text-muted-foreground text-xs">
                    Escolha como deseja ser avisado sobre movimentações no bar
                  </Text>
                </View>
              </View>

              <View className="divide-y divide-border/60">
                <SwitchRow
                  label="E-mail"
                  description="Notificações e avisos no seu endereço de e-mail."
                  checked={notifications.channelEmail}
                  onCheckedChange={(val) => updateNotificationSetting('channelEmail', val)}
                />

                <SwitchRow
                  label="Notificações Push"
                  description="Alertas em tempo real direto no seu aparelho."
                  checked={notifications.channelPush}
                  onCheckedChange={(val) => updateNotificationSetting('channelPush', val)}
                />

                <SwitchRow
                  label="Novas Avaliações"
                  description="Aviso instantâneo quando um cliente avaliar seu bar."
                  checked={notifications.alertReviews}
                  onCheckedChange={(val) => updateNotificationSetting('alertReviews', val)}
                />

                <SwitchRow
                  label="Músicos e Atrações"
                  description="Aviso quando um artista registrar interesse em tocar na casa."
                  checked={notifications.alertMusicians}
                  onCheckedChange={(val) => updateNotificationSetting('alertMusicians', val)}
                />

                <SwitchRow
                  label="Lembrete de Agenda de Fim de Semana"
                  description="Lembrete na quinta-feira caso não haja eventos programados."
                  checked={notifications.alertEmptySchedule}
                  onCheckedChange={(val) => updateNotificationSetting('alertEmptySchedule', val)}
                />

                <SwitchRow
                  label="Resumo Semanal de Métricas"
                  description="Consolidado de visualizações e cliques nas segundas-feiras."
                  checked={notifications.alertWeeklyDigest}
                  onCheckedChange={(val) => updateNotificationSetting('alertWeeklyDigest', val)}
                />
              </View>
            </Card>

            {/* Privacidade e Encerramento */}
            <Card className="border-destructive/30 bg-destructive/5 p-5">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-destructive/20">
                  <Icon name="shield-warning" size={20} color="#f53d7a" />
                </View>
                <View className="flex-1">
                  <Text className="font-heading text-destructive text-base font-bold">
                    Privacidade & Zona de Perigo
                  </Text>
                  <Text className="font-body text-muted-foreground text-xs">
                    Conformidade com a LGPD e encerramento de conta
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between border-t border-destructive/20 pt-4">
                <Pressable onPress={() => router.push('/privacy')}>
                  <Text className="font-body-medium text-primary text-xs underline">
                    Visualizar Política de Privacidade (LGPD)
                  </Text>
                </Pressable>

                <Button
                  label="Excluir Conta"
                  variant="destructive"
                  onPress={() => router.push('/delete-account')}
                  className="h-9 px-3 text-xs"
                />
              </View>
            </Card>

            {/* Logout da Conta */}
            <View className="pt-2">
              <Button
                label="Sair da Conta"
                variant="outline"
                icon={<Icon name="right-from-bracket" size={16} color="#fafafa" />}
                onPress={() => setConfirmSignOut(true)}
                fullWidth
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Deseja sair do aplicativo?"
        message="Sua sessão será encerrada e você precisará digitar suas credenciais novamente para acessar o painel."
        confirmLabel="Sair agora"
        cancelLabel="Permanecer conectado"
        destructive
        onConfirm={async () => {
          setConfirmSignOut(false);
          await signOut();
          router.replace('/login');
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
