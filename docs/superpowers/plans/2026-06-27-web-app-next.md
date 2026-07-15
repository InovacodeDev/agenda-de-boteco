# App Web (Next.js + Supabase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `apps/web` (Next.js App Router) que replica todas as telas do `apps/mobile` com layout estilo Instagram, movendo toda lógica não-visual para `@agenda/core` com retrocompatibilidade, e ao final remover a parte web do mobile.

**Architecture:** Monorepo pnpm/turbo. Lógica platform-agnostic vive em `@agenda/core`; pontos de plataforma (storage, conectividade, OAuth) são injetados. Mobile mantém UI React Native e importa do core via shims de re-export. Web reescreve telas em DOM/Tailwind consumindo os mesmos services/hooks/stores do core.

**Tech Stack:** Next.js (App Router) · React 19 · Tailwind v4 · TanStack Query · Zustand · Zod · Supabase · react-leaflet.

**Execução em 3 fases.** Cada fase produz software funcional e verificável.

- **Fase 1:** Extração da lógica para `@agenda/core` + shims no mobile + shell web + feed.
- **Fase 2:** Telas web restantes (todas as 13), respeitando `FEATURES`.
- **Fase 3:** Remoção da parte web do `apps/mobile`.

---

## Convenções de teste

- AGENTS.md: todo `services`/`utils` novo ou modificado exige teste unitário verificando o contrato exato. Os `*.test.ts` existentes acompanham seu módulo na mudança.
- Rodar testes do core: `pnpm --filter @agenda/core test` (jest é configurado na Fase 1, Task 0).
- Rodar typecheck global: `pnpm typecheck`.
- Nunca rodar `git commit` automaticamente além do que o plano pede — o usuário gerencia commits externamente. (Os passos "Commit" deixam tudo staged; se a política do executor for não commitar, parar no `git add`.)

---

# FASE 1 — Extração para `@agenda/core` + shell web + feed

## Task 0: Setup de testes no `@agenda/core`

**Files:**
- Modify: `packages/core/package.json`
- Create: `packages/core/jest.config.js`

- [ ] **Step 1: Adicionar jest ao core**

Adicionar em `devDependencies` de `packages/core/package.json`: `"jest": "~29.7.0"`, `"ts-jest": "^29.2.5"`, `"@types/jest": "^29.5.14"`. Adicionar script `"test": "jest"`.

- [ ] **Step 2: Criar `packages/core/jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@agenda/core$': '<rootDir>/src/index.ts',
  },
};
```

- [ ] **Step 3: Instalar e validar**

Run: `pnpm install && pnpm --filter @agenda/core test`
Expected: PASS (0 testes ainda — "No tests found" é aceitável até Task 1).

- [ ] **Step 4: Commit**

```bash
git add packages/core/package.json packages/core/jest.config.js pnpm-lock.yaml
git commit -m "chore(core): add jest test runner"
```

## Task 1: Mover `utils/` + `data/` para o core (juntos)

> **Por que juntos:** há interdependência circular — `data/mock.ts` importa de `utils/{dates,images}` e `utils/{filters,events,geo}` importam de `data/schemas`. Mover só um quebra o outro mesmo com shims. Então `utils/` e `data/` vão na mesma task.

**Acoplamentos descobertos (tratar exatamente assim):**
- `utils/errors.ts` importa `react-native` (`Alert`) e usa o global `__DEV__`. Mover lógica pura; manter parte RN no mobile.
- `utils/geo.ts` faz `import type { LocationStatus } from '../hooks/useUserLocation'` (hook RN). `LocationStatus = 'idle' | 'loading' | 'granted' | 'denied'`.
- `utils/responsiveType.ts` faz `import type { Breakpoint } from '@/hooks/useResponsive'` (hook RN). `Breakpoint = 'sm' | 'md' | 'lg'`.
- `data/schemas.ts` já é **só re-export** de `@agenda/core` (os schemas já vivem no core). No core ele é redundante — `data/lookup.ts` e `data/mock.ts` devem importar os tipos direto de `../schemas` (o módulo de schemas do core) ou de `../index`.

