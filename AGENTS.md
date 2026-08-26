# 📐 Visão Geral do Projeto & Guia do Agente (AGENTS.md)

## 1. Visão Geral da Arquitetura & Ecossistema

**Agenda de Boteco** é um monorepo **pnpm 10.20.0 workspaces** + **Turborepo ^2.0.4** que entrega um catálogo de bares e eventos com música ao vivo, filtro por estilo/distância/atributos e busca por proximidade geográfica. Toda a stack é **TypeScript ^6.0.3 em modo estrito** (`packages/typescript-config/base.json`: `strict`, `isolatedModules`, `moduleResolution: Bundler`, `target: ES2022`, `noEmit`).

O padrão arquitetural real é **núcleo compartilhado platform-agnostic + clientes finos**: `@agenda/core` concentra schemas, serviços, cache, stores e utilitários; os quatro apps consomem esse núcleo e só implementam UI e bootstrap de plataforma.

### Versões exatas instaladas

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| Runtime/tooling | Node 22 (CI) · pnpm | `10.20.0` |
| Orquestração | Turborepo | `^2.0.4` |
| Linguagem | TypeScript | `^6.0.3` |
| UI base | React · React DOM | `19.2.3` (override no root) |
| Web / Admin / Landing | Next.js (App Router) | `^15.1.0` |
| Mobile | Expo · React Native | `~56.0.12` · `0.85.3` |
| Roteamento mobile | Expo Router (`typedRoutes`) | `^56.2.11` |
| Estilo | Tailwind CSS · `@tailwindcss/postcss` | `^4.0.0` |
| Estilo mobile | NativeWind · react-native-css | `5.0.0-preview.2` · `0.0.0-nightly.5ce6396` (patched) |
| Estado servidor | TanStack Query (+ persist-client, async-storage-persister) | `^5.101.0` |
| Estado cliente | Zustand | `^5.0.14` |
| Validação | Zod | `3.23.8` (pin exato nos apps) |
| Backend | `@supabase/supabase-js` · Postgres | `^2.106.2` · `major_version = 17` + PostGIS |
| Listas | `@shopify/flash-list` | `^2.0.2` |
| Animação | react-native-reanimated · react-native-worklets | `^4.3.1` · `^0.8.3` |
| Mapas | react-native-maps (mobile) · leaflet + react-leaflet (web) | `1.27.2` · `^1.9.4` + `^5.0.0` |
| Ícones | `@phosphor-icons/react` (web/admin) · `phosphor-react-native` (mobile) | `^2.1.10` · `^3.0.6` |
| Auth nativa | expo-apple-authentication · expo-secure-store | `~56.0.4` · `^56.0.4` |
| Fontes | `@expo-google-fonts/inter` · `space-grotesk` | `^0.4.2` · `^0.4.1` |
| Analytics | `@vercel/analytics` | `^2.0.1` |
| Lint | ESLint (flat config) + typescript-eslint | `^9.39.4` + `^8.60.1` |
| Format | Prettier + prettier-plugin-tailwindcss | `^3.8.4` + `^0.8.0` |
| Testes | Jest · ts-jest · jest-expo · @testing-library/react-native | `~29.7.0` · `^29.2.5` · `^56.0.5` · `^14.0.0` |

Não há Sentry/Datadog/OpenTelemetry, Playwright/Detox, Biome, Commitlint, Knip ou Codecov no repositório. Introduzir qualquer um exige autorização (ver `AGENTS_RULES.md`, item 15).

### Portas de desenvolvimento

`landing` **8087** · `web` **8088** · `admin` **8089** · `mobile` **10002** · Supabase local: API **54321**, DB **54322**, Mailpit **54324**.

```bash
pnpm run typecheck && pnpm run lint && pnpm run test
```

### Árvore de diretórios e responsabilidades

