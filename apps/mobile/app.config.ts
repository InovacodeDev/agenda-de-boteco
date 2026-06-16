import type { ConfigContext, ExpoConfig } from 'expo/config';

// Validação defensiva para garantir que chaves críticas não fiquem undefined em produção/preview
const getEnvVar = (value: string | undefined, name: string): string => {
  const isEasProduction = process.env.EAS_BUILD_PROFILE === 'production' || process.env.EAS_BUILD_PROFILE === 'preview';
  if (!value && isEasProduction) {
    throw new Error(`[FALHA NO BUILD] A variável de ambiente obrigatória "${name}" não foi definida.`);
  }
  return value || '';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Agenda de Boteco',
  slug: 'agenda-de-boteco',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'agenda-de-boteco',
  userInterfaceStyle: 'dark',
  owner: 'inovacode',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.agenda.boteco',
    config: {
      usesNonExemptEncryption: false,
      googleMapsApiKey: getEnvVar(process.env.GOOGLE_MAPS_API_KEY_IOS, 'GOOGLE_MAPS_API_KEY_IOS'),
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
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    output: 'static',
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
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Usamos sua localização para mostrar bares e eventos perto de você.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '14d06c33-6b50-40ef-81b6-ab4a404b3e7f',
    },
  },
});