**Files:**
- Create: `packages/core/src/types/platform.ts` (tipos `LocationStatus`, `Breakpoint`)
- Create: `packages/core/src/utils/*.ts` (filters, dates, cn, images, format, links, events, auth, geo, responsiveType, errors) + `*.test.ts` existentes (cn, auth, errors, filters se houver)
- Create: `packages/core/src/data/{mock,lookup,index}.ts` + `data/lookup.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `apps/mobile/src/utils/*.ts` e `apps/mobile/src/data/*.ts` → shims
- Modify: `apps/mobile/src/hooks/useUserLocation.ts` e `useResponsive.ts` (re-exportar o tipo do core)

- [ ] **Step 1: Extrair tipos de plataforma para o core**

Criar `packages/core/src/types/platform.ts`:
```ts
/** Estado da permissão/obtenção de localização (definido aqui para uso por utils puros). */
export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied';
/** Breakpoint responsivo. */
export type Breakpoint = 'sm' | 'md' | 'lg';
```
Adicionar `export * from './platform';` em `packages/core/src/types/index.ts`.
Nos hooks RN do mobile, trocar a **definição** local pelo re-export: em `useUserLocation.ts` substituir `export type LocationStatus = ...` por `export type { LocationStatus } from '@agenda/core';`; idem `Breakpoint` em `useResponsive.ts`.

- [ ] **Step 2: Mover `utils/` puros (git mv) + corrigir imports**

git mv `apps/mobile/src/utils/{filters,dates,cn,images,format,links,events,auth,geo,responsiveType}.ts` e seus `.test.ts` para `packages/core/src/utils/`. Corrigir imports: `../data/schemas` → `../data` (após Step 4) ou direto do core; `../hooks/useUserLocation` → `../types`; `@/hooks/useResponsive` → `../types`.

- [ ] **Step 3: `errors.ts` — separar plataforma**

Mover para `packages/core/src/utils/errors.ts` tudo EXCETO `showUserFriendlyAlert` (que usa `Alert` do RN). Trocar `if (!__DEV__)` por `if (process.env.NODE_ENV === 'production') return;` (agnóstico). Manter `handleServiceError`, `getFriendlyErrorMessage`, `logErrorToTerminal`, `getErrorType`/guards. No mobile, criar `apps/mobile/src/utils/errors.ts` que faz `export * from '@agenda/core';` e ADICIONA:
```ts
import { Alert } from 'react-native';
import { getFriendlyErrorMessage } from '@agenda/core';
export function showUserFriendlyAlert(error: unknown, title = 'Ops!'): void {
  Alert.alert(title, getFriendlyErrorMessage(error), [{ text: 'OK' }]);
}
```
(Conferir quem importa `showUserFriendlyAlert` — segue resolvendo via `@/utils/errors`.)

- [ ] **Step 4: Mover `data/` (git mv mock, lookup, index) + lookup.test.ts**

git mv `apps/mobile/src/data/{mock,lookup,index}.ts` e `data/lookup.test.ts` para `packages/core/src/data/`. NÃO mover `data/schemas.ts` (era só re-export do core). No core, ajustar `data/index.ts` para `export * from './lookup'; export * from './mock';` e os imports de `mock.ts`/`lookup.ts` que apontavam para `./schemas` → apontar para `../schemas` (módulo de schemas do core) ou `../index`. `mock.ts` importa `../utils/dates` e `../utils/images` → agora resolvem dentro do core.

- [ ] **Step 5: Reexportar do índice do core**

Em `packages/core/src/index.ts` adicionar (ordem alfabética entre os blocos):
```ts
export * from './data';
export * from './utils/auth';
export * from './utils/cn';
export * from './utils/dates';
export * from './utils/errors';
export * from './utils/events';
export * from './utils/filters';
export * from './utils/format';
export * from './utils/geo';
export * from './utils/images';
export * from './utils/links';
export * from './utils/responsiveType';
```
> Se houver colisão de nomes no `export *` (ex.: dois módulos exportando o mesmo identificador), trocar pelo re-export nomeado dos símbolos de cada arquivo. Rodar typecheck para detectar.

- [ ] **Step 6: Transformar arquivos do mobile em shims**

Cada `apps/mobile/src/utils/<x>.ts` (exceto `errors.ts`, já tratado) e `apps/mobile/src/data/{mock,lookup,index}.ts` viram `export * from '@agenda/core';`. Manter `apps/mobile/src/data/schemas.ts` como está (já re-exporta do core).

- [ ] **Step 7: Rodar testes do core e typecheck do mobile**

Run: `pnpm --filter @agenda/core test && pnpm --filter @agenda/mobile typecheck`
Expected: suites movidas (cn, auth, errors, lookup, e quaisquer outras) PASS com os MESMOS valores de antes; typecheck do mobile sem erros.

- [ ] **Step 8: Commit (apenas `git add -A`, sem `git commit`)**

```bash
git add -A
```

## Task 2: Mover `theme/`, `config/` para o core

> `data/` já foi movido na Task 1. Esta task move só tokens de tema e feature flags.

**Files:**
- Create: `packages/core/src/{theme,config}/*.ts` + teste (`config/features.test.ts`)
- Modify: `packages/core/src/index.ts`
- Modify: `apps/mobile/src/{theme,config}/*.ts` → shims

> `theme/gradients.ts` foi marcado com acoplamento RN no levantamento (provável `expo-linear-gradient`). Ler antes. Mover só os tokens puros (`colors`, `shadows`, `typography`); `gradients` move se não importar RN/expo, senão fica no mobile e NÃO é reexportado do core.

- [ ] **Step 1: Mover `theme/{colors,shadows,typography}.ts`**; avaliar `gradients.ts`

git mv os puros para `packages/core/src/theme/`. Para `gradients.ts`: ler; se importar RN/expo, deixar no mobile (não mover, não reexportar). Se for puro (só tokens de cor/array), mover também.

- [ ] **Step 2: Mover `config/features.ts` + `config/features.test.ts`**

git mv para `packages/core/src/config/`.

- [ ] **Step 3: Reexportar do índice do core**

Adicionar em `packages/core/src/index.ts`: `export * from './config/features';`, `export * from './theme/colors';`, `export * from './theme/shadows';`, `export * from './theme/typography';` (+ gradients se movido). Resolver colisões com re-export nomeado se o typecheck acusar.

- [ ] **Step 4: Shims no mobile**

`apps/mobile/src/theme/{colors,shadows,typography}.ts` e `apps/mobile/src/config/features.ts` viram `export * from '@agenda/core';`. `gradients.ts` permanece no mobile se acoplado.

- [ ] **Step 5: Rodar testes e typecheck**

Run: `pnpm --filter @agenda/core test && pnpm --filter @agenda/mobile typecheck`
Expected: `features.test.ts` PASS; typecheck OK.

- [ ] **Step 6: Commit (apenas `git add -A`)**

```bash
git add -A
git commit -m "refactor(core): move data/theme/config from mobile"
```

## Task 3: Storage injetável + mover stores SEM dep de service

> **Ordem corrigida:** `useAuthStore` importa `../services/auth` e `useFavoritesStore` importa `@/services/favorites`. Como o core NÃO pode importar de `apps/`, esses dois stores só podem mover JUNTO dos services (Task 4). Esta task move os 3 stores restantes: `useFiltersStore` (não persiste), `useNotificationsStore` e `usePreferencesStore` (persistem via `appJsonStorage`). `usePreferencesStore` depende de `utils/geo` e `data/schemas` (já no core). Cria o módulo de storage injetável que a Task 4 também usará.

**Files:**
- Create: `packages/core/src/platform/storage.ts`
- Create: `packages/core/src/stores/{useFiltersStore,useNotificationsStore,usePreferencesStore}.ts` + seus `*.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `apps/mobile/src/store/{useFiltersStore,useNotificationsStore,usePreferencesStore}.ts` → shims
- Modify: `apps/mobile/src/store/storage.ts` (mantém adapter RN + chama configureAppStorage)
- Modify: `apps/mobile/app/_layout.tsx` (garantir bootstrap do storage antes do uso)

- [ ] **Step 1: Módulo de storage injetável no core**

`packages/core/src/platform/storage.ts`:
```ts
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

let configured: StateStorage | null = null;

/** Cada app chama uma vez no bootstrap (mobile = AsyncStorage, web = localStorage). */
export function configureAppStorage(storage: StateStorage): void {
  configured = storage;
}