```txt
agenda-de-boteco/
├── apps/
│   ├── admin/                       # Painel administrativo (Next 15, basePath /admin, :8089)
│   │   ├── app/(admin)/             # Rotas protegidas: estabelecimentos, eventos, avisos
│   │   ├── app/login/              # Login OTP por e-mail (autorização via profiles.is_admin)
│   │   ├── app/providers.tsx       # QueryClientProvider + configureQueryErrorHandler
│   │   ├── components/ui/          # DataTable, Modal, Field, TextInput, Select, ImageUpload, PdfUpload
│   │   └── lib/                    # supabase.ts (bootstrap), storage.ts, formErrors.ts
│   ├── landing/                     # Landing institucional (Next 15, :8087) — SEO/CRO
│   │   ├── app/layout.tsx          # metadataBase, openGraph, twitter, fontVariables
│   │   ├── app/suporte/            # Página de suporte e contato
│   │   └── components/             # AppPreview, DownloadButtons, icons
│   ├── mobile/                      # App iOS/Android/Web (Expo 56 + Expo Router + NativeWind)
│   │   ├── app/                    # File-system routing: (tabs), event/[id], establishment/[id],
│   │   │                           #   login, onboarding, city, privacidade, excluir-conta,
│   │   │                           #   +native-intent (deep links)
│   │   └── src/
│   │       ├── components/         # ui/ (design system), feed/, filters/, event/, establishment/,
│   │       │                       #   notification/, layout/, feedback/, ErrorBoundary
│   │       ├── screens/map/        # MapScreen, EstablishmentCarousel, mapStyle
│   │       ├── hooks/              # useUserLocation, useRealtimeSync, useRequireAuth, useResponsive
│   │       ├── lib/                # bootstrap.ts, supabase.ts, queryClient, queryPersister
│   │       ├── services/ store/ utils/ theme/ data/  # re-exports finos de @agenda/core
│   │       ├── config/features.ts  # feature flags de entrega gradual
│   │       └── tw/                 # interop NativeWind (index, image)
│   ├── web/                         # App consumidor web (Next 15, basePath /app, :8088)
│   │   ├── app/(app)/              # feed, event/[id], establishment/[id], mapa, favoritos,
│   │   │                           #   avisos, cidade, perfil
│   │   ├── app/                    # login, onboarding, privacidade, excluir-conta, providers
│   │   ├── components/             # shell/ (AppShell, Sidebar, BottomNav), feed/, filters/,
│   │   │                           #   event/, establishment/, map/, notification/, ui/, feedback/
│   │   ├── hooks/                  # useAppSync, useRequireAuth, useUnreadCount
│   │   └── lib/                    # supabase.ts (bootstrap), storage.ts, cn.ts
│   └── web-client/                  # ⚠️ untracked, resíduo local de build — não é workspace ativo
├── packages/
│   ├── core/                        # @agenda/core — source-only, sem build step
│   │   └── src/
│   │       ├── config/             # features.ts (flags), stores.ts
│   │       ├── data/               # mock.ts (fallback sem backend), lookup.ts, establishment-attributes.ts
│   │       ├── fonts/              # next-fonts.ts (fontVariables para os apps Next)
│   │       ├── hooks/              # queries.ts (TanStack), useActiveCity, useConnectivity,
│   │       │                       #   useGuardedPress, useNearbyEstablishments, useStatusLight
│   │       ├── lib/                # queryClient.ts, queryPersister.ts
│   │       ├── platform/           # storage.ts — abstração de storage por runtime
│   │       ├── queries/            # catalog.ts — PostgREST cru, sem fallback
│   │       ├── schemas/            # catalog.ts — Zod: establishment, event, notification, city…
│   │       ├── services/           # catalog (fachada), auth, favorites, proximity, realtime,
│   │       │                       #   storage, cachePolicy, connectivity, queryKeys
│   │       ├── stores/             # Zustand: Auth, Favorites, Filters, Notifications, Preferences
│   │       ├── supabase/client.ts  # createSupabaseClient / configureSupabase / getConfiguredSupabase
│   │       ├── theme/              # colors, gradients, shadows, typography
│   │       ├── types/              # database.types.ts (gerado), platform.ts
│   │       └── utils/              # 18 módulos (catálogo na Seção 3)
│   └── typescript-config/           # base.json compartilhado (strict)
├── supabase/
│   ├── migrations/                  # 15 migrations: tabelas, slugs+PostGIS, realtime, favoritos,
│   │                                #   fila de exclusão de conta, RLS admin, atributos, buckets
│   ├── seed.sql                     # dados de catálogo para ambiente local
│   └── config.toml                  # Postgres 17, max_rows=1000, Mailpit em :54324
├── scripts/                         # build-mobile.bash (compila; não escreve CHANGELOG), cleanup.bash
├── .github/workflows/               # ci.yml (version-gate + lint/typecheck/build + tag),
│                                    #   deploy.yml, version-gate.yml
├── AGENTS.md                        # este arquivo
├── AGENTS_RULES.md                  # regras bloqueantes — leitura obrigatória
├── eslint.config.mjs · prettier.config.mjs · turbo.json · pnpm-workspace.yaml
└── patches/                         # react-native-css@0.0.0-nightly.5ce6396.patch
```

