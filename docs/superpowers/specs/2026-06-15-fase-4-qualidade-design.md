# Spec — Fase 4: Testes de Qualidade e Adaptações

Data: 2026-06-15
Branch: `feat/fase-4`
Plano de origem: [docs/plano-de-acao-fase-4.md](../../plano-de-acao-fase-4.md)

## Contexto

A Fase 3 já entregou a fundação técnica do tratamento de rede e cache. Esta spec parte do estado real do código (auditado), não do greenfield. Já existe e funciona:

- `src/services/connectivity.ts` — NetInfo + `onlineManager`/`focusManager` do TanStack, ativado em `app/_layout.tsx`.
- `src/lib/queryClient.ts` + `queryPersister.ts` + `services/cachePolicy.ts` — persister AsyncStorage montado via `PersistQueryClientProvider`, allowlist de queries, `maxAge` 24h, `buster`.
- `src/utils/deepLinks.ts` + `app/+native-intent.tsx` — mapeamento de paths web (`/eventos/{cidade}/{slug}` → `/event/{slug}`) com 22 testes.
- `src/services/proximity.ts` — RPC `nearby_establishments` (PostGIS) + fallback Haversine, validação Zod, testes de ambos os caminhos.
- Cobertura de testes para todos os services, utils e stores existentes.
- Auth real via Supabase OAuth (Google/Apple); `AuthUser.id === auth.users.id`.
- Split de plataforma para o mapa (`MapScreen.native.tsx` / `MapScreen.web.tsx`).

O gap da Fase 4 é a **camada de experiência** (UI offline, responsividade fina, Error Boundary), a **persistência de favoritos no servidor** e o **fechamento de gaps de teste/QA**.

## Decisões tomadas (com o usuário)

1. **Escopo:** fechar todos os gaps reais para cumprir o DoD.
2. **Favoritos:** criar backend no Supabase. Deslogado = local-only; ao logar, merge dos locais para o servidor; online+logado sincroniza.
3. **Migração DB:** criar apenas o arquivo `.sql` versionado; não aplicar contra o banco.
4. **E2E:** fortalecer testes Jest de integração + checklist de QA manual. Sem runner nativo (Maestro/Detox) nem Playwright.

## Regras invioláveis (AGENTS.md / CLAUDE.md)

- Teste unitário obrigatório para todo `service`/`util` novo ou modificado, com proteção estrita de regressão de contrato (tipo e valor).
- Sem `any`; `unknown` + type guard quando necessário.
- Sem comentários supérfluos no código novo (comentários de contrato/JSDoc no estilo já presente no repo são aceitos).
- `pnpm`/`turbo` na raiz. Nunca rodar `git commit`.
- Expo v56: respeitar APIs versionadas.

---

## Bloco A — Tarefa 4.1: Adaptação para Telas

### A1. Hook de viewport responsivo
- Novo `src/hooks/useResponsive.ts`.
- Função pura exportada `resolveBreakpoint(width: number): Breakpoint` onde `Breakpoint = 'sm' | 'md' | 'lg'`.
  - `sm`: `width < 380`
  - `md`: `380 <= width < 768`
  - `lg`: `width >= 768`
- Hook `useResponsive()` envolve `useWindowDimensions()` e retorna `{ width, height, breakpoint, isSmall, isLarge }`.
- Teste `src/hooks/useResponsive.test.ts`: contrato exato de `resolveBreakpoint` (valores de borda 379/380/767/768; tipo de retorno string).

### A2. Tipografia escalável
- Novo `src/utils/responsiveType.ts`.
- Função pura `scaleFontSize(base: number, breakpoint: Breakpoint): number`:
  - fatores: `sm` ×0.92, `md` ×1, `lg` ×1.08.
  - resultado arredondado para inteiro (`Math.round`); clamp mínimo de `12`.
- Teste `src/utils/responsiveType.test.ts`: valores exatos por par (base, breakpoint), incluindo clamp e arredondamento.
- Aplicar nos títulos hardcoded de maior risco de overflow em SE: `ScreenHeader` (título 24px), feed `app/(tabs)/index.tsx` (28px), `EventCard` (22px). Sem reescrever tipografia global.

### A3. SafeArea — tab bar
- `app/(tabs)/_layout.tsx`: aplicar `useSafeAreaInsets` ao `tabBarStyle` (`paddingBottom: insets.bottom`, ajuste de `height`) para não sobrepor home indicator / navigation bar.

### A4. Split de plataforma
- Nenhum split novo (YAGNI — o único divergente real, o mapa, já está separado). Pontos a homologar ficam no checklist de QA (C3).

---

## Bloco B — Tarefa 4.2: Tratamento Offline