/** StateStorage configurado. Lança se chamado antes do bootstrap. */
export function getAppStorage(): StateStorage {
  if (!configured) {
    throw new Error('App storage não configurado. Chame configureAppStorage no bootstrap.');
  }
  return configured;
}

/** JSON storage do zustand sobre o storage configurado (lazy — resolve no hidrate). */
export const appJsonStorage = createJSONStorage(() => getAppStorage());
```
> `createJSONStorage` recebe um thunk; ele só invoca `getAppStorage()` quando o `persist` realmente lê/grava, depois do bootstrap. Adicionar `export * from './platform/storage';` no índice do core.

- [ ] **Step 2: Mover os 3 stores + testes (git mv) para `packages/core/src/stores/`**

git mv `useFiltersStore.ts`, `useNotificationsStore.ts`, `usePreferencesStore.ts` (+ `.test.ts`) para `packages/core/src/stores/`. Corrigir imports: `./storage` (que exportava `appJsonStorage`) → `../platform/storage`; `../utils/filters` → `../utils/filters`; `@/data/schemas` → `../schemas`; `@/utils/geo` → `../utils/geo`. NÃO mexer na lógica.

- [ ] **Step 3: Reexportar do índice do core**

Adicionar em `packages/core/src/index.ts`:
```ts
export * from './stores/useFiltersStore';
export * from './stores/useNotificationsStore';
export * from './stores/usePreferencesStore';
```
Resolver colisões (TS2308) com re-export nomeado se preciso.

- [ ] **Step 4: Shims no mobile + bootstrap do storage**

`apps/mobile/src/store/{useFiltersStore,useNotificationsStore,usePreferencesStore}.ts` → `export * from '@agenda/core';`.
`apps/mobile/src/store/storage.ts` passa a:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { appJsonStorage, configureAppStorage } from '@agenda/core';

configureAppStorage(AsyncStorage);

/** Re-export para compat com imports existentes de `./storage`. */
export { appJsonStorage };
```
Garantir que `app/_layout.tsx` importe `'../src/store/storage'` (ou já importa via algum store) ANTES de qualquer uso de store persistido — adicionar import explícito no topo do `_layout.tsx` se necessário. Confirmar que algo no boot importa esse módulo.

- [ ] **Step 5: Ajustar os testes dos stores movidos para configurar storage**

Os testes de `useNotificationsStore`/`usePreferencesStore` criam o store (que chama `persist` → `appJsonStorage` lazy). No env `node` do core não há AsyncStorage. Adicionar no topo de cada `*.test.ts` que envolva store persistido um setup configurando memória:
```ts
import { configureAppStorage } from '@agenda/core';

const mem = new Map<string, string>();
configureAppStorage({
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => { mem.set(k, v); },
  removeItem: (k) => { mem.delete(k); },
});
```
Colocar ANTES do import do store (ordem de import importa: configurar storage antes de o módulo do store ser avaliado). Como ESM hoista imports, usar um arquivo de setup OU mover o `configureAppStorage` para um import com efeito colateral que precede. Solução robusta: adicionar em `jest.config.js` do core `setupFiles: ['<rootDir>/jest.setup.ts']` com o memoryStorage configurado globalmente; criar `packages/core/jest.setup.ts`. Os asserts dos testes NÃO mudam de valor.
> `useFiltersStore` não persiste — seu teste não precisa de storage.

