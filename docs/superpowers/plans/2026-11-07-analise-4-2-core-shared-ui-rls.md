# Análise 4.2 — Lacunas do `@agenda/core`, kits `shared-ui` e testes RLS (pgTAP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrir com o par "Regra de negócio + Tratamento de erro" todos os schemas, hooks e serviços com lacuna no core, os dois kits de UI compartilhada e as policies RLS/RPCs do Supabase, terminando com `coverageThreshold` bloqueante no core.

**Architecture:** Testes novos sempre em **arquivos novos** (o lock do Plano 4.1 congela os 80 existentes; arquivo novo é livre e entra no lock automaticamente no commit). Hooks do core rodam em `jsdom` por docblock, como `useDebouncedValue.test.ts` já faz. `shared-ui` ganha Jest com `ts-jest` + `jsdom`; `shared-ui-mobile` ganha `jest-expo` espelhando `apps/mobile`. RLS é testada com pgTAP em `supabase/tests/`, executada no CI por `supabase test db`.

**Tech Stack:** Jest `~29.7.0`, `ts-jest`, `@testing-library/react@16.3.3` (já no core), `@testing-library/react-native@^14`, `jest-expo@~57.0.5`, pgTAP via Supabase CLI.

**Spec:** `docs/analise-4-testes-regra-de-negocio.md` (Plano de Ação 4.2). Pré-requisito: `2026-11-07-analise-4-1-spec-lock-ci-gate.md` concluído.

## Global Constraints

- **Divergência deliberada da spec:** a spec manda acrescentar casos em `owned-events.test.ts`, `useAuthStore.test.ts`, `errors.test.ts` e `storage.test.ts`. Com o lock ativo isso exige aprovação humana por arquivo. Este plano cria arquivos irmãos `<nome>.contract.test.ts` — mesma cobertura, sem tocar teste congelado. Se o usuário preferir editar os originais, ele roda `pnpm test:approve-spec-change` por arquivo.
- Todo arquivo de teste novo tem exatamente os blocos `describe('Regra de negócio: <domínio/ação>', …)` e `describe('Tratamento de erro: <domínio/ação>', …)` (o `verify` do lock reprova sem eles). Padrão AAA.
- Mock do Supabase sempre no módulo do client (`jest.mock('../supabase/client', …)`, padrão de AGENTS.md §6). Nenhuma credencial real, nenhuma URL real de projeto.
- Para testar log, espione `handleServiceError`, não `logErrorToTerminal` (AGENTS.md §5).
- Valores fixos: `MAX_IMAGE_BYTES = 8 * 1024 * 1024`; `MAX_RECURRENCE_COUNT = 52` (a spec cita "26" em outro trecho — o código manda); `coverageThreshold` global `{ branches: 85, functions: 90, lines: 90 }`.
- Dependências novas (cada uma exige autorização no chat antes de instalar, Regra 10): `shared-ui` → `jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom`, `@testing-library/react@16.3.3`, `@testing-library/jest-dom`, `@testing-library/user-event`; `shared-ui-mobile` → `jest`, `jest-expo@~57.0.5`, `@testing-library/react-native@^14.0.0`, `@types/jest`. Usar as mesmas versões já presentes no lockfile quando existirem.
- **`supabase start`/`supabase db start` só com pedido explícito do usuário** (AGENTS.md §6). Os SQL de pgTAP são verificados no CI; localmente só se o usuário autorizar.
- CHANGELOG (§8.1): mudança de comportamento em `packages/core/src/services/storage.ts` → bullet em `packages/core/CHANGELOG-alfa-v1.0.4.md` (já existe; acrescentar). Commits só de teste/config de teste: ver pergunta em aberto no fim deste arquivo.
- `index.ts` de cada pacote **não** exporta helpers de teste.

## Review Focus

