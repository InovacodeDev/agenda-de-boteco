# 📐 Diretrizes do Projeto, Engenharia Defensiva & Checklist (AGENTS_RULES.md)

> Repositório: **agenda-de-boteco** — monorepo pnpm 10.20.0 + Turborepo 2 · TypeScript 6 strict · React 19.2.3 · Next 15 · Expo 56 / React Native 0.85.3 · Supabase JS 2.106 · TanStack Query 5.101 · Zod 3.23.8 · Zustand 5.
>
> Este arquivo é a **fonte única** das regras de desenvolvimento e de code review. `AGENTS.md` descreve a arquitetura; este descreve o que bloqueia merge.

---

## 0. 🚨 REGRAS DE OURO DA IA (DIRETRIZES INVIOLÁVEIS)

### 1. PROTEÇÃO ABSOLUTA DE ARQUIVOS DE AMBIENTE (`.env*`)

É **ESTRITAMENTE PROIBIDO** criar, modificar, deletar **ou ler** arquivos de ambiente reais. Neste repositório os arquivos reais existentes são:

```txt
.env                    apps/mobile/.env
apps/web/.env           apps/admin/.env
apps/landing/.env       apps/web-client/.env   (untracked, resíduo local)
```

Alterações são permitidas APENAS nos modelos, e só mediante solicitação:

```txt
.env.example            apps/mobile/.env.example
apps/web/.env.example   apps/landing/.env.example
```

Variáveis novas entram no `.env.example` do app correspondente, **com placeholder**, junto ao commit que as introduz. Prefixos válidos por runtime: `EXPO_PUBLIC_*` (mobile), `NEXT_PUBLIC_*` (web/admin/landing), sem prefixo apenas para tooling (`SUPABASE_PROJECT_ID`, `GOOGLE_MAPS_API_KEY_IOS`, `GOOGLE_MAPS_API_KEY_ANDROID` — declarados em `turbo.json:globalEnv`). Nunca testar uma credencial real contra endpoint remoto.

### 2. ATUALIZAÇÃO DINÂMICA VIA GATILHO `SEMPRE`

Quando o usuário escrever **`SEMPRE`** no chat ao ditar uma regra, a IA deve, na mesma resposta:

1. aplicar a regra imediatamente ao trabalho em curso;
2. persistir a regra neste arquivo (`AGENTS_RULES.md`), na seção temática correspondente, e — se for bloqueante — adicionar o item ao Checklist da Seção 5;
3. confirmar no chat, em uma linha, onde a regra foi gravada.

Regra ditada com `SEMPRE` e não persistida = infração (item 2 do Checklist).

### 3. WORKFLOW DE GIT, ISSUES & DEPLOYS

- Branch base e canal padrão é **`alfa`** — nunca `main`/`master`. Canais: `alfa` → `beta` → `release`.
- Todo trabalho de código deve estar associado a uma **Issue** do GitHub; a descrição do PR deve mencioná-la (`Closes #123` / `Refs #123`).
- Trabalho novo sai de uma branch derivada da feature, criada **antes** de codificar. Nunca executar plano direto na branch de canal.
- Commits em **inglês, imperativo** ("Add auth middleware"). Sem `Co-Authored-By: Claude` e sem `🤖 Generated with Claude Code`.
- `git push` **somente** quando explicitamente solicitado. `git rebase -i` / `git add -i` não existem neste ambiente.
- **CHANGELOG obrigatório em todo commit que altere código** (Seção 6).
- **Bump de patch obrigatório ao abrir PR para `alfa`** (Seção 7).
- O `version-gate` do CI (`.github/workflows/ci.yml`) falha o PR se `apps/mobile/` mudou e a tag `alfa-v<version>` já existe. Versão do mobile tem **fonte única** em `apps/mobile/package.json` (`app.config.ts` importa `version` de lá).

### 4. SEGURANÇA ENTERPRISE (SOC 2 / ISO 27001 / OWASP TOP 10)

**Zero hardcoded secrets.** Nenhuma chave, token, senha ou `service_role` key no código, testes, comentários ou fixtures. Chaves publicáveis (anon/publishable) entram por env do app; a `service_role` key **nunca** aparece em código de cliente — o repositório hoje não a usa em lugar algum e isso deve permanecer.

**Mascaramento de PII em logs.** `logErrorToTerminal` (`packages/core/src/utils/errors.ts`) já é no-op em produção (`isProduction()`), mas em dev imprime `context.args` integralmente. É proibido passar e-mail, telefone, `whatsapp`, coordenadas exatas do usuário ou token em `args`:

```ts
// ❌ vaza PII no terminal
handleServiceError(error, { method: 'verifyEmailOtp', args: { email, token } });

// ✅ identificador não reversível
handleServiceError(error, { method: 'verifyEmailOtp', args: { emailDomain: email.split('@')[1] } });
```

**SQL Injection.** Toda leitura/escrita passa pelo PostgREST via `@supabase/supabase-js` (query builder parametrizado) ou por RPC com parâmetros tipados (`nearby_establishments(origin_lat, origin_lng, radius_km, max_results)`). Proibido concatenar valores de usuário em `.or()`, `.filter()` ou em SQL de migration com interpolação de input.

**XSS.** Proibido `dangerouslySetInnerHTML` em `apps/web`, `apps/admin` e `apps/landing` (hoje não há nenhuma ocorrência — manter zero). Conteúdo vindo do banco é renderizado como texto pelo React. URLs vindas do catálogo (`instagram_post_url`, `logo_url`, `cover_url`, `menu_pdf_url`) devem ser validadas por schema Zod antes de ir para `href`/`src`; nunca aceitar esquema `javascript:`.

**CSRF / BOLA / IDOR.** A autorização real é RLS no Postgres, nunca a UI:

- `user_favorites`: policies `select_own_favorites` / `insert_own_favorites` / `delete_own_favorites` com `auth.uid() = user_id`.
- Escrita no catálogo: policies `admin_insert_*` / `admin_update_*` / `admin_delete_*` chamando `public.is_admin()` (`SECURITY DEFINER`, `STABLE`, `SET search_path = public`).
- `profiles`: só `select_own_profile`; **não existe** policy de UPDATE, logo `is_admin` não é promovível via API.
- `account_deletion_queue`: RLS habilitada **sem policy** (deny-by-default); acesso só pelas funções `SECURITY DEFINER`.

