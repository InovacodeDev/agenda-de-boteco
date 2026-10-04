import {
  getNotificationPreferences,
  logErrorToTerminal,
  registerPushToken,
  signOut,
  unregisterPushToken,
  useAuthStore,
} from '@agenda/core';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export type PushEnableResult = 'registered' | 'denied' | 'unsupported';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function nativePlatform(): 'ios' | 'android' | null {
  const os = Platform.OS;
  return Device.isDevice && (os === 'ios' || os === 'android') ? os : null;
}

function easProjectId(): string | null {
  const fromConfig: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  const projectId = typeof fromConfig === 'string' ? fromConfig : Constants.easConfig?.projectId;
  return projectId ? projectId : null;
}

async function readDeviceToken(): Promise<string | null> {
  const projectId = easProjectId();
  if (!projectId) {
    return null;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** Pede permissão (só se o sistema ainda deixa perguntar) e vincula o token do aparelho à conta. */
export async function enablePush(): Promise<PushEnableResult> {
  const platform = nativePlatform();
  if (!platform) {
    return 'unsupported';
  }
  if (platform === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alertas do painel',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#1dd75e',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted =
    current.granted ||
    (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) {
    return 'denied';
  }
  const token = await readDeviceToken();
  if (!token) {
    return 'unsupported';
  }
  await registerPushToken({ token, platform });
  return 'registered';
}

/** Precisa rodar com a sessão ainda ativa: a RLS só deixa apagar o token da própria conta. */
export async function disablePush(): Promise<void> {
  if (!nativePlatform()) {
    return;
  }
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) {
    return;
  }
  const token = await readDeviceToken();
  if (token) {
    await unregisterPushToken(token);
  }
}

/**
 * Desregistra o token do aparelho antes de encerrar a sessão — depois do
 * signOut a RLS não deixa mais apagar a própria linha. Falha ao desregistrar
 * não pode travar o logout: só loga e segue.
 */
export async function signOutAndUnregister(): Promise<void> {
  try {
    await disablePush();
  } catch (error: unknown) {
    logErrorToTerminal(error, { method: 'push.signOutAndUnregister.disablePush' });
  }
  await signOut();
}

/** Só caminho interno do app: bloqueia URL absoluta, protocol-relative (`//host`) e barra invertida. */
export function internalPathFromData(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('url' in data)) {
    return null;
  }
  const { url } = data;
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    return null;
  }
  return url.includes('\\') || url.includes('://') ? null : url;
}

export function usePushNotifications(ready: boolean) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (status !== 'signedIn') {
      return;
    }
    void getNotificationPreferences()
      .then((prefs) => (prefs.channelPush ? enablePush() : undefined))
      .catch((error: unknown) => {
        logErrorToTerminal(error, { method: 'push.syncOnSignIn' });
      });
  }, [status]);

  useEffect(() => {
    if (!ready || !response) {
      return;
    }
    const path = internalPathFromData(response.notification.request.content.data);
    void Notifications.clearLastNotificationResponse();
    if (path) {
      router.push(path as Href);
    }
  }, [ready, response, router]);
}