1. **Arquivo exatamente com 8 MB** (`size === MAX_IMAGE_BYTES`) — deve subir; só `> MAX` é recusado. Teste em Task 2.
2. **Blob sem `size` confiável no RN** (`fetch(uri).blob()` com `size` 0) — não pode ser recusado como grande nem estourar. Teste em Task 2 (`size: 0` → segue para checagem de MIME).
3. **Payload de escrita com campo extra (`is_admin`, `owner_id`)** — o schema deve descartá-lo (strip), nunca repassar. Teste em Task 4.
4. **Dono A tentando `UPDATE` no bar do dono B** — RLS de `UPDATE` com `USING` não lança, devolve 0 linhas; o teste tem de checar contagem de linhas, não só ausência de erro. Teste em Task 9.
5. **Usuário promovendo a si mesmo (`UPDATE profiles SET is_admin = true WHERE id = auth.uid()`)** — deve falhar. Se passar, é vulnerabilidade: parar e reportar ao usuário (não "ajustar" o teste). Teste em Task 9.

---

### Task 1: Core aceita `.test.tsx` e mede cobertura

**Files:**
- Modify: `packages/core/jest.config.js`
- Modify: `packages/core/package.json` (script `test`)

- [ ] **Step 1:** `testMatch: ['**/*.test.ts', '**/*.test.tsx']`; `collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/index.ts', '!src/**/index.ts', '!src/types/**', '!src/theme/**', '!src/fonts/**', '!src/data/mock.ts', '!src/test-utils/**']`. **Sem** `coverageThreshold` ainda (entra na Task 10).
- [ ] **Step 2:** script `"test": "jest --coverage"` (remove `--passWithNoTests`: o core tem testes, ausência agora é erro).
- [ ] **Step 3: Verificar** — `pnpm --filter @agenda/core test` → 60 suítes verdes; anotar no relatório a cobertura global atual (baseline para a Task 10).
- [ ] **Step 4: Commit** — `Collect coverage and tsx tests in core`

---

### Task 2: Teto `MAX_IMAGE_BYTES` em `uploadImage`

**Files:**
- Modify: `packages/core/src/services/storage.ts`
- Create: `packages/core/src/services/storage.contract.test.ts`
- Modify: `packages/core/CHANGELOG-alfa-v1.0.4.md` (acrescentar)

**Interfaces (Produces):** `export class FileTooLargeError extends Error` com `name = 'FileTooLargeError'` e mensagem `'Arquivo muito grande. O limite é 8 MB.'`; exportado também por `src/index.ts` ao lado de `UnsupportedFileTypeError`.

- [ ] **Step 1: Testes**
  - `Regra de negócio: uploadImage` — Blob `image/png` com `size === MAX_IMAGE_BYTES` chama `bucket.upload` uma vez e devolve a URL pública; Blob com `size: 0` e `type: 'image/png'` também sobe.
  - `Tratamento de erro: uploadImage` — `size === MAX_IMAGE_BYTES + 1` rejeita com `FileTooLargeError` e `upload` **não** é chamado; Blob grande **e** MIME inválido → `FileTooLargeError` (tamanho checado primeiro, sem tocar rede); client `null` → rejeita `/Supabase não configurado/`.
  - Gerar Blob grande sem alocar 8 MB: objeto `{ size, type } as Blob` via helper tipado no próprio teste (`function fakeBlob(size: number, type: string): Blob`) — sem `any`.
- [ ] **Step 2:** `pnpm --filter @agenda/core test -- storage.contract` → FAIL (`FileTooLargeError` não existe).
- [ ] **Step 3:** Em `uploadImage`, antes de `extFor`: `if (file.size > MAX_IMAGE_BYTES) throw new FileTooLargeError();`.
- [ ] **Step 4:** Mesmo comando → PASS; `pnpm --filter @agenda/core test` → todo o core verde.
- [ ] **Step 5: Impacto nos callers** — `grep -rn "UnsupportedFileTypeError" apps packages --include=*.tsx --include=*.ts`. Onde a UI trata `UnsupportedFileTypeError` para mostrar a mensagem, `FileTooLargeError` deve ter o mesmo tratamento. Se isso exigir tocar arquivo de app, **pedir autorização** listando os arquivos (Regra 7) antes de editar.
- [ ] **Step 6:** CHANGELOG core: `- Upload de imagem recusa arquivos acima de 8 MB com mensagem clara`.
- [ ] **Step 7: Commit** — `Reject images above MAX_IMAGE_BYTES before upload`