### Fluxo de dados real

```txt
UI (app/, components/, screens/)
  → hooks TanStack Query (@agenda/core/hooks/queries) + stores Zustand
    → services (@agenda/core/services/*)   ← Zod, handleServiceError, fallback de mock
      → queries (@agenda/core/queries/catalog)  ← PostgREST cru
        → getConfiguredSupabase() (@agenda/core/supabase/client)
          → Postgres + PostGIS   ← RLS (auth.uid(), is_admin()) é a fronteira de segurança
```

Cada app registra seu client no bootstrap via `configureSupabase(() => client)` — mobile com `expo-secure-store`, web/admin com `localStorage`. `getConfiguredSupabase()` retorna `null` quando não há backend, e a fachada `services/catalog.ts` cai para `data/mock.ts`: o app permanece navegável offline/sem credenciais.

---

## 2. Convenções de Estilo, Nomenclatura e Tipagem

### Arquivos e diretórios

O repositório usa **duas convenções, por camada** — respeite a do diretório onde está mexendo:

| Camada | Convenção real | Exemplos no repo |
| --- | --- | --- |
| Utils, services, queries, schemas, config, data, lib | `kebab-case` ou `camelCase` de uma palavra | `status-light.ts`, `establishment-attributes.ts`, `cachePolicy.ts`, `queryKeys.ts` |
| Hooks | `use*.ts` (camelCase) | `useNearbyEstablishments.ts`, `useActiveCity.ts`, `useStatusLight.ts` |
| Stores Zustand | `use*Store.ts` | `useFiltersStore.ts`, `useAuthStore.ts`, `usePreferencesStore.ts` |
| Componentes React | `PascalCase.tsx` | `EstablishmentCard.tsx`, `FiltersSidebar.tsx`, `GuardedPressable.tsx` |
| Rotas (Next App Router) | `page.tsx`, `layout.tsx`, segmento em `kebab-case` | `app/(app)/establishment/[id]/page.tsx`, `app/excluir-conta/page.tsx` |
| Rotas (Expo Router) | nome de arquivo = rota | `app/(tabs)/index.tsx`, `app/event/[id].tsx`, `app/+native-intent.tsx` |
| Testes | co-localizado, `*.test.ts` / `*.test.tsx` | `geo.test.ts`, `catalog.write.test.ts`, `useRealtimeSync.test.ts` |
| Migrations SQL | `<timestamp>_<snake_case>.sql` | `20260810120000_establishment_attributes.sql` |

### Símbolos

- **Tipos, interfaces, classes:** `PascalCase` — `EstablishmentAttributeMeta`, `SupabaseStorageAdapter`, `ErrorContext`, `AuthUnavailableError`.
- **Funções e hooks:** `camelCase` — `resolveNearbyOrigin`, `getFriendlyErrorMessage`, `coarseLatLng`, `upcomingEventsForEstablishment`.
- **Constantes:** `UPPER_SNAKE_CASE` — `CATALOG_CITY_RADIUS_KM`, `MAX_IMAGE_BYTES`, `DEFAULT_EVENT_FILTERS`, `ESTABLISHMENT_ATTRIBUTES`, `VIRTUAL_CITY_PREFIX`. Objetos de configuração fechados com `as const` (`FEATURES`, `catalogKeys`).
- **Schemas Zod:** `camelCase` + sufixo `Schema`, com tipo inferido em `PascalCase` — `establishmentSchema` → `type Establishment = z.infer<typeof establishmentSchema>`. **Nunca** duplicar a interface à mão quando há schema.
- **Exportações nomeadas** sempre. `export default` só em rotas de framework (`page.tsx`, `layout.tsx`, arquivos do Expo Router).

