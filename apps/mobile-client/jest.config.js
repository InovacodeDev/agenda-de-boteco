/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/{src,app}/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    // OfflineBanner (via barrel do shared-ui-mobile) importa o reanimated, cujo
    // runtime nativo não existe no jest; o mock oficial da lib cobre isso.
    '^react-native-reanimated$': 'react-native-reanimated/mock',
    '^react-native-worklets$': 'react-native-worklets/src/mock',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-css|nativewind|zustand|@supabase/.*|@tanstack/.*|@agenda/.*|phosphor-react-native|@shopify/flash-list))',
  ],
};