---

### Task 3: Contratos de `owned-events`, `useAuthStore` e `errors`

**Files:**
- Create: `packages/core/src/services/owned-events.contract.test.ts`
- Create: `packages/core/src/stores/useAuthStore.contract.test.ts`
- Create: `packages/core/src/utils/errors.contract.test.ts`

- [ ] **Step 1: `owned-events.contract.test.ts`** (copiar o `makeClient` do teste original para o arquivo novo — não importar de arquivo de teste)
  - Regra: `saveRecurringOwnedEvents` com `count: 0` e `count: -3` grava **1** ocorrência; `count: 100` grava **52**; `saveOwnedEvent` com nome `'!!!'` gera `id` e `slug` iguais e iniciando por `'evento-'`.
  - Erro: `saveOwnedEvent({ eventId })` com `updateError` rejeita com o mesmo erro e `insert` não é chamado; `handleServiceError` recebe `method: 'ownedEvents.saveOwnedEvent'` (conferir o nome exato no source).
- [ ] **Step 2: `useAuthStore.contract.test.ts`** (mock de `../services/auth`)
  - Regra: `requestAccountDeletion()` chama o service uma vez e deixa `{ user: null, status: 'signedOut' }`.
  - Erro: service de `requestAccountDeletion` rejeitando → a action rejeita com o mesmo erro **e** o estado continua `signedIn` com o usuário (não desloga quem não teve a conta excluída); `getCurrentUser` rejeitando em `initialize` → registrar o comportamento atual. Se o estado ficar preso em `'loading'`, **não** corrigir neste plano: reportar ao usuário como achado.
- [ ] **Step 3: `errors.contract.test.ts`** — tabela de entradas (`it.each`): `PostgrestError` com `message: 'relation "public.profiles" does not exist'`, `details: 'Key (email)=(fulano@example.com) already exists.'`, `hint: 'select * from profiles'`, `code: '42P01'`; `AuthError` com e-mail na mensagem; `Error` com stack SQL.
  - Regra: retorno é uma das strings fixas de `getFriendlyErrorMessage`.
  - Erro (anti-vazamento): retorno não contém `profiles`, `@`, `select`, `42P01`, `fulano`.
- [ ] **Step 4:** `pnpm --filter @agenda/core test` → verde (achados reportados, não mascarados).
- [ ] **Step 5: Commit** — `Cover owned events, auth store and error sanitization contracts`

---

### Task 4: Schemas Zod

**Files:**
- Create: `packages/core/src/schemas/catalog.test.ts`, `musician-lead.test.ts`, `ratings.test.ts` (`index.ts` é re-export, sem teste)

- [ ] **Step 1:** Para cada schema de escrita/leitura exportado, um fixture válido mínimo no topo do arquivo de teste.
  - Regra: fixture válido passa em `safeParse`; campos com `.default()` são preenchidos; enums aceitam todos os valores declarados (ex.: `eventStatusSchema` aceita `'draft'` e `'published'`).
  - Erro: campo obrigatório ausente → `success: false` com `path` do campo; campos `*_url` com `'javascript:alert(1)'` e `'not a url'` → rejeitados; **mass assignment**: `parse({ ...valido, is_admin: true, owner_id: 'x' })` não contém essas chaves; em `musician-lead`, WhatsApp/telefone fora do formato e lista de estilos vazia (`z.array(z.string().min(1))`) → rejeitados conforme o schema real.
- [ ] **Step 2:** `pnpm --filter @agenda/core test -- schemas` → PASS. Se algum caso de erro **passar** no schema (ex.: URL perigosa aceita), não afrouxar o teste: reportar ao usuário como achado.
- [ ] **Step 3: Commit** — `Cover catalog, musician lead and ratings schemas`