Qualquer tabela nova nasce com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` no mesmo arquivo de migration. Qualquer função `SECURITY DEFINER` nova declara `SET search_path` explicitamente. Toda RPC nova precisa de `GRANT EXECUTE` explícito ao papel correto (`anon`/`authenticated`), porque novas funções não são auto-expostas — e `REVOKE ALL ... FROM PUBLIC` quando for de uso interno, como em `process_account_deletion_queue()`.

**Security Headers.** Os três apps Next (`apps/web/next.config.ts`, `apps/admin/next.config.ts`, `apps/landing/next.config.ts`) hoje **não** declaram `headers()`. Qualquer PR que toque um desses `next.config.ts` deve introduzir/preservar o bloco abaixo, no app tocado:

```ts
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ],
    },
  ];
}
```

CSP sem `unsafe-inline` para scripts; se um app exigir inline, usar nonce. Cookies definidos por código da aplicação exigem `HttpOnly` + `Secure` + `SameSite=Lax` — a sessão do Supabase é gerida pelo SDK (`localStorage` na web, `expo-secure-store` no mobile) e não deve ser reimplementada.

### 5. CONFORMIDADE RÍGIDA COM A LGPD

**Data minimization.** O que o sistema coleta hoje, e nada além disso sem autorização: `auth.users.email` (OTP / Apple Sign In), `profiles.email`, `user_favorites (user_id, target_type, target_id)`, `account_deletion_queue.user_id` e a **localização em tempo de uso** do dispositivo (nunca persistida no servidor). Coordenadas do usuário são arredondadas por `coarseLatLng(coords, 3)` (~110 m) antes de entrar em query key — proibido enviar lat/lng cru para telemetria, log ou URL.

**Consentimento registrado.** Formulários e telas de cadastro/login (`apps/web/app/login/page.tsx`, `apps/mobile/app/login.tsx`, `apps/admin/app/login/page.tsx`) precisam explicitar a finalidade da coleta e linkar a política (`/privacidade` em cada app; `apps/mobile/app/privacidade.tsx`). Quando houver aceite explícito, ele é registrado com data, hora e versão da política.

**Direitos do titular.** A exclusão já existe fim a fim e é a referência a preservar: `requestAccountDeletion()` (`packages/core/src/services/auth.ts`) → RPC `public.request_account_deletion()` → `account_deletion_queue` → `process_account_deletion_queue()` via `pg_cron` de hora em hora → `DELETE FROM auth.users` com cascata em `user_favorites` e `profiles`. UI: `apps/web/app/excluir-conta/page.tsx` e `apps/mobile/app/excluir-conta.tsx`. **Exportação de dados** ainda não tem rota: se um PR introduzir nova categoria de dado pessoal, ele deve estender o fluxo de exclusão e prever a exportação, não deixá-los para depois.

**Terceiros.** Google Maps (`react-native-maps` no mobile, `leaflet`/`react-leaflet` na web) e `@vercel/analytics` são processadores declarados na política. Adicionar qualquer novo destino de dados pessoais exige autorização explícita do usuário e atualização da política.

### 6. MOTION & UI/UX DE ALTA CONVERSÃO (CRO)

Toda tela que busca dados exibe **skeleton** durante `isLoading` (não spinner solto, não tela branca), **estado vazio** via `EmptyState` (`apps/mobile/src/components/ui/EmptyState.tsx`, `apps/web/components/feedback/EmptyState.tsx`) e **estado de erro** com `getFriendlyErrorMessage(error)`.

Motion mínimo por plataforma:

- **Web/admin/landing:** transições Tailwind já em uso (`transition-colors`, `transition-opacity`, `transition-transform duration-300 ease-out` em `FiltersSidebar.tsx`). Entrada/saída de modal e sheet animadas; nada aparece por corte seco.
- **Mobile:** `react-native-reanimated` 4.3.1 + `react-native-worklets` estão instalados — animação roda na UI thread, nunca via `setState` em loop. Feedback de toque usa `GuardedPressable` / `useGuardedPress` (proteção contra duplo toque).
- Respeitar `prefers-reduced-motion` na web para animações não essenciais.

Lazy loading: componentes pesados entram por `next/dynamic` (padrão já aplicado em `apps/web/app/(app)/mapa/page.tsx` para o Leaflet, que não pode ser SSR). Imagens no mobile usam `expo-image` (cache + placeholder); na web, `next/image`.

CRO obrigatório em superfícies públicas (`apps/landing`, `apps/web`): CTA único e claro acima da dobra, CTA fixo no mobile, tela/estado de agradecimento após contato, promessa de tempo de resposta, prova social real (nunca número inventado), pelo menos 5 FAQs endereçando objeções, e **404 personalizada com rotas de fuga**. Os apps Next hoje **não têm** `not-found.tsx`, `error.tsx`, `global-error.tsx` nem `loading.tsx`: PR que crie ou reestruture rota nesses apps deve entregar os arquivos de estado correspondentes.

### 7. SEO TÉCNICO COMPLETO

Aplica-se a `apps/landing` e `apps/web` (o `apps/admin` é privado e deve declarar `robots: { index: false }`).

- Title único por rota, **< 60 caracteres**; usar o `template: '%s · Agenda de Boteco'` já definido em `apps/landing/app/layout.tsx`.
- Meta description **< 155 caracteres** por rota.
- `metadataBase` resolvido por env (`NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → localhost), padrão já implementado na landing e a ser replicado em `apps/web/app/layout.tsx`, que hoje tem metadata mínima e sem OG.
- `openGraph` + `twitter` com `og:image` absoluta (a landing usa `/logo.png`, 811×582).
- **`app/robots.ts` e `app/sitemap.ts` não existem em nenhum app** — rota pública nova exige criá-los/atualizá-los, com o sitemap de `apps/web` gerado a partir dos slugs reais (`events.slug`, `establishments.slug`, `cities.slug`, gerados por trigger `set_slug_from_name`).
- **JSON-LD ausente hoje**: página de estabelecimento (`apps/web/app/(app)/establishment/[id]/page.tsx`) exige `LocalBusiness`; página de evento (`.../event/[id]/page.tsx`) exige `Event`; landing exige `Organization`. Injeção via `<script type="application/ld+json">` com objeto serializado por `JSON.stringify`.
- `alt` descritivo em **toda** imagem (`next/image` na web, `expo-image` no mobile); `alt=""` só em decorativa.
- Breadcrumbs nas páginas de detalhe, com `BreadcrumbList`.