- [ ] **Step 6: Rodar testes e typecheck**

Run: `pnpm --filter @agenda/core test && pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile test 2>&1 | tail -15`
Expected: 3 suites de store no core PASS com mesmos valores; typecheck do mobile OK; suíte do mobile sem novas falhas (a falha pré-existente de features.test.ts já saiu para o core na Task 2).

- [ ] **Step 7: Commit (apenas `git add -A`)**

```bash
git add -A
git commit -m "refactor(core): move zustand stores with injectable storage"
```

## Task 4a: Client configurável + services + connectivity + auth (split) + stores auth/favorites

> Subdividida da Task 4 original (grande demais). Esta task move a camada de **dados/serviços**; a Task 4b move os **hooks de query + queryClient**.

**Acoplamentos descobertos (tratar exatamente):**
- Services `catalog`, `favorites`, `proximity` usam `getSupabase` do mobile (`@/lib/supabase` ou `../lib/supabase`). `realtime`, `cachePolicy`, `queryKeys` são puros.
- `auth.ts` é fortemente acoplado: `expo-linking` (`Linking.createURL`), `expo-web-browser` (`WebBrowser.openAuthSessionAsync`), `Platform.OS`, e `getSupabase`. As funções `signInWithProvider` (OAuth via WebBrowser) e `handleDeepLink` são as ÚNICAS partes RN; o resto só usa o client.
- `pressGuard.ts` é **puro** (o grep antigo pegou "expo" só num comentário) — pode mover.
- `connectivity.ts` usa NetInfo + AppState (RN) com `subscribe` já injetável.

- [ ] **Step 1: Client supabase configurável no core**

Em `packages/core/src/supabase/client.ts` adicionar (mantendo `createSupabaseClient`):
```ts
let getter: (() => SupabaseClient<Database> | null) | null = null;
/** Cada app registra seu getter de client no bootstrap (mobile = expo-secure-store, web = localStorage). */
export function configureSupabase(fn: () => SupabaseClient<Database> | null): void {
  getter = fn;
}
/** Client configurado, ou null se não houver (mantém o app funcional sem login). */
export function getConfiguredSupabase(): SupabaseClient<Database> | null {
  return getter ? getter() : null;
}
```
(`isSupabaseConfigured` no core: `getConfiguredSupabase() !== null`.)

- [ ] **Step 2: Mover services puros + os que usam o client (git mv) para `packages/core/src/services/`**

git mv `catalog, favorites, proximity, realtime, cachePolicy, queryKeys` (+ `.test.ts`) para o core. Trocar `import { getSupabase } from '@/lib/supabase'` (e variantes `../lib/supabase`) por `import { getConfiguredSupabase } from '../supabase/client'` e as chamadas `getSupabase()` → `getConfiguredSupabase()`. Corrigir imports `@/data`/`@/utils` → relativos do core. NÃO mudar lógica. Os testes que mockam `@/lib/supabase` passam a mockar `../supabase/client` (`getConfiguredSupabase`).

- [ ] **Step 3: Mover `pressGuard.ts` (puro) + teste**

git mv `apps/mobile/src/utils/pressGuard.ts` (+ `.test.ts` se houver) para `packages/core/src/utils/`. Shim no mobile. Reexportar no índice. (Necessário porque `useGuardedPress` na Task 4b depende dele.)

- [ ] **Step 4: `connectivity.ts` — remover defaults RN**

Mover `services/connectivity.ts` (+ teste) para o core. Remover o default `NetInfo.addEventListener` e `defaultAppStateSubscribe` (AppState é RN). Definir tipos próprios (sem RN):
```ts
export interface ConnectivityState { isConnected: boolean | null; isInternetReachable: boolean | null; }
export type ConnectivitySubscribe = (listener: (s: ConnectivityState) => void) => () => void;
export type FocusSubscribe = (listener: (isActive: boolean) => void) => () => void;
```
`setupOnlineManager(subscribe: ConnectivitySubscribe)` e `setupFocusManager(subscribe: FocusSubscribe)` SEM default (subscribe obrigatório). Manter a lógica de online (isConnected && isInternetReachable !== false). Ajustar `setupFocusManager` para usar `FocusSubscribe` (boolean) em vez de `AppStateStatus`; o mobile adapta `AppState` → boolean (`status === 'active'`) no bootstrap (Task 4b). Ajustar o teste para os novos tipos, MESMO comportamento de online/offline (não enfraquecer asserts).

- [ ] **Step 5: `auth.ts` — split por função (core agnóstico + wrapper RN no mobile)**