---

### Task 5: Hooks sem teste (10) + infraestrutura `lib`/`supabase`

**Files:**
- Create: `packages/core/src/test-utils/createQueryWrapper.ts` — `createQueryWrapper(): { wrapper: ({ children }) => ReactElement; queryClient: QueryClient }`, `QueryClient` com `retry: false` e `gcTime: 0`, JSX via `React.createElement` (o `tsconfig` do core não tem `jsx`).
- Create (todos com docblock `@jest-environment jsdom` quando renderizam hook): `src/hooks/queries.test.ts`, `useActiveCity.test.ts`, `useConnectivity.test.ts`, `useEstablishmentRating.test.ts`, `useGuardedPress.test.ts`, `useMusicianLeads.test.ts`, `useNearbyEstablishments.test.ts`, `useOwnedEstablishment.test.ts`, `useOwnedEvents.test.ts`, `useStatusLight.test.ts`, `src/lib/queryClient.test.ts`, `src/supabase/client.test.ts`

- [ ] **Step 1: Hooks de query** (`queries`, `useEstablishmentRating`, `useMusicianLeads`, `useNearbyEstablishments`, `useOwnedEstablishment`, `useOwnedEvents`) — mock do módulo de service consumido.
  - Regra: a key no cache (`queryClient.getQueryCache().getAll()[0].queryKey`) é igual à da factory `catalogKeys`/key local do hook; dado do service chega em `result.current.data`; mutações invalidam o prefixo raiz (spy em `queryClient.invalidateQueries` com `{ queryKey: catalogKeys.events.root }` onde aplicável); coordenada passa por `coarseLatLng` em `useNearbyEstablishments`.
  - Erro: id vazio → `fetchStatus: 'idle'` e service não chamado; service rejeitando → `isError: true` e `error` é a mesma instância.
- [ ] **Step 2: Hooks sem query** (`useActiveCity`, `useConnectivity`, `useGuardedPress`, `useStatusLight`) — Regra: caminho feliz conforme o source; Erro: duplo disparo dentro da janela de guarda é ignorado (`useGuardedPress`), offline/listener ausente não lança (`useConnectivity`), entrada fora do domínio cai no estado neutro (`useStatusLight`).
- [ ] **Step 3: `queryClient`/`client`** — Regra: `configureSupabase(fn)` faz `getConfiguredSupabase()` devolver o client e `isSupabaseConfigured()` ser `true`; handler registrado por `configureQueryErrorHandler` recebe o erro de query. Erro: sem configurar, `getConfiguredSupabase()` → `null`; sem handler, cai no fallback documentado (spy em `console.error` só para silenciar/afirmar, não código novo com `console`).
- [ ] **Step 4:** `pnpm --filter @agenda/core test` → verde.
- [ ] **Step 5: Commit** — `Cover remaining core hooks, query client and supabase client`

---

### Task 6: Jest no `@agenda/shared-ui`

**Files:**
- Modify: `packages/shared-ui/package.json` (devDependencies + `"test": "jest"`)
- Create: `packages/shared-ui/jest.config.js` (`ts-jest` com `tsconfig` override `jsx: 'react-jsx'` se o tsconfig do pacote não tiver; `testEnvironment: 'jsdom'`; `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']`)
- Create: `packages/shared-ui/jest.setup.ts` — importa `@testing-library/jest-dom`; polyfills que o Radix exige no jsdom: `Element.prototype.hasPointerCapture`, `releasePointerCapture`, `scrollIntoView`, `ResizeObserver`.
- Create: `packages/shared-ui/src/{Button,Field,TextInput,TextArea,Select,DatePicker,TimePicker,Toast,PageHeader,Sidebar}.test.tsx`

