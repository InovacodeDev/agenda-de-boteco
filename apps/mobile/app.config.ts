import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

const STRICT_PROFILES = ['production', 'preview', 'alfa', 'beta'] as const;

// Validação defensiva para garantir que chaves críticas não fiquem undefined em produção/preview
const getEnvVar = (value: string | undefined, name: string): string => {
  const isStrictProfile = (STRICT_PROFILES as readonly string[]).includes(
    process.env.EAS_BUILD_PROFILE ?? '',
  );
  if (!value && isStrictProfile) {
    throw new Error(
      `[FALHA NO BUILD] A variável de ambiente obrigatória "${name}" não foi definida.`,
    );
  }
  return value || '';
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const manifestUrl = getEnvVar(
    process.env.EXPO_PUBLIC_OTA_MANIFEST_URL,
    'EXPO_PUBLIC_OTA_MANIFEST_URL',
  );

  return {
    ...config,
    name: 'Agenda de Boteco',
    slug: 'agenda-de-boteco',
    // Fonte única da versão: package.json. Alterar lá propaga para o build (Expo/EAS).
    version,
    runtimeVersion: {
      policy: 'fingerprint',
    },
    updates: {
      url: manifestUrl || undefined,
      enabled: Boolean(manifestUrl),
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      codeSigningCertificate: './certs/certificate.pem',
      codeSigningMetadata: {
        keyid: 'main',
        alg: 'rsa-v1_5-sha256',
      },
      requestHeaders: {
        'x-app-slug': 'agenda-de-boteco',
      },
    },
    orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'agenda-de-boteco',
  userInterfaceStyle: 'dark',
  owner: 'inovacode',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.agenda.boteco',
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
    package: 'com.agenda.boteco',
    config: {
      googleMaps: {
        apiKey: getEnvVar(process.env.GOOGLE_MAPS_API_KEY_ANDROID, 'GOOGLE_MAPS_API_KEY_ANDROID'),
      },
    },
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
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Usamos sua localização para mostrar bares e eventos perto de você.',
      },
    ],
    [
      'react-native-maps',
      {
        iosGoogleMapsApiKey: getEnvVar(
          process.env.GOOGLE_MAPS_API_KEY_IOS,
          'GOOGLE_MAPS_API_KEY_IOS',
        ),
      },
    ],
    'expo-image',
    'expo-localization',
    'expo-updates',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '14d06c33-6b50-40ef-81b6-ab4a404b3e7f',
    },
  },
  };
};