### B1. Hook `useConnectivity()`
- Novo `src/hooks/useConnectivity.ts`.
- Deriva o estado do `onlineManager` do TanStack (`onlineManager.isOnline()` + `onlineManager.subscribe`), sem reimplementar NetInfo. Retorna `{ isOnline: boolean }`.
- Funciona em web (TanStack lida com `navigator.onLine` internamente).
- Teste `src/hooks/useConnectivity.test.ts` com `onlineManager` mockado: estado inicial e transição on→off→on.

### B2. UI offline
- Novo `src/components/ui/OfflineBanner.tsx`: banner discreto na borda superior, animação slide-in/out via `react-native-reanimated`. Consome `useConnectivity`. Montado no root layout, renderiza só quando offline.
- Estados de erro/offline nas telas com query (`app/event/[id].tsx`, `app/establishment/[id].tsx`, feed): usar `EmptyState` existente com mensagem "Você está sem internet no momento. Exibindo informações salvas offline." + botão "Tentar Novamente" → `query.refetch()`.

### B3. Error Boundary
- Novo `src/components/ErrorBoundary.tsx`: class component (única exceção justificada — Error Boundaries exigem `componentDidCatch`/`getDerivedStateFromError`). Fallback amigável com botão de reset. Montado no root, envolvendo a navegação.

### B4. Backend de favoritos + sync
- **Migração** `supabase/migrations/<timestamp>_user_favorites.sql`:
  - Tabela `public.user_favorites (user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, target_type text NOT NULL CHECK (target_type IN ('event','establishment')), target_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, target_type, target_id))`.
  - RLS habilitado: políticas de `select`/`insert`/`delete` restritas a `auth.uid() = user_id`.
- **Service** novo `src/services/favorites.ts`:
  - `fetchFavorites(client): Promise<FavoriteRow[]>` (todos do usuário logado).
  - `addFavorite(client, type, id)` / `removeFavorite(client, type, id)`.
  - Validação Zod do retorno; sem `any`. Quando Supabase não configurado/deslogado, funções lançam/curto-circuitam de forma previsível (contrato testável).
  - Teste `src/services/favorites.test.ts`: mock do client, casos sucesso/erro, mapeamento de tipos.
- **Fila offline + sync** no `useFavoritesStore`:
  - Mantém arrays locais `eventIds`/`establishmentIds` (comportamento atual preservado).
  - Adiciona fila de operações pendentes (`pendingOps: Array<{op:'add'|'remove'; type; id}>`) persistida via AsyncStorage.
  - `toggle*` faz optimistic update local imediato + enfileira op.
  - `flushQueue()`: quando online E logado, drena a fila contra `favorites` service; em falha, mantém na fila.
  - `mergeLocalIntoServer()`: ao logar, envia favoritos locais ainda não no servidor.
  - Disparo do flush via `onlineManager.subscribe` e no evento de login (`onAuthUserChange`).
  - Deslogado: nada vai ao servidor; tudo permanece local.
  - Testes do store cobrindo: optimistic, enfileiramento, flush com sucesso/falha, merge ao logar, no-op deslogado.

---

## Bloco C — Tarefa 4.3: Testes e QA

### C1. Testes dos novos services/utils (obrigatório)
- `useResponsive.test.ts`, `responsiveType.test.ts`, `useConnectivity.test.ts`, `favorites.test.ts`, e atualização de `useFavoritesStore.test.ts`.

### C2. Integração de rotas e dados extremos
- Novo `app/+native-intent.test.ts`: `redirectSystemPath` — delegação a `mapWebPathToRoute` e fallback `/` em exceção.
- Reforço de `src/services/proximity.test.ts`: coordenadas inválidas (NaN, fora de range lat/lng) — comportamento definido e testado.

### C3. Checklist QA manual
- Novo `docs/qa/checklist-fase-4.md` com os fluxos do plano:
  - Interrupção de rede durante carregamento de imagens (placeholders).
  - Concorrência: update no `apps/admin` → listener atualiza o app nativo sem vazamento.
  - Homologação multidispositivo (iPhone SE/15/16 Pro, iPad, Pixel, Nexus S, web 320–1440px).

### C4. Verificação final (DoD)
- `turbo run test` — todos verdes.
- `turbo run typecheck` — sem erros TS strict.
- `pnpm lint` — sem avisos.

---

## Fora de escopo (confirmado)
- Runners E2E nativos (Maestro/Detox) e Playwright.
- Splits `.native/.web` especulativos.
- Reescrita global de tipografia.
- Aplicar a migração contra o banco (apenas criar o arquivo).

## Definition of Done
1. Código compila em TS strict nas áreas afetadas.
2. Layout legível e sem overflow em telas pequenas e com notch.
3. Comportamento offline validado em navegador e emulador (documentado no checklist).
4. Todos os testes (novos e existentes) passam via `turbo run test`.
5. `pnpm lint` sem avisos.