- [ ] **Step 1:** Pedir autorização das dependências (lista em Global Constraints); instalar com `pnpm --filter @agenda/shared-ui add -D …`.
- [ ] **Step 2: Testes** (via `@testing-library/user-event`)
  - Regra: `Button` dispara `onClick`; `Select` abre e `onValueChange` recebe o valor escolhido; `DatePicker` emite `'YYYY-MM-DD'` e `TimePicker` emite `'HH:MM'` respeitando `stepMinutes` (default 30); `Field` associa `label` ao input (`getByLabelText`).
  - Erro: `disabled`/`loading` não disparam `onClick` nem `onValueChange`; `Field` com erro expõe a mensagem e `aria-invalid="true"` no controle (se o componente não fizer isso hoje, reportar como achado de acessibilidade, não mudar o componente sem autorização).
- [ ] **Step 3:** `pnpm --filter @agenda/shared-ui test` → verde; `pnpm test` (turbo) inclui o pacote.
- [ ] **Step 4:** CHANGELOG conforme decisão da pergunta em aberto. **Commit** — `Add test suite to shared-ui`

---

### Task 7: Jest no `@agenda/shared-ui-mobile`

**Files:**
- Modify: `packages/shared-ui-mobile/package.json`
- Create: `packages/shared-ui-mobile/jest.config.js` — cópia de `apps/mobile/jest.config.js` com `testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}']` e o mesmo `transformIgnorePatterns` (inclui `@fortawesome/.*`; acrescentar `phosphor-react-native` e `@shopify/flash-list` só se o pacote os importar — `grep` antes).
- Create: `src/{Button,ConfirmDialog,DatePickerField,TimePickerField,ImagePickerField,SelectField,Switch,TextInput,Toast,Field,SegmentedTabs,EmptyState}.test.tsx` e `src/cn.test.ts`

- [ ] **Step 1:** Autorização + `pnpm --filter @agenda/shared-ui-mobile add -D …`.
- [ ] **Step 2: Testes** (`@testing-library/react-native`)
  - Regra: `ConfirmDialog` chama `onConfirm` só no botão de confirmar; `Switch`/`SegmentedTabs` emitem o novo valor; `ImagePickerField` mostra preview após `onPick` resolvido (mock de `expo-image-picker`).
  - Erro: `ImagePickerField` com upload rejeitando exibe mensagem de `getFriendlyErrorMessage` (ou `FileTooLargeError.message`) e não chama `onChange`; botões `disabled`/`loading` não disparam; `ConfirmDialog` cancelado não chama `onConfirm`.
  - Componentes puramente visuais (`Badge`, `Card`, `Screen`, `ScreenHeader`, `Sparkline`, `Icon`) — fora deste task; a Task 10 decide via relatório de cobertura se precisam de teste.
- [ ] **Step 3:** `pnpm --filter @agenda/shared-ui-mobile test` → verde.
- [ ] **Step 4: Commit** — `Add test suite to shared-ui-mobile`

---

### Task 8: Infra pgTAP no CI

**Files:**
- Create: `supabase/tests/000_helpers.test.sql` — `CREATE EXTENSION IF NOT EXISTS pgtap;` e funções no schema `tests`: `tests.create_user(email text) returns uuid` (insere em `auth.users`), `tests.authenticate_as(uid uuid)` (`set local role authenticated; set local request.jwt.claims = json_build_object('sub', uid, 'role', 'authenticated')::text`), `tests.clear_authentication()` (`set local role anon; reset request.jwt.claims`). Sem dependência externa (dbdev/basejump).
- Modify: `.github/workflows/ci.yml` — job `db-tests` (paralelo a `verify`): `supabase/setup-cli@v1` com versão fixa, `supabase db start`, `supabase test db`.

- [ ] **Step 1:** Escrever helpers + um `select plan(1); select ok(true); select * from finish();` para validar o pipeline.
- [ ] **Step 2: Verificar** — no CI do PR, job `db-tests` verde. Localmente só com autorização explícita do usuário para `supabase db start`.
- [ ] **Step 3: Commit** — `Run pgTAP database tests in CI`