### 8. PERFORMANCE & BANCO DE DADOS (ZERO N+1)

Proibido consultar o banco dentro de laço. Padrão do repositório: uma query que traz o conjunto e resolução em memória por índice — `indexById` / `cityByIdOrDefault` / `musicStylesForEvent` (`packages/core/src/data/lookup.ts`). Proximidade é **uma** chamada RPC PostGIS (`listNearbyEstablishments` → `nearby_establishments`, com `ST_DWithin` sobre `geography(Point,4326)` e `LIMIT max_results`), nunca N cálculos de distância por item no cliente.

Outros invariantes:

- Query keys sempre via factory `catalogKeys` (`packages/core/src/services/queryKeys.ts`) — nunca array literal.
- Passar o `signal` do TanStack Query ao fetcher para cancelar requisição ao desmontar.
- Listas longas no mobile: `FlashList` (`@shopify/flash-list` 2.0.2), nunca `FlatList`.
- `max_rows = 1000` no PostgREST (`supabase/config.toml`) — listagens grandes precisam de paginação explícita, não confiar no limite implícito.
- Imagens em formato moderno (WebP/AVIF) e comprimidas; upload passa por `uploadImage` com `MAX_IMAGE_BYTES` (`packages/core/src/services/storage.ts`).
- Índices: toda coluna nova usada em `WHERE`/`ORDER BY` de query quente entra com índice na mesma migration (referência: `user_favorites_user_idx`).

### 9. CONSULTA OBRIGATÓRIA ÀS DOCS OFICIAIS

Antes de usar API que não esteja já presente no repositório, consultar a documentação oficial da versão instalada — não a memória:

| Lib | Versão instalada | Doc |
| --- | --- | --- |
| Zod | 3.23.8 (pin exato nos apps) | https://zod.dev/ |
| React | 19.2.3 (override no root) | https://react.dev/ |
| Next.js | ^15.1.0 (App Router) | https://nextjs.org/docs |
| TanStack Query | ^5.101.0 | https://tanstack.com/query/latest |
| Supabase JS | ^2.106.2 | https://supabase.com/docs/reference/javascript |
| Expo | ~56.0.12 · RN 0.85.3 | https://docs.expo.dev/ |
| Expo Router | ^56.2.11 | https://docs.expo.dev/router/introduction/ |
| Reanimated | ^4.3.1 | https://docs.swmansion.com/react-native-reanimated/ |
| Tailwind CSS | ^4.0.0 (`@tailwindcss/postcss`) | https://tailwindcss.com/docs |
| NativeWind | 5.0.0-preview.2 | https://www.nativewind.dev/ |
| Zustand | ^5.0.14 | https://zustand.docs.pmnd.rs/ |
| Turborepo | ^2.0.4 | https://turborepo.com/docs |

**Atenção Zod:** o repositório está em **3.23.8**, não em v4 — usar `error.issues`, `z.infer`, `.parse/.safeParse` da v3. Sintaxe v4 (`z.output`, novos adaptadores de erro) é infração. Tailwind está em **v4**: configuração por CSS (`@theme` em `globals.css`), não por `tailwind.config.js` legado.

### 10. ESCOPO DE CODE REVIEW (DIFF & IMPACTO DIRETO)

Review avalia o `diff` e seus efeitos colaterais diretos: regressões, warnings, quebras de tipo e de teste **provocadas pela alteração**. Débito técnico pré-existente e não tocado pelo diff **deve ser ignorado** no review — se relevante, vira Issue separada, não comentário no PR.

### 11. PLANEJAMENTO OBRIGATÓRIO & ZERO-REFACTOR

Antes de codificar: plano curto no chat (arquivos que serão tocados + ordem). Ao executar plano aprovado, ir direto em modo subagent-driven; tarefas independentes em paralelo (até ~6), com isolamento de arquivos por lote e revisão integrada no fim.

**Edição cirúrgica:** alterar somente o necessário. Refatorar código adjacente não solicitado exige permissão prévia no chat.

**Bug = causa raiz.** Reproduzir, localizar onde todos os callers passam, corrigir uma vez. Patch no caller que o ticket citou, deixando os irmãos quebrados, é infração.

Antes de declarar concluído, rodar e relatar o resultado real:

```bash
pnpm run typecheck && pnpm run lint && pnpm run test
```

### 12. CLEAN CODE & COMENTÁRIOS

Proibido comentário explicativo que apenas narra o código. Permitidos: `TODO:`, `FIXME:`, `ponytail:` e — mantendo o padrão já presente no repositório — comentários curtos que registram **o porquê não-óbvio** de uma decisão (ex.: a nota sobre `optimizePackageImports` do Phosphor em `next.config.ts`, ou o aviso de espelhamento de colunas no `RETURNS TABLE` de `nearby_establishments`). Sem blocos longos de explicação, sem código comentado — deletar, não comentar. Explicação de implementação pertence ao chat/PR.

---

## 1. Observabilidade, Qualidade de Código & Suíte de Testes

### Estado real da observabilidade

**Não há Sentry, Datadog, NewRelic nem OpenTelemetry no repositório.** O que existe:

- `@vercel/analytics` ^2.0.1 em `apps/web`, `apps/admin` e `apps/landing` (`<Analytics />` no root layout) — métrica de audiência, não de erro.
- Logging estruturado local: `logErrorToTerminal(error, { method, args })` em `packages/core/src/utils/errors.ts`, silencioso em produção.
- Handler global de erro de query: `configureQueryErrorHandler` (`packages/core/src/lib/queryClient.ts`), plugado em `apps/web/app/providers.tsx` e `apps/admin/app/providers.tsx`.
- `ErrorBoundary` no mobile: `apps/mobile/src/components/ErrorBoundary.tsx`.

