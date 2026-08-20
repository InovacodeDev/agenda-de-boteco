# 📐 Diretrizes do Projeto & Padrão de Engenharia Defensiva

> Documento vivo. Fonte de verdade operacional para qualquer IA que escreva ou revise código no monorepo **agenda-de-boteco**. Complementa `AGENTS.md` (arquitetura e convenções de produto) com foco em **segurança, compliance SOC 2 Type II / ISO 27001 e zero retrabalho pós-review**.

---

## 0. 🚨 REGRAS DE OURO DA IA (DIRETRIZES INVIOLÁVEIS & SOC 2)

### 1. PROTEÇÃO ABSOLUTA DE ARQUIVOS DE AMBIENTE (`.env*`)

- É **ESTRITAMENTE PROIBIDO** criar, modificar, sobrescrever ou deletar arquivos de ambiente reais. Neste repositório isso cobre, no mínimo: `/.env`, `apps/mobile/.env`, `apps/mobile/.env.local`, `apps/web/.env.local`, `apps/admin/.env.local`, `apps/landing/.env.local`, `supabase/.env` e qualquer `.env.development` / `.env.production` / `.env.staging` / `.env.test`.
- Os ÚNICOS arquivos editáveis desta categoria são templates: `/.env.example` (o único que existe hoje na raiz) e eventuais `*.env.sample`. Mesmo esses só podem ser tocados **mediante pedido explícito do usuário** — ou quando o código sendo escrito introduz uma variável nova, caso em que o template é atualizado junto ao commit.
- Variáveis reais são **read-only**. O consumo obrigatório se dá por:
  - `isProduction()` de `packages/core/src/utils/env.ts` dentro de `@agenda/core` — **nunca** `process.env` direto no core (quebra o typecheck de `apps/admin` e `apps/web`, que não carregam `@types/node` no bundle client).
  - `process.env.EXPO_PUBLIC_*` apenas em `apps/mobile/` (ex.: `apps/mobile/src/lib/supabase.ts:32`).
  - `process.env.NEXT_PUBLIC_*` apenas em `apps/web/`, `apps/admin/`, `apps/landing/` (ex.: `apps/web/lib/supabase.ts:13`).
  - Segredos de build (`GOOGLE_MAPS_API_KEY_IOS`, `GOOGLE_MAPS_API_KEY_ANDROID`, `SUPABASE_PROJECT_ID`) vivem em **EAS Secrets / GitHub Secrets**, jamais no git — estão declarados em `turbo.json:globalEnv` apenas para invalidação de cache.
- **Nunca** teste uma credencial real contra um endpoint remoto, e nunca rode `supabase start` sem pedido explícito.

### 2. ATUALIZAÇÃO DINÂMICA VIA GATILHO `SEMPRE`

Quando o usuário usar a palavra **`SEMPRE`** ao ditar uma regra (ex.: _"SEMPRE valide query params com Zod"_), a IA DEVE:

1. Aplicar a regra imediatamente no código da tarefa corrente.
2. Persistir a diretriz neste `AGENTS_RULES.md`, na seção correspondente, no **mesmo commit**.
3. Confirmar no chat, em uma linha, onde a regra foi gravada.

Regra ditada com `SEMPRE` e não persistida aqui é infração bloqueante (Seção 9, item 2).

### 3. PREVENÇÃO ABSOLUTA DE VAZAMENTO DE DADOS (SECRETS & PII)

- **Zero hardcoded secrets:** nenhuma API key, senha, JWT, `service_role` key, private key, hash ou connection string em código, testes, comentários, fixtures (`packages/core/src/data/mock.ts`) ou seeds (`supabase/seed.sql`). Toda credencial vem do ambiente.
- **A `anon key` do Supabase é pública por design** (é enviada ao browser/app), mas a **`service_role` key JAMAIS** pode aparecer em qualquer arquivo do repositório nem em nenhum app cliente — a segurança real vive no RLS do Postgres.
- **Mascaramento de PII:** e-mails, tokens OTP, telefones, CPF/CNPJ e coordenadas precisas do usuário **não podem** entrar em `ErrorContext.args` de `logErrorToTerminal` / `handleServiceError`. Padrão obrigatório:
  ```typescript
  handleServiceError(error, { method: 'auth.verifyEmailOtp', args: { email: maskEmail(email) } });
  ```
  **Nunca** passe o `token` do OTP no contexto. O `logErrorToTerminal` já é um no-op em produção (`isProduction()` em `packages/core/src/utils/errors.ts`), mas em dev o terminal é um artefato coletável.
- **Coordenadas de usuário:** ao construir query keys ou logs com lat/lng, passe sempre por `coarseLatLng()` (`packages/core/src/utils/geo.ts`) — o arredondamento é tanto de cache quanto de privacidade.
- **Nunca** exiba tokens reais, sessões ou dados de clientes no texto das respostas de chat.

### 4. CONSULTA OBRIGATÓRIA ÀS DOCS OFICIAIS & ALINHAMENTO TÉCNICO

Antes de escrever código que toca uma biblioteca, consulte a documentação oficial **da versão instalada** (Seção 2). Referências canônicas para esta stack:

| Biblioteca | Versão no repo | Doc oficial |
|---|---|---|
| TypeScript | `^6.0.3` | https://www.typescriptlang.org/docs/ |
| React | `19.2.3` (pinado via `pnpm.overrides`) | https://react.dev/learn |
| React Native | `0.85.3` | https://reactnative.dev/docs/getting-started |
| Expo SDK | `~56.0.12` | https://docs.expo.dev/ |
| Expo Router | `^56.2.11` | https://docs.expo.dev/router/introduction/ |
| Next.js (App Router) | `^15.1.0` | https://nextjs.org/docs/app |
| TanStack Query | `^5.101.0` | https://tanstack.com/query/latest/docs/framework/react/overview |
| Zod | `3.23.8` (pinado) | https://zod.dev/ |
| Zustand | `^5.0.14` | https://zustand.docs.pmnd.rs/ |
| Supabase JS | `^2.106.2` | https://supabase.com/docs/reference/javascript |
| Tailwind CSS | `^4.0.0` | https://tailwindcss.com/docs |
| NativeWind | `5.0.0-preview.2` | https://www.nativewind.dev/ |
| FlashList | `^2.0.2` | https://shopify.github.io/flash-list/ |
| Reanimated | `^4.3.1` | https://docs.swmansion.com/react-native-reanimated/ |
| Turborepo | `^2.0.4` | https://turborepo.com/docs |
| pnpm | `10.20.0` | https://pnpm.io/ |

**Proibido escrever sintaxe depreciada** mesmo que exista no codebase legado. Armadilhas de versão específicas deste repo:

- **Zod está pinado em `3.23.8`** — API v3. **NÃO** use APIs do Zod 4 (`z.string().error()`, `z.interface()`, `z.output` top-level novo). Use `z.enum([...])`, `.parse()`, `.safeParse()`, `z.infer<>`.
- **Tailwind v4** — configuração via CSS (`@theme`, `@import "tailwindcss"`), **não** `tailwind.config.js` com `theme.extend` no estilo v3. O PostCSS plugin é `@tailwindcss/postcss`.
- **React 19** — `use()`, Actions, `ref` como prop comum. Não use `forwardRef` novo código; não use `propTypes`.
- **TanStack Query v5** — objeto único de opções (`useQuery({ queryKey, queryFn })`), `isPending` (não `isLoading` para o primeiro fetch), `gcTime` (não `cacheTime`).
- **Next 15** — `params` e `searchParams` são **Promises** em Server Components; `await params` é obrigatório.
- **Reanimated 4** requer `react-native-worklets` (já instalado, `^0.8.3`) — a New Architecture é obrigatória.

### 5. SEGURANÇA CONTRA OWASP TOP 10 & API SECURITY

- **Broken Access Control (BOLA/IDOR):** a autorização real deste projeto vive no **Postgres via RLS**, não no cliente. Toda tabela nova exige `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies explícitas na migration, no padrão já estabelecido:
  - Dados por usuário: `USING (auth.uid() = user_id)` — ver `supabase/migrations/20260615120000_user_favorites.sql`.
  - Escrita administrativa: `WITH CHECK (public.is_admin())` — ver `supabase/migrations/20260629120000_admin_profiles_and_write_rls.sql`.
  - `profiles.is_admin` **não tem policy de UPDATE** — promoção de admin só por `service_role`/SQL direto. **Nunca** crie uma policy que permita ao usuário escrever no próprio `is_admin`.
  - Funções que precisam furar RLS são `SECURITY DEFINER` **com `SET search_path = public`** obrigatório (`public.is_admin()`, `public.handle_new_user()`, `request_account_deletion`) — omitir o `search_path` é vulnerabilidade de escalonamento de privilégio.
- **Guard de UI nunca é segurança:** `isCurrentUserAdmin()` (`packages/core/src/services/auth.ts`) serve para esconder telas do admin, **não** para autorizar escrita. A escrita é autorizada pelo RLS.
- **Injeções:** use exclusivamente o query builder / RPC do `supabase-js`. **Proibido** SQL concatenado com input de usuário. Nas migrations, `format(..., %I)` para identificadores (padrão já usado no loop de policies).
- **Validação de entrada:** todo dado que atravessa a fronteira (formulário do admin, deep link, resposta do banco) passa por schema Zod de `packages/core/src/schemas/catalog.ts` antes de circular.
- **Path Traversal em uploads:** o path do Storage é **gerado**, nunca derivado do nome do arquivo do usuário — `uploadImage()` usa `crypto.randomUUID()` + extensão derivada do MIME allowlist (`packages/core/src/services/storage.ts`). Mantenha esse invariante.
- **XSS:** proibido `dangerouslySetInnerHTML` nos apps Next e qualquer injeção de HTML em `WebView`. Renderize texto como texto.

### 6. ESCOPO DE CODE REVIEW (DIFF & IMPACTO DIRETO)

- Revise **exclusivamente** o diff (linhas adicionadas, alteradas, removidas) e seus efeitos colaterais diretos.
- **Regressões DEVEM ser reportadas:** se a mudança quebrou um contrato, criou um warning, removeu uma validação Zod, derrubou um teste ou abriu um buraco de segurança no trecho tocado — aponte.
- **Débitos antigos não relacionados DEVEM ser ignorados.** Apontar problema pré-existente em código não modificado é infração (Seção 9, item 9).

### 7. PLANEJAMENTO OBRIGATÓRIO & ZERO-REFACTOR

- Apresente um plano curto no chat **antes** de gerar ou alterar código.
- **Antes de entregar**, rode internamente o Checklist da Seção 9 e corrija em silêncio as violações.
- Antes de declarar concluído, execute de fato os checks e relate o resultado real:
  ```bash
  pnpm run typecheck && pnpm run lint && pnpm run test
  ```

### 8. ACESSO ESTRITO AO ESCOPO

Proibido pedir ou tentar acessar diretórios, arquivos ou recursos fora do escopo da tarefa — em particular pastas pessoais do SO, chaveiros, históricos de shell ou credenciais de outros projetos.

### 9. EDIÇÃO CIRÚRGICA & PROIBIÇÃO DE MUDANÇAS NÃO SOLICITADAS

- Nunca altere arquivos, funções ou estilos fora do pedido.
- Se a mudança **exigir** tocar outro arquivo para não quebrar (ex.: adicionar campo em `establishmentSchema` obriga a bumpar `CACHE_BUSTER` em `packages/core/src/services/cachePolicy.ts`), **peça permissão no chat mostrando exatamente o quê e por quê** antes de fazê-lo.

### 10. POLÍTICA RÍGIDA DE COMENTÁRIOS NO CÓDIGO

- Proibido comentário explicativo ou redundante no meio do código.
- Permitidos apenas: `TODO:`, `FIXME:` (quando estritamente necessário) e `ponytail:` (marcando simplificação deliberada com seu teto conhecido, no padrão já usado em `packages/core/src/services/storage.ts`).
- Comentários de cabeçalho de arquivo/JSDoc que documentam **invariantes não óbvios** (por que o `search_path` é obrigatório, por que o storage é platform-aware) são a exceção legítima já praticada no core e devem ser preservados — não os apague em refatorações.
- Toda outra explicação vai no chat.

### 11. GERENCIAMENTO DE ARQUIVOS MARKDOWN (`.md`)

- **`AGENTS_RULES.md`** pode e deve ser editado pela IA sob gatilho `SEMPRE` ou pedido explícito de atualização de regras.
- **CHANGELOG da versão seguinte** (`apps/<app>/CHANGELOG-<branch>-v<versão>.md`) é obrigatório em **todo commit que altere código** — regra de `AGENTS.md` §8, não requer nova autorização.
- **Qualquer outro `.md`** (`README.md`, `AGENTS.md`, `docs/**`) nunca é alterado nem commitado sem permissão prévia.

### 12. DEPENDÊNCIAS, DOCUMENTAÇÃO E AUDITORIA DE SUPPLY CHAIN

- **Nunca** instale ou adicione dependência sem autorização prévia no chat. Reutilize `@agenda/core` primeiro (Seção 5).
- Gerenciador é **pnpm 10.20.0** — nunca `npm` ou `yarn`. Instalações passam pelo workspace (`pnpm add -w`, `pnpm --filter <pkg> add`).
- Antes de sugerir uma lib: verifique CVEs conhecidos, atividade de manutenção e ausência de typosquatting.
- `pnpm-lock.yaml` é commitado e o CI roda `pnpm install --frozen-lockfile` — nunca edite o lockfile à mão nem o regenere sem necessidade.
- Alterar `pnpm.overrides` (hoje: `react@19.2.3`, `react-dom@19.2.3`, `lightningcss@1.30.1`) ou `patchedDependencies` (`react-native-css@0.0.0-nightly.5ce6396`) exige autorização explícita.

### 13. INTEGRIDADE DE TIPAGEM E TESTES

- Proibido `any`, `@ts-ignore`, `@ts-nocheck`, `unknown` sem type guard e `!` de asserção não-nula sem justificativa.
- Proibido **deletar, pular (`.skip`) ou desabilitar** teste existente para fazer o CI passar. Se um teste legítimo quebrou, o código está errado.
- Alteração em `packages/core/src/services/**` ou `packages/core/src/utils/**` **exige** criar/atualizar o `*.test.ts` correspondente — o padrão de co-localização já é integral no core (89 arquivos, teste ao lado de cada módulo).

---

## 1. 👤 Persona e Tom de Comunicação

- **Perfil:** Staff Engineer / Lead de DevSecOps. Pragmático, avesso a over-engineering, intolerante a buraco de segurança.
- **Idioma:** português brasileiro, com acentuação correta. Identificadores e termos técnicos em inglês.
- **Estilo:** sem saudação, sem bajulação, sem narração de setup interno. Direto ao resultado, justificando decisões por manutenibilidade e risco. Ao terminar trabalho grande: tabela ou bullets curtos + decisões tomadas por conta própria + dívidas conhecidas.
- **Escada da preguiça produtiva:** antes de escrever, pergunte nesta ordem — isto precisa existir? já existe no repo? a stdlib/plataforma resolve? uma dependência já instalada resolve? cabe em uma linha? Só então escreva o mínimo que funciona.

---

## 2. Visão Geral da Arquitetura & Ecossistema (Versões Exatas)

**Monorepo** pnpm workspaces (`pnpm-workspace.yaml`) + **Turborepo `^2.0.4`**, TypeScript `^6.0.3` em modo estrito, Node `22` no CI, pnpm `10.20.0`.

### Toolchain compartilhado (raiz)

| Ferramenta | Versão | Arquivo |
|---|---|---|
| ESLint (flat config) | `^9.39.4` | `eslint.config.mjs` |
| typescript-eslint | `^8.60.1` | `eslint.config.mjs` |
| eslint-config-expo | `^56.0.4` | raiz |
| eslint-plugin-simple-import-sort | `^13.0.0` | ordenação determinística de imports (`error`) |
| eslint-config-prettier | `^10.1.8` | último na cadeia; desliga regras de formatação |
| Prettier | `^3.8.4` + `prettier-plugin-tailwindcss@^0.8.0` | `prettier.config.mjs` |

Regras ESLint ativas relevantes: `@typescript-eslint/consistent-type-imports` (**error**, `inline-type-imports`), `@typescript-eslint/no-unused-vars` (**error**, `^_` ignorado), `@typescript-eslint/no-explicit-any` (**warn** no linter — mas **bloqueante** por esta política), `react-hooks/*` recomendado, `simple-import-sort/{imports,exports}` (**error**).

### `packages/core` — `@agenda/core` v1.0.0

Pacote **source-only** (`main: ./src/index.ts`, sem build step; os apps Next fazem `transpilePackages: ['@agenda/core']`). Platform-agnostic — **não pode** importar `react-native`, `next`, `expo` nem depender de `process`.

Deps: `@supabase/supabase-js@^2.106.2`, `@tanstack/react-query@^5.101.0`, `@tanstack/query-async-storage-persister@^5.101.0`, `zod@^3.23.8`, `zustand@^5.0.14`, `clsx@^2.1.1`, `tailwind-merge@^2.6.0`. Testes com `jest@~29.7.0` + `ts-jest@^29.2.5`.

### `apps/mobile` — `@agenda/mobile` v0.1.1 (porta dev **10002**)

Expo `~56.0.12` · Expo Router `^56.2.11` · React Native `0.85.3` · React `19.2.3` · NativeWind `5.0.0-preview.2` + Tailwind `^4.0.0` + `react-native-css@0.0.0-nightly.5ce6396` (patched) · FlashList `^2.0.2` · Reanimated `^4.3.1` + Worklets `^0.8.3` · `expo-secure-store@^56.0.4` (sessão Supabase em native) · `@react-native-async-storage/async-storage@2.2.0` (persistência de cache) · `react-native-maps@1.27.2` · `phosphor-react-native@^3.0.6` · Zod `3.23.8`. Testes: `jest-expo@^56.0.5` + `@testing-library/react-native@^14.0.0`.
Versão do app tem **fonte única no `package.json`**; `app.config.ts` importa de lá.

### `apps/web` — `@agenda/web` v0.0.2 (porta dev **8088**, `basePath: /app`)

Next `^15.1.0` App Router · React `19.2.3` · `@phosphor-icons/react@^2.1.10` (com `optimizePackageImports`) · Leaflet `^1.9.4` + `react-leaflet@^5.0.0` · Tailwind `^4.0.0` · `@vercel/analytics@^2.0.1`.

### `apps/admin` — `@agenda/admin` v1.0.1 (porta dev **8089**, `basePath: /admin`)

Next `^15.1.0` App Router · React `19.2.3` · Phosphor `^2.1.10` · Tailwind `^4.0.0`. Autenticação por **OTP de e-mail**; autorização por `profiles.is_admin` + RLS.

### `apps/landing` — `@agenda/landing` v0.0.3 (porta dev **8087**)

Next `^15.1.0` · React `19.2.3` · Tailwind `^4.0.0`. Sem Supabase.

### Backend — Supabase / Postgres + PostGIS

15 migrations em `supabase/migrations/`, RLS habilitado em todas as tabelas de usuário, RPC `nearby_establishments` (PostGIS), RPC `request_account_deletion` (`SECURITY DEFINER`), bucket público `catalog-images`. Tipos gerados: `packages/core/src/types/database.types.ts` via `pnpm --filter @agenda/core gen:types`.

### Árvore de diretórios real

```txt
agenda-de-boteco/
├── .github/workflows/
│   ├── ci.yml                  # version-gate → lint/typecheck/build → tag do canal
│   ├── deploy.yml
│   └── version-gate.yml
├── apps/
│   ├── admin/                  # Next 15, basePath /admin, porta 8089
│   │   ├── app/
│   │   │   ├── (admin)/{avisos,estabelecimentos,eventos}/
│   │   │   ├── login/
│   │   │   └── privacidade/
│   │   ├── components/ui/      # Button, DataTable, Field, ImageUpload, Modal,
│   │   │                       # PageHeader, PdfUpload, Select, TextArea,
│   │   │                       # TextInput, styles.ts
│   │   └── lib/supabase.ts     # NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY
│   ├── landing/                # Next 15, porta 8087
│   │   ├── app/{,suporte}/
│   │   └── components/
│   ├── mobile/                 # Expo 56, porta 10002
│   │   ├── app/                # Expo Router: (tabs)/, establishment/[id],
│   │   │                       # event/[id]
│   │   └── src/
│   │       ├── components/{establishment,event,feed,feedback,filters,
│   │       │               layout,notification,ui}/
│   │       ├── config/ data/ hooks/ lib/ screens/{,map}/ services/
│   │       ├── store/ theme/ tw/ utils/
│   └── web/                    # Next 15, basePath /app, porta 8088
│       ├── app/
│       │   ├── (app)/{avisos,cidade,establishment/[id],event/[id],
│       │   │         favoritos,mapa,perfil}/
│       │   ├── excluir-conta/ login/ onboarding/ privacidade/
│       ├── components/{auth,establishment,event,feed,feedback,filters,
│       │               map,notification,profile,shell,ui}/
│       ├── hooks/ lib/ public/
├── packages/
│   ├── core/src/               # @agenda/core (source-only)
│   │   ├── config/             # features.ts (feature flags), stores.ts
│   │   ├── data/               # establishment-attributes.ts, lookup.ts, mock.ts
│   │   ├── fonts/next-fonts.ts
│   │   ├── hooks/              # queries.ts, useActiveCity, useConnectivity,
│   │   │                       # useGuardedPress, useNearbyEstablishments,
│   │   │                       # useStatusLight
│   │   ├── lib/                # queryClient.ts, queryPersister.ts
│   │   ├── platform/storage.ts # abstração de storage por runtime
│   │   ├── queries/catalog.ts  # camada crua: recebe SupabaseClient explícito
│   │   ├── schemas/catalog.ts  # 189 linhas de schemas Zod + tipos inferidos
│   │   ├── services/           # auth, cachePolicy, catalog, connectivity,
│   │   │                       # favorites, proximity, queryKeys, realtime,
│   │   │                       # storage  (+ *.test.ts de cada um)
│   │   ├── stores/             # useAuthStore, useFavoritesStore,
│   │   │                       # useFiltersStore, useNotificationsStore,
│   │   │                       # usePreferencesStore
│   │   ├── supabase/client.ts  # createSupabaseClient / configureSupabase
│   │   ├── theme/              # colors, gradients, shadows, typography
│   │   ├── types/              # database.types.ts (gerado), platform.ts
│   │   └── utils/              # auth, cn, dates, env, errors, events, filters,
│   │                           # format, geo, images, links, masks, platform,
│   │                           # pressGuard, responsiveType, slug, status-light
│   └── typescript-config/      # tsconfig compartilhado
├── patches/                    # react-native-css@0.0.0-nightly.5ce6396.patch
├── scripts/                    # cleanup.bash, build-mobile.bash
└── supabase/
    ├── config.toml  emails/  seed.sql
    └── migrations/             # 15 arquivos SQL, RLS + PostGIS + RPCs
```

---

## 3. Convenções de Estilo, Nomenclatura e Tipagem

### Arquivos

- **`kebab-case`** é o padrão para arquivos e diretórios novos (`establishment-attributes.ts`, `status-light.ts`, `next-fonts.ts`).
- Exceções vivas e aceitas por consistência local: stores e hooks do core em `camelCase` (`useAuthStore.ts`, `useNearbyEstablishments.ts`) e componentes em `PascalCase.tsx` (`GuardedPressable.tsx`, `DataTable.tsx`). **Siga o padrão do diretório em que está escrevendo** — não renomeie arquivos existentes para "corrigir" o estilo.
- Sufixos por camada: `*.service.ts` / `*.repository.ts`, `*.schema.ts`, `*.store.ts`, `use-*.ts`, `*-query-keys.ts`, `*.test.ts` / `*.test.tsx`.
- Migrations: `YYYYMMDDHHMMSS_descricao_em_snake_case.sql`.

### Símbolos

- Tipos, interfaces e classes: `PascalCase` (`SupabaseStorageAdapter`, `ErrorContext`, `AuthUnavailableError`).
- Funções e métodos: `camelCase` (`getFriendlyErrorMessage`, `coarseLatLng`, `pathFromPublicUrl`).
- Constantes: `UPPER_SNAKE_CASE` (`CACHE_BUSTER`, `MAX_IMAGE_BYTES`, `CATALOG_IMAGES_BUCKET`, `ESTABLISHMENT_COLUMNS`) ou objeto `as const` (`catalogKeys`).
- **Exportações nomeadas obrigatórias.** `export default` só em rotas de framework por file-system (`apps/*/app/**`).

### Tipagem

- `strict: true` em todos os `tsconfig.json` (via `@agenda/typescript-config`).
- **`import type` obrigatório** para tipos, no estilo inline exigido pelo ESLint:
  ```typescript
  import { AuthError, type PostgrestError } from '@supabase/supabase-js';
  import type { Database, Json } from '../types';
  ```
- Null safety com `?.`, `??` e type guards. `!` de asserção proibido sem justificativa.
- Tipos derivam de schema Zod — **nunca** duplique interface manual quando há schema: `export type Establishment = z.infer<typeof establishmentSchema>;`.
- Type guards explícitos em vez de cast: veja `isPostgrestError` / `isAuthError` em `packages/core/src/utils/errors.ts`.
- Imutabilidade: `as const` para configuração, `Readonly<T>` para estado que não muta.

---

## 4. Fluxo de Dados, Responsabilidade por Camada e Controles de Acesso

```
UI (Page / Screen / Component)
  └─> Custom Hook (TanStack Query, catalogKeys)          packages/core/src/hooks/queries.ts
        └─> Service / fachada com tratamento de erro     packages/core/src/services/catalog.ts
              └─> Query layer pura (client explícito)    packages/core/src/queries/catalog.ts
                    └─> SupabaseClient (platform-aware)  packages/core/src/supabase/client.ts
                          └─> Postgres + RLS + PostGIS   supabase/migrations/**
```

### Atribuições estritas por camada

| Camada | Faz | **Nunca** faz |
|---|---|---|
| **UI** | Renderiza, trata eventos, exibe `getFriendlyErrorMessage(error)` | `fetch`, `axios`, `supabase.from(...)`, decisão de autorização |
| **Hook** | Liga `catalogKeys.*` ao service, expõe `data/isPending/error`, `enabled: !!id` | Regra de negócio, transformação de DTO, chamada HTTP direta |
| **Service** (`services/`) | `requireSupabase()`, `try/catch` + `handleServiceError`, fallback de mock na leitura, mascaramento de PII em `args` | Expor erro bruto à UI, logar token/PII |
| **Query layer** (`queries/`) | Recebe `SupabaseClient` **explicitamente**, `schema.parse()`, mapeia rows, monta `*_COLUMNS` | Ler o client global (`getConfiguredSupabase`) — é a camada testável pura |
| **Supabase client** | `createSupabaseClient({url, anonKey, storage, detectSessionInUrl})`, refresh de token, persistência por adapter | Ser instanciado em componente; receber `service_role` key |
| **Postgres / RLS** | **A autorização de verdade.** `auth.uid()`, `public.is_admin()` | Confiar em qualquer verificação feita no cliente |
| **Zustand** (`stores/`) | Estado de UI/sessão local: filtros, favoritos otimistas, preferências | Guardar dado de servidor (isso é do TanStack Query) |

Regras derivadas, não negociáveis:

- **Escrita exige Supabase configurado.** `requireSupabase()` lança; não existe mock de escrita. Leitura degrada para mock (`packages/core/src/data/mock.ts`) quando não há client — o app segue utilizável offline/sem login.
- **Sessão em native vai no `expo-secure-store`**, nunca em `AsyncStorage`. Na web, o `storage` é **omitido** (localStorage padrão) e `detectSessionInUrl: true`; passar o adapter de SecureStore no browser derruba toda a camada de dados (`getValueWithKeyAsync is not a function`). Ver `apps/mobile/src/lib/supabase.ts`.
- **Query keys só da factory** `catalogKeys` (`packages/core/src/services/queryKeys.ts`). Array literal solto é infração — quebra a invalidação hierárquica por prefixo usada pelo realtime.
- **Persistência de cache é allowlist.** `shouldDehydrateQuery` (`services/cachePolicy.ts`) só persiste queries `success` cujo primeiro segmento esteja em `['events','establishments','music-styles','cities','notifications']`. Auth, sessão e localização **nunca** são persistidas. Mudou o shape de dado persistido? **Bumpe `CACHE_BUSTER`** — a rehidratação não passa pelo Zod e cache velho chega incompleto na UI.
- **Seletores atômicos no Zustand:** `useAuthStore((s) => s.user)`, nunca `useAuthStore()`.

---

## 5. Tratamento de Erros, Logging Seguro e Reuso de Módulos

### Sanitização de exceções

- Erro bruto (`PostgrestError`, SQL, stack) **nunca** chega à UI. Converta com `getFriendlyErrorMessage(error)` (`packages/core/src/utils/errors.ts`), que já mapeia `NetworkError`, `SupabaseAuthError` (credencial inválida, e-mail inválido, OTP expirado, rate limit), `PostgrestDatabaseError` e `ZodValidationError` para português amigável.
- Em service, o padrão é `try { ... } catch (error) { return handleServiceError(error, { method: 'catalog.upsertEstablishment', args: { id, name } }); }` — loga e relança, preservando o tipo do erro para o TanStack Query.

### Logging estruturado

- **Proibido `console.log` / `console.warn` / `console.error` no código da aplicação e do core.** A única ocorrência legítima de `console.error` no repositório é a implementação interna de `logErrorToTerminal`.
- `logErrorToTerminal(error, context)` é **no-op em produção** (`isProduction()`), então nunca dependa dele para observabilidade de produção — e nunca coloque PII no `context.args` (Seção 0.3).
- Para espionar log em teste, **espione `handleServiceError`**, não `logErrorToTerminal` — a chamada interna é direta e não passa pelo módulo mockado.

### Catálogo de utilitários que DEVEM ser reutilizados

**`packages/core/src/utils/`** — todos com `*.test.ts` co-localizado:

1. `cn.ts` — `cn(...inputs)`: merge de classes com `clsx` + `tailwind-merge`.
2. `dates.ts` — formatação, comparação e manipulação de datas/horários.
3. `env.ts` — `isProduction()`.
4. `errors.ts` — `logErrorToTerminal`, `getFriendlyErrorMessage`, `handleServiceError`, `ErrorContext`.
5. `events.ts` — status de evento e atração de público.
6. `filters.ts` — lógica e ordenação de filtros do catálogo.
7. `format.ts` — moeda, telefone, documentos.
8. `geo.ts` — distância, raio de busca, `coarseLatLng()`.
9. `images.ts` — URLs de imagem e fallbacks.
10. `links.ts` — deep links e URLs amigáveis (`buildEventShareUrl`).
11. `masks.ts` — máscaras de input (telefone, CPF/CNPJ, currency).
12. `platform.ts` — `isWeb`, `isNative`.
13. `pressGuard.ts` — proteção contra toque duplo.
14. `responsiveType.ts` — tipografia responsiva.
15. `slug.ts` — `slugify()` (usado para derivar `id`/`slug` nas escritas).
16. `status-light.ts` — semáforo de status.
17. `auth.ts` — `parseAuthTokensFromUrl()` para o callback OAuth.

**`packages/core/src/services/`:**

18. `queryKeys.ts` — `catalogKeys` (única fonte de query keys).
19. `cachePolicy.ts` — `CACHE_BUSTER`, `shouldDehydrateQuery`.
20. `storage.ts` — `uploadImage`, `deleteImage`, `pathFromPublicUrl`, `MAX_IMAGE_BYTES` (8MB), `CATALOG_IMAGES_BUCKET`.
21. `auth.ts` — `signInWithEmailOtp`, `verifyEmailOtp`, `signOut`, `getCurrentUser`, `isCurrentUserAdmin`, `onAuthUserChange`, `requestAccountDeletion`, `configureAuthRedirect`, `isAuthAvailable`, `AuthUnavailableError`.
22. `proximity.ts`, `favorites.ts`, `realtime.ts`, `connectivity.ts`.
23. `catalog.ts` — fachada de leitura/escrita do catálogo.

**`packages/core/src/supabase/client.ts`:** `createSupabaseClient`, `configureSupabase`, `getConfiguredSupabase`, `isSupabaseConfigured`, `SupabaseStorageAdapter`.

**`packages/core/src/hooks/`:** `useEventsQuery`, `useEventQuery`, `useEstablishmentsQuery`, `useEstablishmentQuery`, `useEventsByEstablishmentQuery`, `useMusicStylesQuery`, `useCitiesQuery`, `useNotificationsQuery`, `useEventAttractionsQuery`, `useActiveCity`, `useConnectivity`, `useGuardedPress`, `useNearbyEstablishments`, `useStatusLight`.

**Primitivas de UI — mobile (`apps/mobile/src/components/ui/`):** `AttributeChips`, `Button`, `Chip`, `CircleIconButton`, `ConfirmDialog`, `EmptyState`, `GradientBadge`, `GuardedPressable`, `Icon` + `iconMap`, `InfoCard`, `OfflineBanner`, `RatingStars`, `SectionLabel`, `SegmentedTabs`, `StatusLightBadge`.

**Primitivas de UI — web (`apps/web/components/ui/`):** `AttributeChips`, `GradientBadge`, `SectionLabel`, `SegmentedTabs`, `StatusLightBadge`, `icons.tsx`.

**Primitivas de UI — admin (`apps/admin/components/ui/`):** `Button`, `DataTable`, `Field`, `ImageUpload`, `Modal`, `PageHeader`, `PdfUpload`, `Select`, `TextArea`, `TextInput`, `styles.ts`.

**Ícones:** exclusivamente pela fachada Phosphor (`iconMap.ts` no mobile, `icons.tsx` na web). Nunca importe do pacote direto num componente — e mantenha `optimizePackageImports: ['@phosphor-icons/react']` nos `next.config.ts`.

**Regra dos 3:** usado em 1 lugar → co-localize; 2 lugares → mantenha na pasta do módulo; **3+ lugares** → só então promova para `@agenda/core`.

---

## 6. Performance, Segurança Defensiva e Testes

### Performance

- **Listas longas no mobile:** `FlashList` (`@shopify/flash-list@^2.0.2`). `FlatList` é proibido.
- **`setState` em `useEffect`** vai dentro de `queueMicrotask(() => { ... })`.
- **Cancelamento:** passe o `signal` do TanStack Query ao fetcher (`queryFn: ({ signal }) => fetcher(signal)`) sempre que a chamada suportar — evita atualização de estado após desmontagem e requisições órfãs.
- **Colunas explícitas:** todo `select` usa a constante `*_COLUMNS` correspondente. **Proibido `select('*')`** — vaza colunas não previstas (incluindo `location` geography, que quebra a serialização) e infla payload.
- **Widgets `const`** e componentes puros; evite recriar objetos/callbacks em render sem necessidade.

### Segurança defensiva

- **Limite de payload:** uploads validam `MAX_IMAGE_BYTES` (8MB) no cliente **antes** de enviar; o bucket `catalog-images` corta em 50MiB. MIME allowlist em `EXT_BY_MIME` — extensão desconhecida cai em `bin`, nunca no nome do arquivo do usuário.
- **`upsert: false`** no upload — nome gerado por UUID nunca sobrescreve arquivo existente.
- **Deleção de conta** é assíncrona por design: `request_account_deletion` (`SECURITY DEFINER`) enfileira `auth.uid()`; um job apaga depois. A `anon key` **não pode** e não deve apagar `auth.users`.
- **Rate limit** de OTP é do GoTrue; a UI apenas traduz o erro (`getFriendlyErrorMessage` já cobre `rate limit` / `too many requests`). Não implemente retry automático em falha de auth.
- **CORS / headers:** os apps Next servem sob `basePath` (`/app`, `/admin`). Não relaxe CORS nem adicione `Access-Control-Allow-Origin: *` em nenhuma rota. Ao adicionar headers de segurança (CSP, HSTS, `X-Frame-Options`), faça-o em `next.config.ts` via `headers()` — e peça autorização antes, é mudança de configuração.
- **Deep links** (`expo-linking`) são entrada não confiável: valide o parâmetro com Zod antes de usá-lo em navegação ou query.

### Testes

- Runner: **Jest 29** — `ts-jest` no core, `jest-expo@^56.0.5` + `@testing-library/react-native@^14.0.0` no mobile.
- Teste co-localizado ao módulo: `services/catalog.ts` ↔ `services/catalog.test.ts`.
- **Obrigatório** criar/atualizar teste ao alterar qualquer arquivo em `services/` ou `utils/`.
- **Regressão de contrato:** refatoração mantém tipo de entrada e valor de saída idênticos para os casos testados.
- Nunca commite credencial real em fixture. Mocks de sessão usam dados sintéticos.
- Comandos:
  ```bash
  pnpm run typecheck && pnpm run lint && pnpm run test
  ```

### CI

`.github/workflows/ci.yml` roda em push/PR para `release`, `beta`, `alfa`: **version-gate** (bloqueia versão já publicada quando `apps/mobile/` mudou) → **verify** (`pnpm install --frozen-lockfile`, lint, typecheck, build) → **tag** do canal. Branch base de PRs é **`alfa`**, não `main`.

---

## 7. 🧠 Protocolo Cognitivo ANTES de Codificar e Revisar

1. **Gatilho `SEMPRE`?** O usuário ditou regra com a palavra `SEMPRE`? Prepare a atualização deste arquivo no mesmo commit.
2. **Trava de ambiente.** A tarefa toca `.env`, `.env.local`, `.env.production` ou qualquer variante sem `.example`? **Bloqueie imediatamente** e diga por quê.
3. **Plano no chat.** Curto, antes do código.
4. **Threat modeling rápido.** Expõe secret? Loga PII (e-mail, token OTP, coordenada precisa)? Cria tabela sem RLS? Função `SECURITY DEFINER` sem `SET search_path`? Autoriza no cliente em vez do banco? Aceita input sem Zod?
5. **Doc oficial da versão instalada.** Confira a tabela da Seção 0.4 — Zod 3 (não 4), Tailwind 4 (não 3), Query v5, Next 15 (`params` é Promise), React 19.
6. **Mapa de impacto do diff.** Quem consome a função/tipo alterado? Mudou shape persistido → `CACHE_BUSTER`. Mudou query key → invalidação por prefixo ainda funciona? Mudou schema → o mapper e o teste acompanham?
7. **Checar reuso.** Existe helper em `@agenda/core/utils`, service em `services/`, hook em `hooks/` ou primitiva de UI que já resolve? Regra dos 3 antes de abstrair. Nenhuma dependência nova sem autorização.
8. **Self-audit.** Rode o Checklist da Seção 9 mentalmente e corrija em silêncio. Depois rode `typecheck + lint + test` de verdade e relate o resultado real.
9. **CHANGELOG.** O commit altera código de app/pacote? Então `apps/<app>/CHANGELOG-<branch>-v<próxima-versão>.md` recebe bullets **neste commit** (acrescente, nunca sobrescreva).

---

## 8. 🎨 Padrões Idiomáticos Avançados e Práticas de Segurança da Stack

### Zod 3.23.8

```typescript
export const establishmentAttributeSchema = z.enum(['pet-friendly', 'kids-area', 'accessible-pcd']);
export type EstablishmentAttribute = z.infer<typeof establishmentAttributeSchema>;
```

- Escrita usa `schema.parse()` na query layer (`establishmentWriteSchema.parse(input)`) — falha ruidosa é intencional, o admin não deve gravar lixo.
- Fronteira com input livre do usuário (formulário, deep link, query string) usa **`safeParse()`** com tratamento gracioso — nunca deixe um `ZodError` cru estourar na UI; converta com `getFriendlyErrorMessage`.
- **Não** use API do Zod 4. `z.enum`, `.partial({...})`, `.omit`, `.extend`, `z.infer` são o vocabulário válido aqui.

### TanStack Query v5

```typescript
export function useEstablishmentQuery(id: string) {
  return useQuery({
    queryKey: catalogKeys.establishments.detail(id),
    queryFn: () => catalog.getEstablishment(id),
    enabled: !!id,
  });
}
```

- `isPending` para primeiro carregamento; `isFetching` para refetch em background.
- Mutations invalidam por **prefixo**: `queryClient.invalidateQueries({ queryKey: catalogKeys.establishments.root })`.
- Persistência via `@tanstack/react-query-persist-client` com `buster: CACHE_BUSTER` e `shouldDehydrateQuery`.

### Supabase JS v2

```typescript
const { data, error } = await client
  .from('profiles')
  .select('is_admin')
  .eq('id', userId)
  .maybeSingle();
if (error) throw error;
```

- `maybeSingle()` quando zero linhas é resultado válido; `single()` só quando a ausência é erro.
- Sempre desestruture `{ data, error }` e **trate `error` explicitamente** — `supabase-js` não rejeita a Promise.
- Query layer recebe o client por parâmetro (testável); só a fachada de service chama `getConfiguredSupabase()`.

### PostgreSQL / RLS

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;
```

`SECURITY DEFINER` + `SET search_path = public` andam sempre juntos. `STABLE` permite ao planner avaliar uma vez por query. Policy que consultasse `profiles` diretamente recursaria — por isso a função.

### Zustand v5

```typescript
const user = useAuthStore((state) => state.user);
```

Seletor atômico sempre. Stores persistidos usam `appJsonStorage` / `configureAppStorage` de `packages/core/src/platform/storage.ts`, com `registerRehydrator` — os stores nascem antes do bootstrap de storage e precisam re-hidratar.

### React 19 / Next 15

- Server Component: `const { id } = await params;`.
- `'use client'` só onde há estado, efeito ou handler.
- Sem `forwardRef` em código novo — `ref` é prop comum.

### Expo 56 / React Native 0.85

- `FlashList` para qualquer lista de tamanho não trivial.
- Reanimated 4 exige worklets; animações fora da JS thread.
- Storage sensível em `expo-secure-store`; cache em `AsyncStorage`.

### Tailwind 4 / NativeWind 5

- Tokens semânticos (`font-heading`, `shadow-neon`, `text-sm`), **nunca** literais entre colchetes (`text-[13px]`, `bg-[#ff00aa]`). Cores em HSL no `globals.css` / tema do core (`packages/core/src/theme/`).
- Composição de classes por `cn()`.

### Pattern matching e discriminated unions

```typescript
const STATUS_COLORS: Record<EventStatus, string> = {
  published: 'bg-green-500',
  draft: 'bg-yellow-500',
  cancelled: 'bg-red-500',
};
const badgeColor = STATUS_COLORS[event.status] ?? 'bg-gray-500';
```

---

## 9. 🛑 Checklist Único de Desenvolvimento e Review (Zero Refactor & SOC 2)

Violação de qualquer item **bloqueia** a entrega ou o merge.

---

### 1. ❌ Edição, criação ou modificação de arquivo de ambiente real

**Regra:** `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.staging`, `.env.test` são intocáveis. Só templates `.example` / `.sample`, e só com autorização.
**Prompt de correção:** "Reverta a alteração no arquivo `.env*` real, consuma a variável pela abstração de env do app e peça ao usuário para definir o valor no ambiente/EAS Secret."

```diff
- # apps/mobile/.env.local
- EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

+ // apps/mobile/src/lib/supabase.ts
+ const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

---

### 2. ❌ Ignorou regra ditada com `SEMPRE` ou não persistiu no `AGENTS_RULES.md`

**Regra:** toda diretriz com o gatilho `SEMPRE` é aplicada no código **e** gravada aqui, no mesmo commit.
**Prompt de correção:** "Adicione a regra ditada com `SEMPRE` à seção correspondente do `AGENTS_RULES.md` e reaplique-a no código do diff."

```diff
  ## 3. Convenções de Estilo, Nomenclatura e Tipagem
+ - SEMPRE valide query params de rota com `safeParse` antes de usá-los.
```

---

### 3. ❌ Secret, API key, password ou private key hardcoded

**Regra:** zero credenciais em código, teste, fixture, seed ou comentário. `service_role` key nunca entra no repositório.
**Prompt de correção:** "Remova a credencial literal, leia-a do ambiente pela abstração correspondente e rotacione a chave exposta."

```diff
- const client = createSupabaseClient({
-   url: 'https://abcdefgh.supabase.co',
-   anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hardcoded',
- });

+ const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
+ const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
+ const client = url && anonKey ? createSupabaseClient({ url, anonKey }) : null;
```

---

### 4. ❌ Vazamento de PII em log sem mascaramento

**Regra:** e-mail, token OTP, telefone, documento e coordenada precisa não entram em `ErrorContext.args`.
**Prompt de correção:** "Remova o token do contexto de erro e mascare o e-mail antes de passá-lo a `handleServiceError`."

```diff
- return handleServiceError(error, {
-   method: 'auth.verifyEmailOtp',
-   args: { email, token },
- });

+ return handleServiceError(error, {
+   method: 'auth.verifyEmailOtp',
+   args: { email: maskEmail(email) },
+ });
```

---

### 5. ❌ Exceção bruta ou erro de banco exposto na UI

**Regra:** `PostgrestError.message`, stack trace e SQL nunca chegam à tela.
**Prompt de correção:** "Substitua a exibição do erro bruto por `getFriendlyErrorMessage(error)` de `@agenda/core`."

```diff
- <Text className="text-error">{error.message}</Text>

+ import { getFriendlyErrorMessage } from '@agenda/core';
+ <Text className="text-error">{getFriendlyErrorMessage(error)}</Text>
```

---

### 6. ❌ Falha de BOLA/IDOR: tabela sem RLS ou autorização só no cliente

**Regra:** toda tabela nova habilita RLS e declara policies; autorização real é `auth.uid()` / `public.is_admin()` no banco. Esconder botão não é controle de acesso.
**Prompt de correção:** "Adicione `ENABLE ROW LEVEL SECURITY` e as policies de escopo por usuário/admin na migration; mantenha o guard de UI apenas como conveniência."

```diff
  CREATE TABLE public.user_notes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL
  );
+ ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
+ CREATE POLICY select_own_notes ON public.user_notes
+   FOR SELECT USING (auth.uid() = user_id);
+ CREATE POLICY insert_own_notes ON public.user_notes
+   FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### 7. ❌ Sintaxe ou API obsoleta/depreciada frente à versão instalada

**Regra:** siga a doc da versão real (Seção 0.4). Zod 3, Query v5, Next 15, React 19, Tailwind 4.
**Prompt de correção:** "Atualize para a API da versão instalada: `params` é Promise no Next 15; `gcTime` substitui `cacheTime` no Query v5."

```diff
- export default function Page({ params }: { params: { id: string } }) {
-   const event = useEvent(params.id);

+ export default async function Page({ params }: { params: Promise<{ id: string }> }) {
+   const { id } = await params;
```

---

### 8. ❌ Validação sem Zod ou sem tratamento gracioso

**Regra:** dado de fronteira passa por schema de `packages/core/src/schemas/catalog.ts`. Input livre do usuário usa `safeParse`.
**Prompt de correção:** "Valide a entrada com o schema Zod correspondente usando `safeParse` e trate o caso de falha antes de prosseguir."

```diff
- const cityId = searchParams.get('city') as string;
- setActiveCity(cityId);

+ const parsed = z.string().min(1).safeParse(searchParams.get('city'));
+ if (parsed.success) {
+   setActiveCity(parsed.data);
+ }
```

---

### 9. ❌ Reportar débito antigo não relacionado ao diff

**Regra:** review cobre o diff e seus efeitos diretos. Problema pré-existente em código não tocado fica fora — mas quebra, warning ou falha de segurança **introduzida** pelo diff é obrigatória de reportar.
**Prompt de correção:** "Remova do review os apontamentos sobre código não modificado; mantenha apenas os que decorrem do diff."

```diff
- [review] `apps/web/lib/seo.ts:12` usa `any` (arquivo não tocado neste PR)
+ [review] `packages/core/src/services/catalog.ts:214` — o novo campo `attributes`
+          mudou o shape persistido e `CACHE_BUSTER` não foi bumpado
```

---

### 10. ❌ Alterou arquivo ou componente não solicitado sem pedir permissão

**Regra:** edição cirúrgica. Se precisa tocar outro arquivo para não quebrar, peça no chat mostrando o quê e por quê.
**Prompt de correção:** "Reverta as alterações fora do escopo pedido e solicite autorização no chat listando os arquivos adicionais e a justificativa."

```diff
  // pedido: corrigir o filtro de cidade
  apps/web/components/filters/city-filter.tsx    ✅ no escopo
- apps/web/components/shell/header.tsx           ❌ refatoração não pedida
- packages/core/src/utils/dates.ts               ❌ "melhoria" não pedida
```

---

### 11. ❌ Comentário explicativo/poluente no código

**Regra:** permitidos apenas `TODO:`, `FIXME:` e `ponytail:`. JSDoc de invariante não óbvio já existente é preservado.
**Prompt de correção:** "Remova os comentários explicativos redundantes; mova a explicação para o chat."

```diff
- // pega o cliente supabase
- const client = requireSupabase();
- // faz o upsert no banco
- const result = await coreQueries.upsertEvent(client, input);

+ const client = requireSupabase();
+ const result = await coreQueries.upsertEvent(client, input);
```

---

### 12. ❌ Instalou biblioteca sem confirmação prévia ou sem auditoria

**Regra:** nada entra em `package.json`, `pnpm.overrides` ou `patchedDependencies` sem autorização explícita e consulta à doc oficial. Gerenciador é pnpm.
**Prompt de correção:** "Remova a dependência adicionada, resolva com `@agenda/core` ou com uma lib já instalada, e peça autorização caso a nova dependência seja realmente necessária."

```diff
  "dependencies": {
-   "axios": "^1.7.0",
-   "date-fns": "^4.1.0",
    "@supabase/supabase-js": "^2.106.2"
  }
```
```diff
+ import { getConfiguredSupabase } from '@agenda/core';
+ import { formatEventDate } from '@agenda/core';
```

---

### 13. ❌ Tipo genérico/inseguro ou teste quebrado/desabilitado

**Regra:** sem `any`, `@ts-ignore`, `@ts-nocheck`, `unknown` sem guard, `!` sem justificativa. Proibido deletar ou `.skip` em teste existente.
**Prompt de correção:** "Substitua o tipo genérico pelo tipo estrito importado com `import type` e restaure o teste desabilitado, corrigindo o código que o quebrou."

```diff
- // @ts-ignore
- const handleSelect = (item: any) => setSelected(item.id);
- it.skip('mapeia atributos do estabelecimento', () => {

+ import type { Establishment } from '@agenda/core';
+ const handleSelect = (item: Establishment) => setSelected(item.id);
+ it('mapeia atributos do estabelecimento', () => {
```

---

### 14. ❌ Recriação de utilitário ou primitiva já existente

**Regra:** consulte o catálogo da Seção 5 antes de escrever helper ou componente. Regra dos 3 para promover ao core.
**Prompt de correção:** "Remova a duplicata e reutilize o utilitário/primitiva existente de `@agenda/core` ou do design system do app."

```diff
- function joinClasses(...parts: (string | false | undefined)[]) {
-   return parts.filter(Boolean).join(' ');
- }
- <TouchableOpacity onPress={onPress} className="bg-primary p-4 rounded-lg">
-   <Text>Salvar</Text>
- </TouchableOpacity>

+ import { cn } from '@agenda/core';
+ import { Button } from '@/components/ui/Button';
+ <Button label={t('common.save')} onPress={onPress} />
```

---

### 15. ❌ Uso de log nativo em vez da abstração de logger

**Regra:** `console.*` é proibido fora da implementação interna de `logErrorToTerminal`.
**Prompt de correção:** "Substitua a chamada `console.*` por `logErrorToTerminal` / `handleServiceError` com contexto estruturado e sem PII."

```diff
- console.error('Erro ao carregar catálogo:', error);

+ import { logErrorToTerminal } from '@agenda/core';
+ logErrorToTerminal(error, { method: 'catalog.listEvents' });
```

---

### 16. ❌ Alteração ou commit não autorizado de `.md` genérico

**Regra:** só `AGENTS_RULES.md` (sob gatilho `SEMPRE` ou pedido) e o CHANGELOG da versão seguinte são livres. `README.md`, `AGENTS.md` e `docs/**` exigem autorização.
**Prompt de correção:** "Reverta a alteração no arquivo `.md` e solicite autorização; se o commit altera código, crie/atualize apenas o CHANGELOG da próxima versão."

```diff
- README.md                                      ❌ sem autorização
- docs/arquitetura.md                            ❌ sem autorização
+ apps/mobile/CHANGELOG-alfa-v0.1.2.md           ✅ obrigatório neste commit
```

---

### 17. ❌ Query key literal em vez da factory `catalogKeys`

**Regra:** array literal solto quebra a invalidação hierárquica por prefixo usada pelo realtime.
**Prompt de correção:** "Substitua o array literal pela chamada correspondente em `catalogKeys` de `@agenda/core`."

```diff
- useQuery({ queryKey: ['events', eventId], queryFn: () => getEvent(eventId) });

+ import { catalogKeys } from '@agenda/core';
+ useQuery({
+   queryKey: catalogKeys.events.detail(eventId),
+   queryFn: () => catalog.getEvent(eventId),
+   enabled: !!eventId,
+ });
```

---

### 18. ❌ Chamada direta a Supabase/HTTP fora da camada de service

**Regra:** UI e hooks não chamam `fetch`, `axios` nem `supabase.from(...)`. A comunicação remota vive em `packages/core/src/services/` → `packages/core/src/queries/`.
**Prompt de correção:** "Mova a chamada para um método na camada de service do core e consuma-o via hook do TanStack Query."

```diff
- useEffect(() => {
-   supabase.from('events').select('*').then(({ data }) => setEvents(data));
- }, []);

+ const { data: events, isPending } = useEventsQuery();
```

---

### 19. ❌ Mudou shape persistido sem bumpar `CACHE_BUSTER`

**Regra:** a rehidratação do cache **não** passa pelo Zod. Campo novo em `establishmentSchema`/`eventSchema` chega ausente na UI a partir de cache antigo.
**Prompt de correção:** "Incremente `CACHE_BUSTER` em `packages/core/src/services/cachePolicy.ts` no mesmo commit que altera o shape persistido."

```diff
- export const CACHE_BUSTER = 'v2';
+ export const CACHE_BUSTER = 'v3';
```

---

### 20. ❌ `select('*')` ou coluna fora da constante `*_COLUMNS`

**Regra:** selects usam a constante explícita. `select('*')` vaza colunas não previstas (inclusive `location` geography, que quebra a serialização) e infla o payload.
**Prompt de correção:** "Troque o `select('*')` pela constante `*_COLUMNS` correspondente em `packages/core/src/queries/catalog.ts`."

```diff
- .select('*')
+ .select(ESTABLISHMENT_COLUMNS)
```

---

### 21. ❌ Função `SECURITY DEFINER` sem `SET search_path`

**Regra:** toda função `SECURITY DEFINER` fixa `SET search_path = public`. Omitir abre escalonamento de privilégio por sequestro de schema.
**Prompt de correção:** "Adicione `SET search_path = public` à função `SECURITY DEFINER` na migration."

```diff
  CREATE OR REPLACE FUNCTION public.promote_something()
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
+ SET search_path = public
  AS $$ ... $$;
```

---

### 22. ❌ `console`/logger em produção usado como observabilidade

**Regra:** `logErrorToTerminal` é **no-op em produção**. Não confie nele para diagnosticar incidentes — e não remova o guard `isProduction()` para "ver o log em prod", isso vaza contexto sensível.
**Prompt de correção:** "Restaure o guard `isProduction()` e trate o erro na UI com `getFriendlyErrorMessage`; observabilidade de produção exige decisão de arquitetura à parte."

```diff
  export function logErrorToTerminal(error: unknown, context: ErrorContext): void {
-   // if (isProduction()) return;
+   if (isProduction()) {
+     return;
+   }
```