Mover para `packages/core/src/services/auth.ts` TUDO que só usa o client: `AuthUser`, `AuthProvider`, `AuthUnavailableError`, `isAuthAvailable`, `mapUser`, `getCurrentUser`, `onAuthUserChange`, `signOut`, `requestAccountDeletion`, `signInWithEmailOtp`, `verifyEmailOtp`. Trocar `getSupabase`/`isSupabaseConfigured` por `getConfiguredSupabase`/`isSupabaseConfigured` do core. `buildRedirectUrl` no core: aceitar via parâmetro/injeção OU mover só a parte que não usa Linking. `signInWithEmailOtp`/`verifyEmailOtp` usam `buildRedirectUrl` (Linking.createURL) → tornar o redirect injetável: `signInWithEmailOtp(email, redirectTo)` recebendo a URL pronta, OU um módulo `configureAuthRedirect(fn)`. **Escolha:** adicionar `configureAuthRedirect(() => string)` no core (default retorna '' → supabase usa o site URL); mobile chama `configureAuthRedirect(() => Linking.createURL('/'))` no bootstrap.
Manter NO MOBILE (`apps/mobile/src/services/auth.ts`, que vira shim + extras): `signInWithProvider` (usa WebBrowser/Platform/Linking) e `handleDeepLink`. Estrutura do arquivo mobile:
```ts
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  type AuthProvider,
  AuthUnavailableError,
  getConfiguredSupabase,
  handleServiceError,
  logErrorToTerminal,
  parseAuthTokensFromUrl,
} from '@agenda/core';

export * from '@agenda/core';

function requireClient() {
  const client = getConfiguredSupabase();
  if (!client) throw new AuthUnavailableError();
  return client;
}
// signInWithProvider(provider) e handleDeepLink(url) — corpos idênticos aos atuais,
// usando requireClient()/Linking/WebBrowser/Platform.
```
Dividir `auth.test.ts`: a parte que testa `signInWithProvider`/`handleDeepLink` (mocka expo-linking/expo-web-browser) FICA no mobile (`apps/mobile/src/services/auth.test.ts`), mockando `@agenda/core` para `getConfiguredSupabase`. A parte que testa as funções agnósticas vai para `packages/core/src/services/auth.test.ts`, mockando `../supabase/client` (`getConfiguredSupabase`). Asserts idênticos aos atuais — só muda o que é mockado e onde.

- [ ] **Step 6: Mover stores `useAuthStore` e `useFavoritesStore`**

git mv para `packages/core/src/stores/`. `useAuthStore` importa `../services/auth`; `useFavoritesStore` importa `../services/favorites` e `appJsonStorage` de `../platform/storage`. Shims no mobile. O teste de `useFavoritesStore` mocka `@/services/favorites` → mockar `../services/favorites` (módulo do core). Storage em memória já vem do `jest.setup.ts` do core.

- [ ] **Step 7: Reexportar no índice do core + shims no mobile**

Adicionar exports de services/auth/connectivity/stores/pressGuard no `index.ts`. `apps/mobile/src/services/{catalog,favorites,proximity,realtime,cachePolicy,queryKeys,connectivity}.ts`, `store/{useAuthStore,useFavoritesStore}.ts`, `utils/pressGuard.ts` viram shims. `services/auth.ts` é o shim+extras do Step 5. Resolver colisões TS2308 com re-export nomeado.

- [ ] **Step 8: Validar**

Run: `pnpm --filter @agenda/core test 2>&1 | tail -20 && pnpm --filter @agenda/core typecheck && pnpm --filter @agenda/mobile typecheck`
Expected: todas as suites de service/store/auth PASS com contratos idênticos; typecheck OK em ambos. (A falha pré-existente de features.test.ts pode persistir — não é desta task.)

- [ ] **Step 9: `git add -A`** (sem commit)

## Task 4b: hooks de query + queryClient + persister + bootstrap do mobile

**Acoplamentos:**
- `queryClient` usa `showUserFriendlyAlert` (que ficou no mobile, usa `Alert`) no `onError`. → injetar o handler de erro.
- `useGuardedPress` usa `utils/pressGuard` (movido na 4a).
- `useConnectivity` é puro (só `onlineManager`).
- `lib/queryPersister.ts` usa AsyncStorage → factory injetável.

- [ ] **Step 1: queryClient com error handler injetável**

`packages/core/src/lib/queryClient.ts`: substituir o import de `showUserFriendlyAlert` por um handler configurável:
```ts
let errorHandler: (error: unknown) => void = () => {};
/** Cada app registra como exibir erros (mobile = Alert, web = toast/console). */
export function configureQueryErrorHandler(fn: (error: unknown) => void): void {
  errorHandler = fn;
}
```
e nos `onError` (QueryCache/MutationCache) chamar `errorHandler(error)`. Manter os valores de `staleTime`/`gcTime`/`retry` IDÊNTICOS.

- [ ] **Step 2: Mover hooks (git mv) para `packages/core/src/hooks/`**

git mv `queries, useActiveCity, useNearbyEstablishments, useGuardedPress, useConnectivity` (+ testes) para o core. Corrigir aliases `@/services/*`, `@/data/*`, `@/utils/*`, `@/store/*`, `@/hooks/*` → relativos do core. `useConnectivity` move sem mudança.

- [ ] **Step 3: Persister factory no core**

