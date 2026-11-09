import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

const STORE_PROFILES = ['production', 'preview', 'alfa', 'beta'] as const;

const getEnvVar = (value: string | undefined, name: string): string => {
  const isStrictProfile = (STORE_PROFILES as readonly string[]).includes(
    process.env.EAS_BUILD_PROFILE ?? '',
  );
  if (!value && isStrictProfile) {
    throw new Error(
      `[FALHA NO BUILD] A variável de ambiente obrigatória "${name}" não foi definida.`,
    );
  }
  return value || '';
};

function requireProjectId(): string | undefined {
  const projectId = process.env.EAS_PROJECT_ID;
  const profile = process.env.EAS_BUILD_PROFILE;
  if (!projectId && profile && (STORE_PROFILES as readonly string[]).includes(profile)) {
    throw new Error(
      '[FALHA NO BUILD] A variável de ambiente obrigatória "EAS_PROJECT_ID" não foi definida.',
    );
  }
  return projectId;
}

const hasPostHogUploadCredentials = Boolean(
  process.env.POSTHOG_CLI_API_KEY || process.env.POSTHOG_CLI_TOKEN,
);

export default ({ config }: ConfigContext): ExpoConfig => {
  const manifestUrl = getEnvVar(
    process.env.EXPO_PUBLIC_OTA_MANIFEST_URL,
    'EXPO_PUBLIC_OTA_MANIFEST_URL',
  );

  return {
    ...config,
    name: 'Agenda de Boteco - Estabelecimento',
    slug: 'agenda-de-boteco-client',
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
    'expo-updates',
    // NOTE: o upload de símbolos aborta o build nativo se o posthog-cli falhar; sem credencial (fork, dev local) o plugin fica de fora.
    ...(hasPostHogUploadCredentials
      ? [['posthog-react-native/expo', { uploadNativeSymbols: true, skipOnConflict: true }] as [string, object]]
      : []),
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
  };
};
