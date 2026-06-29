// eslint.config.mjs — ESLint 9 flat config (monorepo root)
//
// Flat config does NOT read .eslintignore — global ignores live below.
// Install (from repo root):
//   pnpm add -D -w eslint @eslint/js typescript-eslint \
//     eslint-plugin-react eslint-plugin-react-hooks \
//     eslint-plugin-simple-import-sort eslint-config-prettier
//
// Philosophy: ESLint catches bugs/correctness; Prettier owns formatting.
// We DON'T run Prettier as a lint rule — we use eslint-config-prettier (last)
// to switch off any ESLint rule that would fight Prettier.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // 1) Global ignores (the flat-config replacement for .eslintignore)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/.next/**',
      '**/android/**',
      '**/ios/**',
      '**/*.config.js',
      '**/*.config.cjs',
      'expo-env.d.ts',
      '**/next-env.d.ts',
    ],
  },

  // 2) Base recommended rules: JavaScript + TypeScript
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3) React + Hooks + deterministic import sorting (all source files)
  {
    files: ['**/*.{ts,tsx,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // not needed with the modern JSX transform
      'react/prop-types': 'off', // types come from TypeScript
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // 4) TypeScript ergonomics
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 5) (Optional) idiomatic Expo rules for the mobile app:
  //      pnpm add -D -w eslint-config-expo
  //      import expo from 'eslint-config-expo/flat';
  //    then add, scoped to the app:
  //      { files: ['apps/mobile/**/*.{ts,tsx,js,jsx}'], extends: [expo] },

  // 6) Prettier LAST — turns off all formatting-related lint rules
  prettier,
);