### Tipagem, nulos e imutabilidade

- `strict: true` em todo o monorepo. O repositório está hoje com **zero** `any`, **zero** `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error` — manter.
- `unknown` em fronteiras não confiáveis, refinado por type guard. Padrão de referência: `isPostgrestError` / `isAuthError` em `packages/core/src/utils/errors.ts`.
- Nulos por `?.` e `??`. `!` de asserção não-nula só com justificativa inquestionável.
- **`import type` obrigatório** para tipos — `@typescript-eslint/consistent-type-imports` está como `error` com `inline-type-imports`:

```ts
import { type PostgrestError } from '@supabase/supabase-js';
import type { Establishment, Event } from '@agenda/core';
```

- Imports ordenados automaticamente por `simple-import-sort` (também `error`).
- Discriminated unions para múltiplos resultados; dicionário `Record<K, V>` no lugar de cadeias de `if/else` (padrão de `NOTIFICATION_TYPE_LABELS`, `PRICE_RANGE_LABELS`, `ESTABLISHMENT_SORT_LABELS`).
- Funções com mais de 3 parâmetros recebem objeto/DTO — padrão já aplicado em `CreateSupabaseClientOptions`, `NearbyParams`, `BuildEventDateOptions`, `EstablishmentFilterParams`.
- **Zustand com seletor atômico:** `useAuthStore((s) => s.user)`, nunca `useAuthStore()` inteiro.
- **`setState` em `useEffect`** vai dentro de `queueMicrotask(() => { ... })`.
- Ambiente é lido por `isProduction()` (`utils/env.ts`) dentro do core — **nunca** `process.env` ou `__DEV__` direto lá, sob pena de quebrar o typecheck de admin/web.

### Estilo visual

- Web/admin/landing: Tailwind v4 com **tokens semânticos** definidos em `app/globals.css` (`bg-card`, `text-muted-foreground`, `bg-surface-elevated`, `font-[family-name:var(--font-heading)]`) — evite literais entre colchetes para cor.
- Mobile: NativeWind 5 preview + `src/theme/` (`colors`, `gradients`, `shadows`, `typography`) reexportando os tokens do core.
- Fusão de classes sempre por `cn()`.
- Ícones sempre pela fachada (`apps/mobile/src/components/ui/iconMap.ts`, `apps/web/components/ui/icons.tsx`); nos apps Next que usam Phosphor, `optimizePackageImports` é obrigatório no `next.config.ts`.

---

## 3. Catálogo de Utilitários e Componentes Reutilizáveis

Antes de escrever helper ou componente novo, **é obrigatório** verificar esta lista. Recriar qualquer item é infração (item 15 de `AGENTS_RULES.md`). Regra dos 3: 1 uso → co-localizar; 2 usos → local no módulo; 3+ usos comprovados → só então abstrair para `@agenda/core`.

### Utilitários — `packages/core/src/utils/`