`packages/core/src/lib/queryPersister.ts`:
```ts
import { type AsyncStorage as RQAsyncStorage, createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/** Persister do cache do TanStack Query sobre um storage injetado. */
export function createQueryPersister(storage: RQAsyncStorage) {
  return createAsyncStoragePersister({ storage, key: 'agenda-query-cache', throttleTime: 2000 });
}
```
Adicionar `@tanstack/query-async-storage-persister` e `@tanstack/react-query` às deps do core (versões iguais às do mobile). Mobile: `apps/mobile/src/lib/queryPersister.ts` vira `export const persister = createQueryPersister(AsyncStorage);`.

- [ ] **Step 4: Reexportar no índice + shims no mobile**

`apps/mobile/src/hooks/{queries,useActiveCity,useNearbyEstablishments,useGuardedPress,useConnectivity}.ts` e `lib/queryClient.ts` viram shims. Adicionar exports no `index.ts`.

- [ ] **Step 5: Bootstrap completo do mobile**

Em `apps/mobile/app/_layout.tsx` (ou no módulo de bootstrap importado por ele), ANTES do uso:
- `configureSupabase(getSupabase)` (de `@/lib/supabase`)
- `configureAuthRedirect(() => Linking.createURL('/'))`
- `configureQueryErrorHandler(showUserFriendlyAlert)` (de `@/utils/errors`)
- `setupOnlineManager(<NetInfo adapter → ConnectivityState>)` e `setupFocusManager(<AppState adapter → boolean>)` — onde antes esses tinham default NetInfo/AppState, agora o mobile passa os adapters. Conferir onde `setupOnlineManager`/`setupFocusManager` são chamados hoje no mobile e atualizar a chamada para passar o subscribe.
`configureAppStorage(AsyncStorage)` já é feito por `@/store/storage` (Task 3).

- [ ] **Step 6: Validar**

Run: `pnpm --filter @agenda/core test 2>&1 | tail -20 && pnpm --filter @agenda/core typecheck && pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile lint && pnpm --filter @agenda/mobile test 2>&1 | tail -15`
Expected: todas as suites PASS com contratos idênticos; typecheck/lint OK; suíte mobile sem novas falhas.

- [ ] **Step 7: `git add -A`** (sem commit)

## Task 5: Scaffold `apps/web` (Next.js + Tailwind v4)

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/page.tsx`, `apps/web/.eslintrc` (ou usar flat root)

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@agenda/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@agenda/core": "workspace:*",
    "@tanstack/react-query": "^5.101.0",
    "@tanstack/react-query-persist-client": "^5.101.0",
    "@tanstack/query-async-storage-persister": "^5.101.0",
    "@supabase/supabase-js": "^2.106.2",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "zustand": "^5.0.14",
    "zod": "3.23.8",
    "next": "^15.1.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-leaflet": "^4.2.1",
    "leaflet": "^1.9.4"
  },
  "devDependencies": {
    "@agenda/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "@types/leaflet": "^1.9.12",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "extends": "@agenda/typescript-config/base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: `next.config.ts`** (transpilar o pacote workspace)

```ts
import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@agenda/core'],
};
export default config;
```

- [ ] **Step 4: `postcss.config.mjs`**

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

- [ ] **Step 5: `app/globals.css`** — importar Tailwind + tokens

Copiar os tokens de cor de `apps/mobile/src/global.css` (bloco `@theme { --color-* }`) para `apps/web/app/globals.css`, adaptados para web (sem `@media android/ios`; usar fontes web). Estrutura:
```css
@import 'tailwindcss';
@theme {
  --color-background: #0f0f0f;
  --color-foreground: #fafafa;
  /* ...resto dos tokens copiados do mobile... */
}
body { background: var(--color-background); color: var(--color-foreground); }
```

- [ ] **Step 6: `app/layout.tsx`** mínimo + `app/page.tsx` placeholder

```tsx
import './globals.css';
export const metadata = { title: 'Agenda de Boteco' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body>{children}</body></html>);
}
```
```tsx
export default function Home() { return <main>web ok</main>; }
```

- [ ] **Step 7: Instalar e subir**

Run: `pnpm install && pnpm --filter @agenda/web dev`
Expected: Next sobe; `localhost:3000` mostra "web ok". (Verificar via preview tools.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(web): scaffold next.js app with tailwind v4 and shared tokens"
```

## Task 6: Providers web (Supabase + React Query + storage)

**Files:**
- Create: `apps/web/lib/supabase.ts`, `apps/web/lib/storage.ts`, `apps/web/app/providers.tsx`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Adapter de storage web**

`apps/web/lib/storage.ts`:
```ts
'use client';
import type { StateStorage } from 'zustand/middleware';
/** localStorage como StateStorage; SSR-safe (no-op no servidor). */
export const webStorage: StateStorage = {
  getItem: (k) => (typeof window === 'undefined' ? null : window.localStorage.getItem(k)),
  setItem: (k, v) => { if (typeof window !== 'undefined') window.localStorage.setItem(k, v); },
  removeItem: (k) => { if (typeof window !== 'undefined') window.localStorage.removeItem(k); },
};
```

- [ ] **Step 2: Supabase web**

`apps/web/lib/supabase.ts`:
```ts
import { createSupabaseClient } from '@agenda/core';
let client: ReturnType<typeof createSupabaseClient> | null | undefined;
export function getSupabase() {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && anonKey
    ? createSupabaseClient({ url, anonKey, storage: undefined, detectSessionInUrl: true })
    : null;
  return client;
}
```

