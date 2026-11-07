import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Agenda de Boteco - Estabelecimento',
  slug: 'agenda-de-boteco-client',
  version,
  runtimeVersion: {
    policy: 'fingerprint',
  },
  updates: {
    url: process.env.EXPO_PUBLIC_OTA_MANIFEST_URL,
    enabled: Boolean(process.env.EXPO_PUBLIC_OTA_MANIFEST_URL),
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    codeSigningCertificate: './certs/certificate.pem',
    codeSigningMetadata: {
      keyid: 'main',
      alg: 'rsa-v1_5-sha256',
    },
    requestHeaders: {
      'x-app-slug': 'agenda-de-boteco-client',
    },
  },
  orientation: 'default',
  icon: './assets/icon.png',
  scheme: 'agenda-boteco-client',
  userInterfaceStyle: 'dark',
  owner: 'inovacode',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.agenda.boteco.client',
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#0F0F0F',
    },
    package: 'com.agenda.boteco.client',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0F0F0F',
        image: './assets/logo.png',
        imageWidth: 200,
      },
    ],
    'expo-image',
    'expo-localization',
    [
      'expo-notifications',
      {
        icon: './assets/android-icon-monochrome.png',
        color: '#0F0F0F',
      },
    ],
    'expo-updates',
  ],
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