1. **`cn.ts`** → `cn(...inputs)` — merge de classes via `clsx` + `tailwind-merge`.
2. **`dates.ts`** → `buildEventDate`, `formatRelativeDay`, `formatTime`, `formatTimeRange`, `relativeTime`, `isWeekend`, `isOpenNow`, `hoursUntilNextClose`, `hoursUntilNextOpen`, `BuildEventDateOptions`.
3. **`env.ts`** → `isProduction()` — leitura de `NODE_ENV` sem depender de `@types/node`.
4. **`errors.ts`** → `logErrorToTerminal`, `getFriendlyErrorMessage`, `handleServiceError`, `ErrorContext`.
5. **`events.ts`** → `upcomingEventsForEstablishment`.
6. **`filters.ts`** → `applyEventFilters`, `applyEstablishmentFilters`, `sortEstablishmentsByDistance`, `matchesAttributes`, `hasActiveFilters`, `normalizeText`, `DEFAULT_EVENT_FILTERS`, `DEFAULT_ESTABLISHMENT_SORT`, `ESTABLISHMENT_SORT_OPTIONS`, `ESTABLISHMENT_SORT_LABELS`, tipos `EventFilters`, `DateBucket`, `SortBy`, `EventFilterContext`, `EstablishmentSortBy`, `EstablishmentFilterParams`.
7. **`format.ts`** → `formatPrice`, `formatRating`.
8. **`geo.ts`** → `haversineDistanceKm`, `nearestCity`, `coarseLatLng`, `resolveNearbyOrigin`, `resolveCityFromLocation`, `buildVirtualCity`, `isVirtualCityId`, `VIRTUAL_CITY_PREFIX`, `CATALOG_CITY_RADIUS_KM`, tipos `LatLng`, `ReverseGeocode`.
9. **`images.ts`** → `buildUnsplashUrl`.
10. **`links.ts`** → `buildDirectionsUrl`, `buildWhatsAppUrl`, `buildInstagramProfileUrl`, `formatInstagramHandle`, `buildEventShareUrl`, `buildEstablishmentShareUrl`, `APP_SCHEME`, tipos `DirectionsDestination`, `ShareTarget`.
11. **`masks.ts`** → `maskPhoneBR`, `maskCPF`, `maskCNPJ`, `maskCurrencyBR`, `parseCurrencyBR`, `currencyToMask`.
12. **`platform.ts`** → `detectPlatform`, tipo `Platform`.
13. **`pressGuard.ts`** → `createPressGuard`, `PressGuardOptions` — proteção contra toque duplo.
14. **`responsiveType.ts`** → `scaleFontSize`.
15. **`slug.ts`** → `slugify`, `generateId`.
16. **`status-light.ts`** → `eventStatusLight`, `establishmentStatusLight`, `isEventVisibleInFeed`, tipos `StatusLight`, `StatusLightTone`.
17. **`auth.ts`** → `parseAuthTokensFromUrl`, tipo `AuthTokens`.

### Services / Repositories — `packages/core/src/services/`

18. **`catalog.ts`** (fachada async com fallback de mock) → `listEvents`, `getEvent`, `listEstablishments`, `getEstablishment`, `listEventsByEstablishment`, `listEventAttractions`, `listMusicStyles`, `listCities`, `listNotifications` + escrita admin `upsertEstablishment`, `deleteEstablishment`, `upsertEvent`, `deleteEvent`, `upsertNotification`, `deleteNotification`.
19. **`queryKeys.ts`** → `catalogKeys` — **única** fonte de query keys, hierárquica.
20. **`auth.ts`** → `signInWithEmailOtp`, `verifyEmailOtp`, `signOut`, `getCurrentUser`, `isCurrentUserAdmin`, `onAuthUserChange`, `requestAccountDeletion`, `configureAuthRedirect`, `isAuthAvailable`, `AuthUnavailableError`, tipos `AuthProvider`, `AuthUser`.
21. **`favorites.ts`** → `fetchServerFavorites`, `addServerFavorite`, `removeServerFavorite`, `favoriteTargetTypeSchema`, tipos `FavoriteTargetType`, `FavoriteTarget`.
22. **`proximity.ts`** → `listNearbyEstablishments` (RPC PostGIS `nearby_establishments`), `nearbyEstablishmentSchema`, tipos `NearbyEstablishment`, `NearbyParams`.
23. **`realtime.ts`** → `subscribeToCatalogChanges`, `invalidationKeysForChange`.
24. **`storage.ts`** → `uploadImage`, `deleteImage`, `pathFromPublicUrl`, `CATALOG_IMAGES_BUCKET`, `MAX_IMAGE_BYTES`, `UploadImageOptions`.
25. **`cachePolicy.ts`** → `shouldDehydrateQuery`, `CACHE_BUSTER`.
26. **`connectivity.ts`** → `setupOnlineManager`, `setupFocusManager`, tipos `ConnectivityState`, `ConnectivitySubscribe`, `FocusSubscribe`.

### Cliente, cache e plataforma

