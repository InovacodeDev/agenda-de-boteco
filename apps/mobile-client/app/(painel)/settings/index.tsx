import {
  Button,
  ConfirmDialog,
  Icon,
  Screen,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { KeyboardAwareBody } from '@/components/KeyboardAwareBody';
import { AccountSection } from '@/components/settings/AccountSection';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { useResponsive } from '@/hooks/useResponsive';
import { signOutAndUnregister } from '@/lib/push';
import { scrollContentClassName } from '@/lib/screenLayout';

export default function SettingsScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [busySignOut, setBusySignOut] = useState(false);

  useEffect(() => {
    if (!globalNotice) return;
    const timer = setTimeout(() => setGlobalNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [globalNotice]);

  const handleSignOut = async () => {
    setBusySignOut(true);
    await signOutAndUnregister();
    setBusySignOut(false);
    setConfirmSignOut(false);
    router.replace('/login');
  };

  const account = <AccountSection onSuccessNotice={setGlobalNotice} />;
  const notifications = <NotificationsSection />;
  const dangerZone = <DangerZoneSection />;

  return (
    <Screen noTopInset noBottomInset>
      <ScreenHeader
        title="Configurações"
        subtitle="Gerencie preferências de conta, notificações e privacidade."
      />

      <KeyboardAwareBody>
        <ScrollView
          contentContainerClassName={scrollContentClassName(isTablet)}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-5xl flex-col gap-6">
            {globalNotice ? (
              <View
                accessibilityRole="alert"
                className="self-start rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5"
              >
                <Text className="font-body-medium text-primary text-xs">{globalNotice}</Text>
              </View>
            ) : null}

            {isTablet ? (
              <View className="flex-row items-start gap-6">
                <View className="flex-1 flex-col gap-6">{account}</View>
                <View className="flex-1 flex-col gap-6">
                  {notifications}
                  {dangerZone}
                </View>
              </View>
            ) : (
              <>
                {account}
                {notifications}
                {dangerZone}
              </>
            )}

            <Button
              label="Sair da conta"
              variant="outline"
              icon={<Icon name="right-from-bracket" size={16} color="#fafafa" />}
              onPress={() => setConfirmSignOut(true)}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAwareBody>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Sair da conta"
        message="Você precisará entrar novamente para acessar o painel."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        destructive
        busy={busySignOut}
        onConfirm={() => void handleSignOut()}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