- [ ] **Step 3: Providers**

`apps/web/app/providers.tsx` (client component): chama `configureAppStorage(webStorage)`, `configureSupabase(getSupabase)`, `setupOnlineManager(<navigator.onLine subscribe>)`; monta `PersistQueryClientProvider` com `queryClient` do core + `createQueryPersister(<localStorage RQ adapter>)`.

navigator subscribe:
```ts
const onlineSubscribe = (listener) => {
  const update = () => listener({ isConnected: navigator.onLine, isInternetReachable: navigator.onLine });
  window.addEventListener('online', update); window.addEventListener('offline', update);
  update();
  return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
};
```
RQ async storage adapter sobre localStorage:
```ts
const rqStorage = {
  getItem: async (k) => window.localStorage.getItem(k),
  setItem: async (k, v) => window.localStorage.setItem(k, v),
  removeItem: async (k) => window.localStorage.removeItem(k),
};
```

- [ ] **Step 4: Envolver layout com Providers**

`app/layout.tsx` renderiza `<Providers>{children}</Providers>`.

- [ ] **Step 5: Validar**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web dev`
Expected: typecheck OK; app sobe sem erro de console (verificar via preview console logs).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): supabase, react-query and storage providers"
```

## Task 7: Shell estilo Instagram (sidebar + container central)

**Files:**
- Create: `apps/web/components/shell/Sidebar.tsx`, `apps/web/components/shell/BottomNav.tsx`, `apps/web/components/shell/AppShell.tsx`
- Modify: `apps/web/app/layout.tsx` (ou um `(app)/layout.tsx`)

- [ ] **Step 1: `AppShell`**

Layout flex: sidebar fixa à esquerda (largura ~245px em ≥lg), `<main>` centralizado com `max-w-[630px] mx-auto px-4`. Em `<md` a sidebar some e aparece `BottomNav` fixa embaixo. Itens de nav vindos das mesmas rotas: Feed (`/`), Favoritos (`/favoritos`), Avisos (`/avisos`), Mapa (`/mapa`), Perfil (`/perfil`). Itens bloqueados por `FEATURES` (do core) renderizam mas levam à página "Em construção" (espelha o comportamento do mobile).

- [ ] **Step 2: `Sidebar`** — links ativos via `usePathname()`, ícones (lucide-react ou SVG inline; preferir SVG inline para não add dep — `ponytail:` evitar nova lib de ícones se 5 SVGs resolvem).

- [ ] **Step 3: `BottomNav`** — mesma lista, layout horizontal fixo `bottom-0`.

- [ ] **Step 4: Aplicar shell ao grupo de rotas do app.**

- [ ] **Step 5: Validar responsividade**