27. **`supabase/client.ts`** → `createSupabaseClient`, `configureSupabase`, `getConfiguredSupabase`, `isSupabaseConfigured`, `SupabaseStorageAdapter`, `CreateSupabaseClientOptions`.
28. **`lib/queryClient.ts`** → `queryClient`, `configureQueryErrorHandler`.
29. **`lib/queryPersister.ts`** → `createQueryPersister`.
30. **`platform/storage.ts`** → `configureAppStorage`, `getAppStorage`, `appJsonStorage`, `registerRehydrator`.
31. **`queries/catalog.ts`** → camada PostGREST crua, mesmos nomes da fachada, sem fallback (usar só de dentro do core).

### Schemas, dados e tema

32. **`schemas/catalog.ts`** → `establishmentSchema`, `eventSchema`, `citySchema`, `musicStyleSchema`, `menuItemSchema`, `priceRangeSchema`, `establishmentAttributeSchema`, `eventAttractionSchema`, `notificationSchema`, `notificationTypeSchema` + schemas de escrita `establishmentWriteSchema`, `eventWriteSchema`, `notificationWriteSchema` + `NOTIFICATION_TYPE_LABELS`, `PRICE_RANGE_LABELS` e tipos inferidos.
33. **`data/lookup.ts`** → `indexById`, `cityByIdOrDefault`, `resolveActiveCity`, `musicStylesForEvent` — **a defesa contra N+1**.
34. **`data/establishment-attributes.ts`** → `ESTABLISHMENT_ATTRIBUTES` (enum de 36), `QUICK_ATTRIBUTES`, `QUICK_ATTRIBUTE_METAS`, `getAttributeMeta`, `EstablishmentAttributeMeta`. Filtro por atributos é **AND** (exige todos os marcados), não união.
35. **`data/mock.ts`** → `MUSIC_STYLES`, `CITIES`, `ESTABLISHMENTS`, `EVENTS`, `EVENT_ATTRACTIONS`, `NOTIFICATIONS` — fallback sem backend.
36. **`theme/`** → `colors`/`ThemeColor`, `gradientPrimary`/`gradientPromo`/`gradientNight`/`gradientCardOverlay`/`GradientSpec`, `shadows`, `fontFamilies`/`headingLetterSpacing`.
37. **`config/features.ts`** → `FEATURES` (`establishmentDetail`, `notifications`, `map`) + `FeatureFlag` — entrega gradual; reverter uma tela = trocar a flag.
38. **`fonts/next-fonts.ts`** → `fontVariables` (Inter + Space Grotesk) para os root layouts Next.

### Hooks — `packages/core/src/hooks/`

39. **`queries.ts`** → `useEventsQuery`, `useEventQuery`, `useEstablishmentsQuery`, `useEstablishmentQuery`, `useEventsByEstablishmentQuery`, `useEventAttractionsQuery`, `useMusicStylesQuery`, `useCitiesQuery`, `useNotificationsQuery`.
40. **`useNearbyEstablishments.ts`** · **`useActiveCity.ts`** · **`useConnectivity.ts`** · **`useGuardedPress.ts`** · **`useStatusLight.ts`** (`useEventStatusLight`, `useEstablishmentStatusLight`).

### Stores Zustand — `packages/core/src/stores/`

41. `useAuthStore` · `useFavoritesStore` · `useFiltersStore` · `useNotificationsStore` · `usePreferencesStore`. Estado de servidor **não** vive aqui — é do TanStack Query.

### Primitivas de UI

**Mobile — `apps/mobile/src/components/ui/`:**
42. `Button` · 43. `Chip` · 44. `AttributeChips` · 45. `CircleIconButton` · 46. `ConfirmDialog` · 47. `EmptyState` · 48. `GradientBadge` · 49. `GuardedPressable` · 50. `Icon` + `iconMap` · 51. `InfoCard` · 52. `OfflineBanner` · 53. `RatingStars` · 54. `SectionLabel` · 55. `SegmentedTabs` · 56. `StatusLightBadge`.
Layout: `Screen`, `ScreenHeader` (`components/layout/`). Feedback: `UnderConstruction` (`components/feedback/`). Filtros: `FiltersSheet`, `FilterSection`, `FilterSlider`, `SwitchRow`, `DateRangeField`, `CitySearchModal`, `AttributeSearchModal`. Feed: `FeedHeader`, `SearchBar`, `QuickFilterChips`, `StyleCard`.

