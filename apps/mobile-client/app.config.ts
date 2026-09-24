import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Agenda de Boteco - Estabelecimento',
  slug: 'agenda-de-boteco-client',
  version,
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
  ],
  experiments: {
    typedRoutes: true,
  },
});