Regra: **é proibido `console.log` / `console.warn` / `console.error` em código de aplicação.** As únicas ocorrências toleradas são as camadas de infraestrutura de log já existentes (`utils/errors.ts`, `lib/queryClient.ts`, `services/realtime.ts`, `ErrorBoundary.tsx`, os dois `providers.tsx`) — e mesmo essas devem migrar para a abstração conforme forem tocadas. Código novo usa `logErrorToTerminal` / `handleServiceError`. Se um PR introduzir APM real, ele entra atrás dessa mesma abstração, não espalhado pelas telas.

### Qualidade & Lint

- **ESLint 9 flat config** em `eslint.config.mjs` (raiz): `js.configs.recommended`, `typescript-eslint recommended`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-simple-import-sort` (`imports`/`exports` como `error`), `eslint-config-prettier` por último. Regras de destaque: `@typescript-eslint/consistent-type-imports` (`inline-type-imports`) como **error**, `@typescript-eslint/no-unused-vars` como **error** (ignora `^_`), `@typescript-eslint/no-explicit-any` como **warn** — tratar como error na prática: o repositório está hoje com **zero** `any` e **zero** `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error`, e esse número não deve subir.
- **Prettier 3.8.4** em `prettier.config.mjs`: `singleQuote`, `semi`, `printWidth: 100`, `trailingComma: 'all'`, `endOfLine: 'lf'`, plugin `prettier-plugin-tailwindcss` (ordena classes Tailwind/NativeWind). Prettier é dono da formatação; ESLint não formata.
- **TypeScript 6** com `strict: true`, `isolatedModules`, `forceConsistentCasingInFileNames`, `noEmit` (`packages/typescript-config/base.json`).
- Não há Biome, Commitlint, Knip nem Stryker. Não introduzir sem autorização.

### Testes

- **Runner:** Jest 29.7. Core: preset `ts-jest`, `testEnvironment: node`, `testMatch: **/*.test.ts`, alias `^@agenda/core$ → src/index.ts`. Mobile: preset `jest-expo`, `testMatch: <rootDir>/src/**/*.test.ts`, aliases `@/*` e `@assets/*`, `transformIgnorePatterns` cobrindo expo/nativewind/zustand/supabase/tanstack. `@testing-library/react-native` ^14 disponível.
- **Cobertura existente:** ~30 suítes de teste no core (todos os `utils/`, todos os `services/`, todas as `stores/`, `platform/storage`, `config/features`, `data/lookup`) e no mobile (`bootstrap`, `deepLinks`, `nativeIntent`, `useConnectivity`, `useRealtimeSync`, `useResponsive`, `errors`, `iconMap`).
- **Obrigatório:** qualquer alteração em arquivo sob `packages/core/src/services/` ou `packages/core/src/utils/` acompanha criação/atualização do `*.test.ts` correspondente. Refatoração mantém 100% de regressão comportamental: mesma entrada, mesmo tipo e mesmo valor de saída.
- **Proibido** deletar, renomear para fora do `testMatch`, comentar, `skip` ou `only` em teste existente para fazer a suíte passar.
- Ao espionar log em teste, espionar **`handleServiceError`** — `logErrorToTerminal` é chamado internamente por referência direta e um spy no módulo não intercepta.
- **Não há E2E (Playwright/Detox/Maestro) nem Codecov.** Introduzir exige autorização; enquanto não houver, o gate é `typecheck + lint + test + build` no CI (`.github/workflows/ci.yml`).

### Nenhuma dependência nova sem autorização

`package.json` de qualquer workspace só recebe dependência com autorização explícita do usuário. Antes: verificar se `@agenda/core` já resolve (Seção 3 do `AGENTS.md`), checar CVEs e typosquatting, e ler a doc oficial da versão que será instalada. Package manager é **pnpm** — nunca `npm`/`yarn`. Overrides ativos no root (`react`/`react-dom` 19.2.3, `lightningcss` 1.30.1) e o patch de `react-native-css@0.0.0-nightly.5ce6396` não devem ser removidos sem entender por que existem.

---

## 2. Fluxo de Dados, Segurança e Mapeamento LGPD

### Pipeline unidirecional

```txt
UI / Motion (app/, components/, screens/)
   │  eventos de interação, skeleton, EmptyState, animação
   ▼
State / Logic (hooks TanStack Query + stores Zustand)
   │  catalogKeys, staleTime/cachePolicy, signal de cancelamento
   ▼
Repository / Service (packages/core/src/services/*)
   │  regra de negócio, validação Zod, handleServiceError, autorização de escopo
   ▼
Query layer (packages/core/src/queries/catalog.ts)
   │  PostgREST cru, sem fallback
   ▼
Client (packages/core/src/supabase/client.ts)
   │  getConfiguredSupabase(), refresh de token, storage adapter por plataforma
   ▼
Postgres / PostGIS  ← RLS (auth.uid(), is_admin()) é a fronteira real de segurança
```

Proibido pular camada: componente visual não chama `fetch`, `supabase.from(...)` nem `axios`. `apps/*/lib/supabase.ts` existe apenas para **registrar** o client no bootstrap (`configureSupabase`) — não para consultar.

O `services/catalog.ts` é uma **fachada** com fallback para mock (`packages/core/src/data/mock.ts`) quando não há Supabase configurado; a camada crua fica em `queries/catalog.ts`. Novas leituras entram na fachada, para que o app continue navegável sem backend.

### Mapeamento de coleta de dados pessoais

| Dado | Onde é coletado | Onde persiste | Base legal / finalidade | Retenção & direito do titular |
| --- | --- | --- | --- | --- |
| E-mail | `signInWithEmailOtp` / Apple Sign In (`packages/core/src/services/auth.ts`); telas de login de web, mobile e admin | `auth.users.email`, `profiles.email` (trigger `handle_new_user`) | Execução de contrato — autenticação sem senha | Apagado por `request_account_deletion()` → cron → `DELETE FROM auth.users` |
| Vínculo de conta ↔ favoritos | Toque em favoritar (`services/favorites.ts`) | `user_favorites (user_id, target_type, target_id)` | Legítimo interesse — funcionalidade pedida pelo usuário | Cascata `ON DELETE CASCADE` a partir de `auth.users` |
| Flag de administrador | Promoção manual via SQL (fora do git) | `profiles.is_admin` | Controle de acesso | Sem policy de UPDATE — não editável por API |
| Localização precisa do dispositivo | `expo-location` no mobile (`useUserLocation`), Geolocation API na web; permissão em tempo de uso | **Não persiste no servidor.** Fica em memória/estado e é arredondada por `coarseLatLng(coords, 3)` antes de entrar em query key | Consentimento — ordenar bares/eventos por proximidade | Revogável nas configurações do sistema; app cai para o centro da cidade via `resolveNearbyOrigin` |
| Pedido de exclusão | `requestAccountDeletion()` | `account_deletion_queue (user_id, requested_at, processed_at)` — RLS deny-by-default | Obrigação legal (LGPD art. 18) | A própria linha desaparece por cascata ao apagar o usuário |
| Telemetria de navegação | `<Analytics />` (`@vercel/analytics`) na web/admin/landing | Vercel (processador) | Legítimo interesse — métrica agregada | Declarado na política de privacidade |

**Rotas de direito do titular hoje:** exclusão implementada (`/excluir-conta` na web, `apps/mobile/app/excluir-conta.tsx`, RPC + cron). **Exportação completa de dados: não implementada** — pendência conhecida; qualquer PR que amplie a coleta de dados pessoais deve tratá-la.

`whatsapp`, `instagram`, `lat`, `lng` em `establishments` são dados **do estabelecimento** (comerciais, públicos), não do usuário — mas telefone segue mascarado na UI por `maskPhoneBR`.

---

## 3. Performance, Otimização de Banco e SEO Técnico

- **N+1:** uma query por conjunto + `indexById`/`cityByIdOrDefault`/`musicStylesForEvent` em memória. Proximidade por RPC PostGIS única (`ST_DWithin` + índice geográfico), com `radius_km` e `max_results` explícitos.
- **Cache:** `queryClient` central (`packages/core/src/lib/queryClient.ts`) + persistência (`createQueryPersister`, `@tanstack/query-async-storage-persister`) com `CACHE_BUSTER` e `shouldDehydrateQuery` (`services/cachePolicy.ts`). Invalidar por prefixo hierárquico do `catalogKeys`, nunca limpar o cache inteiro.
- **Realtime:** `subscribeToCatalogChanges` + `invalidationKeysForChange` (`services/realtime.ts`) traduzem evento do Postgres em invalidação granular — não refetch global.
- **Imagens:** `expo-image` no mobile, `next/image` na web; upload via `uploadImage` com limite `MAX_IMAGE_BYTES` no bucket `CATALOG_IMAGES_BUCKET`; servir WebP/AVIF.
- **Bundle:** `optimizePackageImports: ['@phosphor-icons/react']` obrigatório nos apps Next que usam Phosphor (`apps/web`, `apps/admin`) — sem isso o dev server transpila 9k+ módulos. Ícones sempre atrás da fachada (`apps/mobile/src/components/ui/iconMap.ts`, `apps/web/components/ui/icons.tsx`), nunca import direto espalhado.
- **Code splitting:** `next/dynamic` com `ssr: false` para o que não sobrevive a SSR (padrão do Leaflet em `apps/web/app/(app)/mapa/page.tsx`).
- **SEO:** ver Seção 0.7. Validar JSON-LD no Rich Results Test antes de considerar a tarefa concluída; `sitemap.ts` deriva dos slugs reais do banco.

---

## 4. 🧠 Protocolo Cognitivo de Raciocínio ANTES de Codificar e Revisar

Executar na ordem, sempre:

1. **Detecção de `SEMPRE`** — a instrução do usuário contém o gatilho? Aplicar e persistir neste arquivo antes de qualquer código.
2. **Trava `.env*`** — a tarefa toca ambiente? Arquivo real: bloquear e pedir ao usuário. `.example`: permitido só se solicitado.
3. **Mapeamento de impacto** — `grep` na árvore de dependências: quem consome a função/tipo/componente que vou mudar? Quais `*.test.ts` cobrem isso? Bug → localizar o ponto por onde **todos** os callers passam.
4. **Checagem de reuso (Regra dos 3)** — o utilitário/componente já existe no catálogo do `AGENTS.md`? Usado em 1 lugar: co-localizar. Em 2: manter local no módulo. Só abstrair para `@agenda/core` a partir de 3 usos comprovados.
5. **Planejamento & escopo** — plano curto no chat; se precisar tocar arquivo fora do pedido, pedir permissão.
6. **DevSecOps & threat modeling** — SQLi, XSS, CSRF, BOLA/IDOR, PII em log, RLS da tabela nova, `search_path` da função `SECURITY DEFINER`, `GRANT` da RPC, N+1.
7. **LGPD** — a mudança coleta dado pessoal novo? Finalidade declarada, consentimento, exclusão e exportação cobertos?
8. **UX/CRO/SEO/Motion** — skeleton, empty, erro, animação, `alt`, title/description, JSON-LD onde couber.
9. **Docs oficiais** — API usada existe na versão instalada? (Zod **3**, Tailwind **4**, React **19**, TanStack **5**.)
10. **Self-audit** — reler o diff contra o Checklist da Seção 5, rodar `pnpm run typecheck && pnpm run lint && pnpm run test`, escrever o CHANGELOG (Seção 6) e só então responder.

---

## 5. 🛑 Checklist Único de Desenvolvimento e Review (17 Itens Bloqueantes)

Qualquer item violado **bloqueia** merge/commit até correção.

### 1. ❌ Alteração ou modificação em arquivos `.env*` reais

**Regra:** `.env`, `.env.local`, `.env.production` e afins são intocáveis (inclusive leitura). Só `.env.example` / `apps/*/.env.example`, e apenas se solicitado.
**Prompt de correção:** "Reverta a alteração no arquivo `.env` real, registre a variável apenas no `.env.example` correspondente com placeholder e solicite ao usuário que defina o valor localmente."

```diff
- // apps/web/.env
- NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...real
+ // apps/web/.env.example
+ NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. ❌ Ignorou regra ditada com o gatilho `SEMPRE` ou não a persistiu

**Regra:** instrução com `SEMPRE` é aplicada no ato **e** gravada em `AGENTS_RULES.md`.
**Prompt de correção:** "Aplique a regra ditada com `SEMPRE` ao diff atual e persista-a na seção temática de `AGENTS_RULES.md`, adicionando item ao Checklist se for bloqueante."

```diff
  ## 0. REGRAS DE OURO DA IA
+ ### 13. NOMENCLATURA DE BRANCH
+ SEMPRE derivar o nome da branch da feature, prefixado por `feat/` ou `fix/`.
```

### 3. ❌ PR ou alteração sem vínculo à Issue do GitHub

**Regra:** todo trabalho tem Issue; o corpo do PR a menciona. Base do PR é `alfa`.
**Prompt de correção:** "Crie ou vincule a Issue correspondente e adicione `Closes #<n>` à descrição do PR antes de solicitar review."

```diff
  ## Descrição
  Corrige a busca de cidades no filtro do feed.
+
+ Closes #128
```

### 4. ❌ Hardcoded secret, API key, token, senha ou chave privada no código/testes/comentários

**Regra:** zero segredo versionado. Chave publicável vem de env com prefixo do runtime; `service_role` nunca no cliente.
**Prompt de correção:** "Remova o valor literal, leia-o da variável de ambiente do app (`EXPO_PUBLIC_*`/`NEXT_PUBLIC_*`), registre a chave no `.env.example` e rotacione o segredo exposto."

```diff
- const supabase = createSupabaseClient({
-   url: 'https://abcdefgh.supabase.co',
-   anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
- });
+ const supabase = createSupabaseClient({
+   url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
+   anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
+ });
```

### 5. ❌ Vazamento de PII em log, ou desrespeito ao consentimento/direitos da LGPD

**Regra:** `context.args` de `logErrorToTerminal`/`handleServiceError` não carrega e-mail, telefone, token nem coordenada exata. Dado pessoal novo exige finalidade declarada e cobertura no fluxo de exclusão/exportação.
**Prompt de correção:** "Substitua os campos de PII em `context.args` por identificadores não reversíveis e confirme que o novo dado pessoal está coberto pelo fluxo de `request_account_deletion()`."

```diff
- handleServiceError(error, { method: 'verifyEmailOtp', args: { email, token } });
+ handleServiceError(error, { method: 'verifyEmailOtp', args: { emailDomain: email.split('@')[1] } });
```

### 6. ❌ SQLi, XSS, CSRF, BOLA/IDOR, RLS ausente ou Security Headers faltando

**Regra:** tabela nova nasce com RLS habilitada e policy por `auth.uid()`/`is_admin()`; função `SECURITY DEFINER` declara `SET search_path`; RPC nova tem `GRANT EXECUTE` explícito; autorização nunca é só na UI; `next.config.ts` tocado carrega o bloco `headers()` da Seção 0.4; sem `dangerouslySetInnerHTML`.
**Prompt de correção:** "Habilite RLS na tabela criada, adicione a policy de escopo por `auth.uid()` (ou `public.is_admin()` para escrita administrativa) e mova a checagem de autorização da UI para a camada de serviço/banco."

```diff
  CREATE TABLE public.user_reviews (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    establishment_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)
  );
+
+ ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
+
+ CREATE POLICY insert_own_review ON public.user_reviews
+   FOR INSERT WITH CHECK (auth.uid() = user_id);
+
+ CREATE POLICY delete_own_review ON public.user_reviews
+   FOR DELETE USING (auth.uid() = user_id);
+
+ CREATE INDEX user_reviews_establishment_idx ON public.user_reviews (establishment_id);
```

### 7. ❌ Consulta ao banco dentro de laço (N+1)

**Regra:** uma query por conjunto; resolução por índice em memória ou por RPC agregada.
**Prompt de correção:** "Substitua o laço de consultas por uma única query do conjunto e resolva as relações em memória com `indexById` de `@agenda/core`, ou por uma RPC que já retorne o agregado."

```diff
- const events = await listEvents();
- for (const event of events) {
-   event.establishment = await getEstablishment(event.establishmentId);
- }
+ const [events, establishments] = await Promise.all([listEvents(), listEstablishments()]);
+ const byId = indexById(establishments);
+ const enriched = events.map((event) => ({ ...event, establishment: byId[event.establishmentId] }));
```

### 8. ❌ Componente/tela sem skeleton, sem lazy loading ou sem animação de transição

**Regra:** todo estado assíncrono tem skeleton em `isLoading`, `EmptyState` no vazio, mensagem amigável no erro; entrada/saída de overlay é animada; componente pesado entra por `next/dynamic`.
**Prompt de correção:** "Adicione o skeleton para `isLoading`, o `EmptyState` para lista vazia e a transição de entrada/saída; carregue o componente pesado com `next/dynamic`."

```diff
- if (isLoading) return null;
- return <EventList events={data} />;
+ if (isLoading) return <EventListSkeleton />;
+ if (error) return <EmptyState title={getFriendlyErrorMessage(error)} />;
+ if (!data?.length) return <EmptyState title="Nenhum evento por aqui" />;
+ return (
+   <div className="transition-opacity duration-300">
+     <EventList events={data} />
+   </div>
+ );
```

### 9. ❌ Ausência de elementos críticos de CRO

**Regra:** superfície pública precisa de CTA único acima da dobra, CTA fixo no mobile, agradecimento pós-contato, promessa de tempo de resposta, prova social real, 5+ FAQs e 404 personalizada com rotas de fuga.
**Prompt de correção:** "Adicione a `not-found.tsx` com rotas de fuga e o CTA fixo mobile na rota pública alterada, e complete as FAQs que endereçam as objeções."

```diff
+ // apps/landing/app/not-found.tsx
+ export default function NotFound() {
+   return (
+     <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-24 text-center">
+       <h1 className="font-[family-name:var(--font-heading)] text-2xl">Página não encontrada</h1>
+       <p className="text-muted-foreground">O link pode ter mudado de lugar.</p>
+       <Link href="/" className="rounded-full bg-primary px-5 py-3 font-semibold">
+         Ver eventos da minha cidade
+       </Link>
+       <Link href="/suporte" className="underline">Falar com o suporte</Link>
+     </main>
+   );
+ }
```

### 10. ❌ SEO técnico ausente ou incorreto

**Regra:** title < 60 e description < 155 por rota pública; `alt` em toda imagem; `robots.ts` e `sitemap.ts` presentes; `og:image` absoluta; JSON-LD (`LocalBusiness`/`Event`/`Organization`) nas páginas correspondentes; `apps/admin` com `index: false`.
**Prompt de correção:** "Exporte `generateMetadata` com title/description dentro do limite e `openGraph`, adicione o `alt` descritivo e injete o JSON-LD do tipo correspondente à página."

```diff
+ export async function generateMetadata({ params }): Promise<Metadata> {
+   const establishment = await getEstablishment((await params).id);
+   return {
+     title: `${establishment.name} · ${establishment.neighborhood}`,
+     description: establishment.description?.slice(0, 150),
+     openGraph: { images: [{ url: establishment.coverUrl, alt: establishment.name }] },
+   };
+ }
+
+ <script
+   type="application/ld+json"
+   dangerouslySetInnerHTML={{
+     __html: JSON.stringify({
+       '@context': 'https://schema.org',
+       '@type': 'LocalBusiness',
+       name: establishment.name,
+       address: establishment.address,
+       geo: { '@type': 'GeoCoordinates', latitude: establishment.lat, longitude: establishment.lng },
+     }),
+   }}
+ />
```

> Exceção deliberada e única ao veto a `dangerouslySetInnerHTML`: JSON-LD serializado por `JSON.stringify` a partir de dado validado por Zod.

### 11. ❌ API ou sintaxe obsoleta frente à versão instalada

**Regra:** Zod **3.23.8** (não v4), Tailwind **v4** (config em CSS), React **19**, TanStack Query **v5** (objeto único de opções), Next **15** (`params`/`searchParams` assíncronos no App Router).
**Prompt de correção:** "Substitua a sintaxe obsoleta pela API da versão instalada conforme a doc oficial, e confirme com `pnpm run typecheck`."

```diff
- useQuery(['events', id], () => getEvent(id), { cacheTime: 60_000 });
+ useQuery({
+   queryKey: catalogKeys.events.detail(id),
+   queryFn: ({ signal }) => getEvent(id, signal),
+   gcTime: 60_000,
+ });
```

### 12. ❌ Comentário explicativo/poluente fora de `TODO:`, `FIXME:` ou `ponytail:`

**Regra:** proibido comentário que narra o código ou código comentado. Permitido registrar o **porquê** não-óbvio de uma decisão, curto.
**Prompt de correção:** "Remova o comentário que descreve o óbvio e o código comentado; se houver decisão não trivial, reduza a uma linha explicando o porquê."

```diff
- // Aqui a gente pega os eventos da API e depois filtra por cidade
- // const old = events.filter(e => e.cityId === city);
- const filtered = applyEventFilters(events, filters, context);
+ const filtered = applyEventFilters(events, filters, context);
```

### 13. ❌ Reportou débito técnico antigo não relacionado ao diff

**Regra:** review cobre o diff e seus efeitos colaterais diretos. Débito pré-existente vira Issue, não comentário de PR.
**Prompt de correção:** "Remova do review os apontamentos sobre código não tocado pelo diff e abra Issues separadas para eles."

```diff
- 🔴 `MapScreen.tsx` inteiro deveria ser refatorado (arquivo não tocado neste PR).
+ 🔴 A linha 42 deste diff quebra o `useEffect` de `MapScreen.tsx`: a nova dependência
+    reintroduz o refetch em loop que o `coarseLatLng` evitava.
```

### 14. ❌ Alterou arquivo ou componente não solicitado sem permissão prévia

**Regra:** edição cirúrgica. Refatoração adjacente pede autorização no chat antes.
**Prompt de correção:** "Reverta as alterações fora do escopo pedido e apresente-as no chat como proposta separada antes de aplicá-las."

```diff
  // Pedido: corrigir o formato de preço no card do evento.
  - formatPrice(event.price)
  + formatPrice(event.price, { showFree: true })
- // Fora de escopo, sem permissão:
- - export function EventCard({ event }: Props) {
- + export const EventCard = memo(function EventCard({ event }: Props) {
```

### 15. ❌ Instalou biblioteca sem confirmação, sem auditoria da doc oficial ou com risco de supply chain

**Regra:** nenhuma dependência nova sem autorização explícita; antes, verificar reuso em `@agenda/core`, CVEs e typosquatting; instalar com **pnpm**. Não remover os overrides do root nem o patch de `react-native-css`.
**Prompt de correção:** "Reverta a instalação, resolva o problema com o que já existe em `@agenda/core` e, se a dependência for realmente necessária, peça autorização apresentando versão, tamanho e alternativas."

```diff
  "dependencies": {
-   "date-fns": "^4.1.0",
    "@agenda/core": "workspace:*"
  }
+ // usar formatRelativeDay / formatTimeRange / isOpenNow de @agenda/core/utils/dates
```

### 16. ❌ Tipo inseguro, print nativo ou teste desativado

**Regra:** zero `any`/`@ts-ignore`/`@ts-nocheck`/`@ts-expect-error` (o repositório está em zero hoje); `unknown` sempre com type guard; sem `!` de asserção não-nula sem justificativa; sem `console.*` em código de aplicação; proibido deletar, `skip`, `only` ou comentar teste para a suíte passar.
**Prompt de correção:** "Substitua o tipo inseguro pelo tipo estrito importado com `import type`, troque `console.*` por `logErrorToTerminal`/`handleServiceError` e restaure o teste desativado corrigindo a causa da falha."

```diff
- // @ts-ignore
- const handleSelect = (item: any) => console.log(item.name);
+ import type { Event } from '@agenda/core';
+ import { logErrorToTerminal } from '@agenda/core';
+
+ const handleSelect = (item: Event) => {
+   logErrorToTerminal(new Error('seleção inesperada'), { method: 'handleSelect', args: { id: item.id } });
+ };

- it.skip('ordena estabelecimentos por distância', () => {
+ it('ordena estabelecimentos por distância', () => {
```

### 17. ❌ Alteração/commit não autorizado de `.md`, ou CHANGELOG ausente

**Regra:** a IA pode **criar** `.md` novo quando a tarefa exige, mas **não edita nem commita** `.md` existente sem autorização expressa. Duas exceções, ambas obrigatórias e sem pedir autorização: (a) o CHANGELOG da versão seguinte, em **todo** commit que altere código (Seção 6); (b) este `AGENTS_RULES.md`, quando o usuário ditar regra com `SEMPRE`.
**Prompt de correção:** "Reverta a edição no `.md` não autorizado e adicione os bullets do commit ao `CHANGELOG-<branch>-v<próxima-versão>.md` do app afetado, preservando os bullets já existentes."

```diff
- // README.md editado sem pedido → reverter
+ // apps/mobile/CHANGELOG-alfa-v0.1.4.md
+ # Changelog 0.1.4 (alfa)
+
+ - Busca de cidades no filtro volta a funcionar no Android e no iOS
```

---

## 6. 📝 CHANGELOG Obrigatório em Cada Commit

**Todo commit** que altere código de um app/pacote inclui, nele mesmo, a descrição da mudança no CHANGELOG da **versão seguinte** daquele projeto. Não é ao fim da tarefa: é a cada commit — cinco commits acrescentam bullets cinco vezes, no mesmo arquivo. A IA é a única fonte deste arquivo: `scripts/build-mobile.bash` apenas compila e não escreve CHANGELOG.

### Qual arquivo editar

| Mudança em | CHANGELOG a atualizar |
| --- | --- |
| `apps/mobile/` | `apps/mobile/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/web/` | `apps/web/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/admin/` | `apps/admin/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/landing/` | `apps/landing/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `packages/core/` | `packages/core/CHANGELOG-<branch>-v<próxima-versão>.md` |

Commit que toca mais de um projeto atualiza o CHANGELOG de **cada** um, na perspectiva daquele projeto.

### Qual versão usar

Sempre a versão **imediatamente posterior** à do `package.json`, incrementando o **patch** (salvo instrução explícita para minor/major). Versões atuais:

```txt
apps/mobile   0.1.3  → CHANGELOG-alfa-v0.1.4.md
apps/web      0.0.2  → CHANGELOG-alfa-v0.0.3.md
apps/admin    1.0.1  → CHANGELOG-alfa-v1.0.2.md
apps/landing  0.0.3  → CHANGELOG-alfa-v0.0.4.md
packages/core 1.0.0  → CHANGELOG-alfa-v1.0.1.md
```

**Durante os commits, não bumpar o `package.json`** — o CHANGELOG antecipa a versão; o bump acontece uma vez, ao abrir o PR (Seção 7).

### Formato

- Arquivo: `CHANGELOG-<branch>-v<version>.md`, onde `<branch>` é o canal (`alfa`, `beta`, `release`), não a branch de trabalho.
- Heading: `# Changelog <version> (<branch>)`.
- Bullets curtos em pt-BR, na perspectiva do usuário final — o conteúdo do mobile vai para a loja.
- **Acrescentar, nunca sobrescrever:** bullets já no arquivo são de commits anteriores ainda não publicados. Apagá-los é infração.
- Descrever o **efeito percebido**, não a implementação.

```markdown
# Changelog 0.1.4 (alfa)

- Busca de cidades no filtro volta a funcionar no Android e no iOS
- Feed passa a ordenar eventos e bares pelos mais próximos de você
```

Commits que **não** exigem CHANGELOG: mudanças restritas a `.md`, ao próprio CHANGELOG, a `scripts/` ou a configuração de CI.

---

## 7. 🔖 Bump de Versão ao Abrir PR para `alfa`

O pedido de abrir PR para `alfa` **é** a autorização do bump — não perguntar de novo.

1. Descobrir os projetos alterados: `git diff --name-only alfa...HEAD`, mapeando para `apps/*` e `packages/*`.
2. Incrementar o **patch** no `package.json` de cada projeto afetado. Nada mais: nenhum outro arquivo de versão, nenhum lockfile. No mobile, só o `package.json` (o `app.config.ts` importa `version` de lá).
3. A versão resultante **deve coincidir** com a do `CHANGELOG-<branch>-v<version>.md` que os commits vinham alimentando. Divergiu? O CHANGELOG é a fonte de verdade.
4. Commit isolado: `Bump <projeto> to <versão>` (ou `Bump versions for alfa release` quando forem vários).
5. Só então abrir o PR, com a Issue mencionada na descrição.

**Bordas:** só patch (minor/major exigem instrução explícita); só projetos tocados; só para base `alfa`; não bumpar duas vezes (se o `package.json` já está na versão do CHANGELOG pendente, o bump já foi feito); mudanças que não exigem CHANGELOG também não exigem bump.

---

## 8. Débitos Conhecidos (não são infração do seu diff)

Registrados aqui para que reviews não os confundam com regressão — e para que o PR que **tocar** a área correspondente os resolva:

| Débito | Onde | Item do checklist que ativa |
| --- | --- | --- |
| Sem `headers()` de segurança | os três `next.config.ts` | 6 — ao tocar o arquivo |
| Sem `robots.ts` / `sitemap.ts` / JSON-LD | `apps/web`, `apps/landing` | 10 — ao criar/alterar rota pública |
| Sem `not-found.tsx` / `error.tsx` / `loading.tsx` | `apps/web`, `apps/admin`, `apps/landing` | 8 e 9 — ao criar/reestruturar rota |
| Metadata mínima, sem OG | `apps/web/app/layout.tsx` | 10 — ao tocar o layout |
| Sem rota de exportação de dados (LGPD art. 18) | fluxo de conta | 5 — ao ampliar coleta de dado pessoal |
| Sem APM (Sentry/OTel) e sem E2E/Codecov | monorepo | requer autorização de dependência (15) |
| `apps/web-client/` untracked com build residual | `apps/web-client/` | limpeza, não bloqueia |