**Web — `apps/web/components/`:**
57. `ui/GradientBadge` · 58. `ui/SectionLabel` · 59. `ui/SegmentedTabs` · 60. `ui/StatusLightBadge` · 61. `ui/AttributeChips` · 62. `ui/icons` · 63. `feedback/EmptyState` · 64. `feedback/UnderConstruction`.
Shell: `AppShell`, `Sidebar`, `BottomNav`, `NavBadge`, `navItems`, `useNavPathname`. Filtros: `FiltersSidebar` (sheet 40vw), `FilterSection`, `FilterSlider`, `SwitchRow`, `DateRangeField`, `CitySearchModal`, `AttributeSearchModal`. Mapa: `map/MapView` (Leaflet via `next/dynamic`, `ssr: false`).

**Admin — `apps/admin/components/`:**
65. `ui/Button` · 66. `ui/DataTable` · 67. `ui/Modal` · 68. `ui/Field` · 69. `ui/TextInput` · 70. `ui/TextArea` · 71. `ui/Select` · 72. `ui/ImageUpload` · 73. `ui/PdfUpload` · 74. `ui/PageHeader` · 75. `ui/styles` · 76. `Sidebar`.

**Landing — `apps/landing/components/`:**
77. `AppPreview` · 78. `DownloadButtons` · 79. `icons`.

### Banco: funções e RPCs (`supabase/migrations/`)

80. **`public.nearby_establishments(origin_lat, origin_lng, radius_km, max_results)`** — busca por raio com `ST_DWithin` sobre `geography(Point,4326)`, ordenada por distância. ⚠️ O `RETURNS TABLE` espelha as colunas de `public.establishments` na ordem da tabela: alterar colunas exige atualizar a função.
81. **`public.slugify(text)`** + trigger `set_slug_from_name` — slugs de `events`, `establishments`, `cities`, com desempate por id.
82. **`public.is_admin()`** — `SECURITY DEFINER STABLE`, base das policies de escrita do catálogo.
83. **`public.request_account_deletion()`** / **`public.process_account_deletion_queue()`** — LGPD, com `pg_cron` de hora em hora.
84. **`public.handle_new_user()`** + trigger `on_auth_user_created` — provisiona `profiles` a partir de `auth.users`.

---

## 4. 🔗 Regras de Engenharia & Checklist de Review

> 🛑 **ATENÇÃO:** As regras estritas de desenvolvimento, padrões DevSecOps (OWASP, RLS, security headers), LGPD, CRO, SEO, Motion, o protocolo de CHANGELOG/bump de versão e o Checklist Bloqueante de 17 itens estão centralizados no arquivo **`AGENTS_RULES.md`**.
>
> **QUALQUER AGENTE OU DESENVOLVEDOR QUE ATUAR NESTE REPOSITÓRIO É OBRIGADO A LER E CUMPRIR RIGOROSAMENTE AS DIRETRIZES CONTIDAS EM [`AGENTS_RULES.md`](./AGENTS_RULES.md) ANTES DE GERAR OU REVISAR CÓDIGO.**

Atalhos para o que mais bloqueia merge:

| Assunto | Onde |
| --- | --- |
| Proibição de tocar `.env*` reais | `AGENTS_RULES.md` §0.1 · Checklist 1 |
| Gatilho `SEMPRE` (persistir a regra) | §0.2 · Checklist 2 |
| Issue obrigatória no PR · base `alfa` | §0.3 · Checklist 3 |
| Segredos, PII em log, RLS, headers | §0.4 · Checklist 4, 5, 6 |
| LGPD: coleta, consentimento, exclusão | §0.5, §2 · Checklist 5 |
| Skeleton, motion, lazy, CRO, 404 | §0.6 · Checklist 8, 9 |
| SEO: metadata, sitemap, JSON-LD | §0.7 · Checklist 10 |
| N+1, cache, FlashList, `signal` | §0.8, §3 · Checklist 7 |
| Versões das libs (Zod 3, Tailwind 4) | §0.9 · Checklist 11 |
| CHANGELOG a cada commit | §6 · Checklist 17 |
| Bump de patch ao abrir PR para `alfa` | §7 |
| Débitos conhecidos (não são regressão sua) | §8 |