---

### Task 9: Suítes RLS/RPC

**Files:** `supabase/tests/rls_establishments.test.sql`, `rls_events.test.sql`, `rls_profiles_admin.test.sql`, `rls_favorites_ratings.test.sql`, `rpcs_security_definer.test.sql`. Cada arquivo: `BEGIN; select plan(N); … select * from finish(); ROLLBACK;`. Fixtures: admin, dono A (bar A), dono B (bar B), usuário comum, anônimo — criados com `tests.create_user` e vínculos via `establishment_owners` como `postgres`.

**Interfaces:** Consome `tests.create_user`, `tests.authenticate_as`, `tests.clear_authentication` (Task 8).

- [ ] **Step 1:** Ler as policies reais em `supabase/migrations/` (`is_admin()`, `owns_establishment()`, policies `owner_*`) antes de escrever cada arquivo; a matriz abaixo é o mínimo.

| Arquivo | Regra de negócio (passa) | Tratamento de erro / Anti-BOLA (bloqueia) |
|---|---|---|
| `rls_establishments` | anônimo lê catálogo; dono A atualiza bar A; admin atualiza qualquer bar | anônimo `INSERT` → `throws_ok(…, '42501')`; dono A `UPDATE` bar B → 0 linhas (`is((with u as (update … returning 1) select count(*) from u), 0::bigint)`) |
| `rls_events` | dono A cria/edita/apaga evento do bar A; anônimo lê só `published` (conferir policy) | dono A cria evento com `establishment_id` do bar B → `42501`; anônimo não vê `draft` |
| `rls_profiles_admin` | usuário lê o próprio perfil; admin lê todos | usuário lê perfil alheio → 0 linhas; usuário faz `UPDATE profiles SET is_admin = true` no próprio id → bloqueado (se passar: **parar e reportar vulnerabilidade**) |
| `rls_favorites_ratings` | usuário cria/remove favorito e avaliação próprios | usuário lê/apaga favorito alheio → 0 linhas; insere com `user_id` alheio → `42501` |
| `rpcs_security_definer` | `claim_establishment_owner()` promove `auth.uid()`; `create_owned_establishment` cria bar + vínculo atomicamente | chamadas como anônimo falham; nenhuma RPC aceita id de usuário por parâmetro (`has_function` + assinatura esperada) |

- [ ] **Step 2:** Push e conferir `db-tests` no CI. Falha de policy (teste correto, banco permissivo) → **não** alterar o teste nem criar migração sem pedir: reportar ao usuário com o caso exato.
- [ ] **Step 3: Commit** — `Add pgTAP RLS and RPC security suites`

---

### Task 10: `coverageThreshold` bloqueante no core

**Files:** Modify `packages/core/jest.config.js`

- [ ] **Step 1:** `pnpm --filter @agenda/core test` e ler o resumo de cobertura.
- [ ] **Step 2:** Se algum eixo estiver abaixo de `branches 85 / functions 90 / lines 90`, listar os arquivos responsáveis e criar `<arquivo>.contract.test.ts` para eles (mesmo padrão de dois `describe`) até atingir. Não excluir arquivo de `collectCoverageFrom` para "passar".
- [ ] **Step 3:** Adicionar `coverageThreshold: { global: { branches: 85, functions: 90, lines: 90 } }`.
- [ ] **Step 4:** `pnpm typecheck && pnpm lint && pnpm test && pnpm test:verify-lock` → verde; relatar números reais.
- [ ] **Step 5: Commit** — `Enforce coverage threshold in core`

---

## Pergunta em aberto (resolver antes de executar)

AGENTS.md §8.1 exige CHANGELOG em todo commit que altera código de um projeto, mas não diz se commit **só de testes/config de teste** conta. Proposta: um único bullet por projeto (`- Reforço da verificação automática de qualidade`) no primeiro commit de teste daquele projeto na branch, e nada nos seguintes. Confirmar com o usuário.
