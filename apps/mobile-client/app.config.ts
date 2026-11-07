import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

/** Perfis que geram binário de loja/teste: sem projectId o push token não existe. */
const STORE_PROFILES = ['production', 'preview', 'alfa', 'beta'];

function requireProjectId(): string | undefined {
  const projectId = process.env.EAS_PROJECT_ID;
  const profile = process.env.EAS_BUILD_PROFILE;
  if (!projectId && profile && STORE_PROFILES.includes(profile)) {
    throw new Error(
      '[FALHA NO BUILD] A variável de ambiente obrigatória "EAS_PROJECT_ID" não foi definida.',
    );
  }
  return projectId;
}

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
    usesAppleSignIn: true,
    config: {
      usesNonExemptEncryption: false,
    },
    entitlements: {
      'com.apple.developer.applesignin': ['Default'],
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
    'expo-apple-authentication',
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
  ],
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      projectId: requireProjectId(),
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
