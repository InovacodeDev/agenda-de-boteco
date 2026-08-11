# Agenda de Boteco

Monorepo (Turborepo + pnpm) com app mobile (Expo) e painel administrativo (Vite).

## Estrutura

```
apps/
  mobile/             # @agenda/mobile — Expo SDK 56 · expo-router · NativeWind · FlashList · Zustand
  admin/              # @agenda/admin — Vite + React (painel administrativo, SSG via output: static)
packages/
  core/               # @agenda/core — pacote interno source-only: client Supabase (fábrica), tipos e schemas Zod
  typescript-config/  # @agenda/typescript-config — tsconfig base compartilhado (sem tsconfig na raiz)
```

O `core` é um pacote interno **source-only** (padrão Just-in-Time do Turborepo): não tem build,
é consumido como fonte por ambos os apps. Ele expõe `createSupabaseClient({ url, anonKey, storage?, detectSessionInUrl })`
para que cada app injete seu próprio env e adaptador de storage.

## Pré-requisitos

- Node (ver `.nvmrc`)
- `pnpm` (nunca npm/yarn)

## Setup

```bash
pnpm install
cp .env.example .env   # preencha os valores do Supabase
```

Variáveis de ambiente:

- **mobile**: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **admin**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`

## Comandos (raiz)

```bash
pnpm dev         # sobe todos os apps em modo dev (turbo)
pnpm lint        # eslint em todos os workspaces
pnpm typecheck   # tsc --noEmit em todos os workspaces
pnpm build       # build de produção (admin + export web do mobile)
```

### Por app

```bash
pnpm --filter @agenda/mobile ios       # Expo iOS
pnpm --filter @agenda/mobile android   # Expo Android
pnpm --filter @agenda/mobile web       # Expo web
pnpm --filter @agenda/admin dev        # Vite dev server

pnpm --filter @agenda/core gen:types   # regenera os tipos do Supabase (requer SUPABASE_PROJECT_ID)
```

## Notas

- Expo SDK 56 mudou bastante — leia a doc versionada em https://docs.expo.dev/versions/v56.0.0/ antes de codar.
- Os tipos do banco (`packages/core/src/types/database.types.ts`) são **gerados** — nunca edite à mão.