Run: `pnpm --filter @agenda/web dev`; usar preview_resize em 1280px e 375px.
Expected: ≥lg mostra sidebar + container 630px centralizado; <md mostra bottom nav. Screenshot de prova.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): instagram-style app shell with sidebar and bottom nav"
```

## Task 8: Tela de Feed (web)

**Files:**
- Create: `apps/web/app/page.tsx` (feed) + componentes web em `apps/web/components/feed/*` (EventCard, SearchBar, QuickFilterChips, StyleCard, FeedHeader)

- [ ] **Step 1: Reescrever componentes do feed em DOM/Tailwind**

Espelhar `apps/mobile/src/components/feed/*` e `event/EventCard.tsx` como HTML. Consumir `useEventsQuery`, `useMusicStylesQuery` do core. Manter classes Tailwind equivalentes aos tokens.

- [ ] **Step 2: Montar a página de feed** usando os componentes + estados loading/empty (reusar `EmptyState` reescrito se necessário).

- [ ] **Step 3: Validar**

Run: `pnpm --filter @agenda/web dev`; preview_snapshot da home.
Expected: feed renderiza eventos (mock ou Supabase), filtros e busca presentes. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): feed screen"
```

---

# FASE 2 — Telas web restantes

> Cada tela: reescrever componentes RN correspondentes em DOM/Tailwind, consumir hooks/services do core, respeitar `FEATURES`. Uma task por tela/grupo. Padrão de cada task: criar rota em `apps/web/app/...`, criar componentes web espelhando `apps/mobile/src/components/...`, validar com preview (snapshot/screenshot), commit.

## Task 9: Favoritos — `apps/web/app/favoritos/page.tsx`
Consome `useFavoritesStore` + lista de eventos/estabelecimentos favoritados. Reusa `EventCard`/`EstablishmentCard` web. Validar + commit.

## Task 10: Login + Onboarding — `apps/web/app/login/page.tsx`, `apps/web/app/onboarding/page.tsx`
Login usa `auth` service do core com `openAuthUrl = (url) => window.location.assign(url)`. Onboarding espelha os passos do mobile. Validar + commit.

## Task 11: Perfil + Excluir conta + Privacidade — `apps/web/app/perfil`, `/excluir-conta`, `/privacidade`
Perfil usa `useAuthStore`. Excluir-conta replica o fluxo de deleção. Privacidade é conteúdo estático espelhado. Validar + commit.

## Task 12: Cidade + Filtros — `apps/web/app/cidade`, `/filtros`
Cidade usa `useActiveCity`/`useCitiesQuery`. Filtros reescreve `components/filters/*` (DateRangeField com `<input type="date">` nativo, FilterSlider com `<input type="range">`, SwitchRow com checkbox) ligados ao `useFiltersStore`. Validar + commit.

## Task 13: Avisos — `apps/web/app/avisos/page.tsx`
Respeita `FEATURES.notifications`. Reescreve `NotificationCard`. Consome `useNotificationsQuery`/`useNotificationsStore`. Validar + commit.

## Task 14: Detalhe de Evento — `apps/web/app/event/[id]/page.tsx`
Reescreve `EventCard`/`EventPhotoCarousel` (carrossel com CSS scroll-snap, sem lib). Consome `useEventQuery`. Validar + commit.

## Task 15: Detalhe de Estabelecimento — `apps/web/app/establishment/[id]/page.tsx`
Respeita `FEATURES.establishmentDetail`. Reescreve `EstablishmentCard`/`AgendaItem`/`MenuItemRow`. Consome `useEstablishmentQuery`/`useEventsByEstablishmentQuery`. Validar + commit.

## Task 16: Mapa — `apps/web/app/mapa/page.tsx` (react-leaflet)
Respeita `FEATURES.map`. Componente `'use client'` com `MapContainer`/`TileLayer` (OpenStreetMap) + `Marker` por estabelecimento da cidade ativa; clique no marker abre card. CSS do leaflet importado. SSR off para o mapa (`dynamic(() => import(...), { ssr: false })`). Validar + commit.

## Task 17: Página "Em construção" + roteamento por flags
`apps/web/components/feedback/UnderConstruction.tsx` espelhando o mobile. Rotas bloqueadas por `FEATURES` renderizam esse componente. Validar + commit.

## Task 18: Verificação integrada Fase 2
Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web build`
Expected: build de produção passa, todas as rotas geram. Navegar por todas as telas via preview; screenshots das principais. Commit de qualquer ajuste.

---

# FASE 3 — Remoção da parte web do `apps/mobile`

## Task 19: Remover artefatos web do mobile

**Files:**
- Delete: `apps/mobile/src/screens/map/MapScreen.web.tsx`
- Modify: `apps/mobile/app.config.ts` (remover bloco `web`)
- Modify: `apps/mobile/package.json` (remover scripts/deps web)

- [ ] **Step 1: Remover `MapScreen.web.tsx`**

Verificar que `MapScreen.native.tsx` é o único resolvido. Conferir o ponto de import (provavelmente `app/(tabs)/map.tsx` importa `screens/map/MapScreen`). Ajustar para importar diretamente o native se a resolução por plataforma deixar de existir.

- [ ] **Step 2: Remover `web` do `app.config.ts`**

Apagar o bloco:
```ts
web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'static' },
```

- [ ] **Step 3: Remover scripts/deps web do `package.json`**

Remover script `"web": "expo start --web"`. Remover deps usadas só na web: `react-native-web`, `react-dom` (confirmar que jest-expo/testing-library não precisam — se precisarem, manter `react-dom` em devDeps), `@expo/metro-runtime` override se aplicável. Remover `react-dom` do `pnpm.overrides` raiz **somente** se nenhum outro app usar — `apps/web` e `apps/admin` usam `react-dom`, então **manter** o override raiz.

- [ ] **Step 4: Remover `dist/` web do mobile** se versionado.

Run: `git rm -r --cached apps/mobile/dist 2>/dev/null; rm -rf apps/mobile/dist`

- [ ] **Step 5: Validar mobile**

Run: `pnpm install && pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile lint && pnpm --filter @agenda/mobile test`
Expected: tudo PASS sem dependências web.

- [ ] **Step 6: Validar que web e admin seguem OK**

Run: `pnpm --filter @agenda/web build && pnpm --filter @agenda/admin build`
Expected: ambos buildam.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(mobile): remove web platform support"
```

## Task 20: Atualizar `.gitignore` do mobile e docs
Garantir que `apps/web/.next` e `apps/web/out` estão no `.gitignore`. Atualizar README se mencionar `expo start --web`. Commit.

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** extração core (Tasks 1–4), storage/conectividade/oauth injetáveis (Tasks 3–4, 6), shell Instagram (Task 7), todas as 13 telas (Tasks 8–17), mapa leaflet (Task 16), flags FEATURES (Tasks 7,13,15,16,17), retrocompat via shims (Tasks 1–4), admin preservado (Task 19 step 6), remoção web do mobile (Tasks 19–20). ✓
- **Consistência de tipos:** `configureAppStorage`/`getAppStorage`, `configureSupabase`/`getConfiguredSupabase`, `createJsonStorage`, `createQueryPersister`, `setupOnlineManager(subscribe)`, `ConnectivityState`/`ConnectivitySubscribe`, `signInWithProvider({openAuthUrl})` — usados consistentemente. ✓
- **Riscos conhecidos a confirmar em runtime:** (a) `utils/errors.ts` e `theme/gradients.ts` podem ter acoplamento RN — Tasks 1/2 mandam ler antes de mover; (b) colisões de `export *` no índice do core → usar re-exports nomeados; (c) `react-dom` em devDeps do mobile para testes — confirmar na Task 19.
