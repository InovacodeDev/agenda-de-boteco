# Análise 4.3 — Apps Next.js, rotas mobile (`app/**`) e E2E Playwright — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar os 5 apps Next.js do zero absoluto de testes, cobrir telas/guards de `app/**` nos dois apps Expo e blindar 4 jornadas críticas com Playwright, tudo congelado pelo spec-lock.

**Architecture:** Cada app Next ganha `jest.config.mjs` via `next/jest` (os apps são `"type": "module"`), `jsdom` e Testing Library; `@agenda/core` é mockado no nível do módulo nos testes de componente (o service já é testado no core — aqui se testa a UI e o guard). Os apps Expo só ampliam `testMatch`. E2E roda em `e2e/` na raiz contra Supabase local subido no CI, com um projeto Playwright por app/porta.

**Tech Stack:** Jest `~29.7.0`, `next/jest`, `@testing-library/react@16.3.3`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jest-expo@~57.0.5` + `@testing-library/react-native@^14`, `@playwright/test`.

**Spec:** `docs/analise-4-testes-regra-de-negocio.md` (Plano de Ação 4.3). Pré-requisitos: planos `2026-11-07-analise-4-1-…` e `2026-11-07-analise-4-2-…` concluídos (lock ativo; `FileTooLargeError` existe).

## Global Constraints

- **Correções da spec contra o código atual (o código manda):**
  - `lib/formErrors.ts` **não existe** em `web-client`/`admin`/`web-artists`: foi para `packages/core/src/utils/formErrors.ts` e já tem teste. Nos apps, testar só o uso (mensagem exibida no form).
  - Limite de recorrência é `MAX_RECURRENCE_COUNT = 52`, não 26.
  - Não há limite de 10 MB para PDF: uploads passam por `uploadImage` com `MAX_IMAGE_BYTES = 8 MB` (`FileTooLargeError`, Plano 4.2).
  - Rotas reais: `web` → `app/login`, `app/onboarding`, `app/delete-account`; `web-client` → `app/(painel)/layout.tsx`, `app/login`, `app/new-password`, `app/onboarding`; `admin` → `app/(admin)/layout.tsx`, `app/(admin)/{establishments,events,notices}`; `landing` → `app/page.tsx`, `app/support`; `mobile-client` → `app/(painel)/_layout.tsx`, `app/login.tsx`, `app/new-password.tsx`, `app/onboarding.tsx`; `mobile` → `app/login.tsx`, `app/delete-account.tsx`, `app/_layout.tsx`.
- Todo arquivo de teste novo: blocos `describe('Regra de negócio: …')` e `describe('Tratamento de erro: …')`; usar `getByRole`/`getByLabelText` (não `data-testid` novo em componente existente sem autorização — Regra 7).
- UI de erro deve exibir **exatamente** o texto de `getFriendlyErrorMessage(error)`; testes de falha de API afirmam que `error.message` cru (ex.: `'relation "public.events" …'`) **não** aparece na tela.
- Dependências novas exigem autorização no chat, uma vez para o conjunto: por app Next → `jest`, `jest-environment-jsdom`, `@types/jest`, `@testing-library/react@16.3.3`, `@testing-library/jest-dom`, `@testing-library/user-event`; raiz → `@playwright/test`. No ambiente do agente, Chromium já está instalado: **não** rodar `playwright install`; usar a versão de `@playwright/test` compatível com o Playwright pré-instalado ou `executablePath: '/opt/pw-browsers/chromium'`. No CI, `pnpm exec playwright install --with-deps chromium`.
- Rodar Playwright sempre com `--trace off` salvo pedido.
- `supabase start` local **só com pedido explícito do usuário**; E2E é verificado no CI. Chaves do Supabase local vêm de `supabase status -o env` no próprio job (são chaves de dev geradas pelo CLI) — nunca literal em arquivo.
- CHANGELOG: cada app tocado recebe bullet no `CHANGELOG-alfa-v<próxima>.md` conforme a decisão da pergunta em aberto do Plano 4.2. Próximas versões hoje: `web` 0.0.9 (arquivo v0.0.8 já existe — conferir se `package.json` ainda é 0.0.8 e usar o arquivo da versão seguinte à do `package.json`), `web-client` 0.0.7, `admin` 1.0.7, `web-artists` 0.0.5, `landing` 0.0.8, `mobile` 0.3.1, `mobile-client` 0.1.1.

## Review Focus

1. **Guard com sessão ainda carregando** (`status: 'loading'`) — não pode redirecionar para `/login` nem renderizar o painel; deve mostrar estado de carregamento. Teste em Tasks 3 e 4.
2. **Duplo clique em "Publicar"** — uma única chamada de `saveOwnedEvent`/`saveRecurringOwnedEvents`. Teste em Task 3.
3. **Campo de ocorrências com valor fora da faixa digitado à mão** (`0`, `999`, vazio) — o payload enviado fica em `[1, 52]`. Teste em Task 3 (web-client) e Task 2 (mobile-client).
4. **Dono com sessão válida mas sem bar vinculado** — vai para onboarding, não para o dashboard vazio. Teste em Task 3 e Task 2.
5. **Upload acima de 8 MB** — mensagem amigável e nada enviado. Teste em Task 3 e Task 6.

---

### Task 1: Ampliar Jest dos apps Expo

**Files:** Modify `apps/mobile/jest.config.js`, `apps/mobile-client/jest.config.js`

- [ ] **Step 1:** `testMatch: ['<rootDir>/{src,app}/**/*.test.{ts,tsx}']`. Em `transformIgnorePatterns`, acrescentar `phosphor-react-native`, `@shopify/flash-list` e `@fortawesome/.*` — cada um só no app cujo `package.json` o declara (`grep` antes).
- [ ] **Step 2:** `pnpm --filter @agenda/mobile test && pnpm --filter @agenda/mobile-client test` → 13 e 7 suítes verdes, sem mudança de contagem.
- [ ] **Step 3: Commit** — `Allow tsx and route tests in Expo apps`

---

### Task 2: Telas e guards do `mobile-client` e `mobile`

**Files (create):**
- `apps/mobile-client/app/(painel)/_layout.test.tsx`, `app/login.test.tsx`, `app/new-password.test.tsx`, `src/components/EventForm.test.tsx`, `src/components/EstablishmentFields.test.tsx`, `src/components/settings/NotificationsSection.test.tsx`
- `apps/mobile/app/login.test.tsx`, `app/delete-account.test.tsx`

Mocks: `expo-router` (`useRouter` com `replace` espionado, `Redirect` renderizando um marcador), `@agenda/core` parcial (`jest.requireActual` + sobrescrever services/hooks usados pela tela).

- [ ] **Step 1: Testes**
  - Guard `(painel)/_layout` — Regra: `signedIn` + bar vinculado renderiza o painel. Erro: `signedOut` → `/login`; `signedIn` sem bar → `/onboarding`; `loading` → nem redireciona nem renderiza painel.
  - `EventForm` — Regra: submissão válida chama `saveOwnedEvent` com `status: 'published'`, "salvar rascunho" com `status: 'draft'`; recorrência semanal chama `saveRecurringOwnedEvents` com `count` dentro de `[1, 52]` mesmo digitando `999`. Erro: nome vazio bloqueia submissão e mostra erro do campo; service rejeitando mostra `getFriendlyErrorMessage` e mantém os dados do form; duplo toque em publicar → 1 chamada.
  - `EstablishmentFields` — Regra: CEP válido preenche endereço (mock do fetch do ViaCEP). Erro: CEP inexistente (`{ erro: true }`) mostra mensagem e não apaga o que o usuário digitou; upload com `FileTooLargeError` mostra a mensagem do erro.
  - `NotificationsSection` — Regra: alternar preferência chama o service com o novo valor. Erro: falha reverte o switch e mostra mensagem amigável.
  - `login`/`new-password` (ambos apps) — Regra: credenciais válidas chamam o service e navegam. Erro: e-mail inválido bloqueia envio; `AuthError` mostra texto de `getFriendlyErrorMessage`; senhas divergentes em `new-password` bloqueiam.
  - `mobile/delete-account` — Regra: confirmação chama `requestAccountDeletion`. Erro: cancelar não chama; falha mostra mensagem amigável e não desloga.
- [ ] **Step 2:** `pnpm --filter @agenda/mobile-client test && pnpm --filter @agenda/mobile test` → verde.
- [ ] **Step 3:** CHANGELOGs. **Commit** — `Cover Expo panel guards, forms and auth screens`

---

### Task 3: Jest + suíte do `web-client` (piloto Next)

**Files:**
- Modify: `apps/web-client/package.json` (devDeps + `"test": "jest"`)
- Create: `apps/web-client/jest.config.mjs` — `nextJest({ dir: './' })`, `testEnvironment: 'jsdom'`, `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']`, `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }`, `testPathIgnorePatterns: ['/node_modules/', '/.next/']`.
- Create: `apps/web-client/jest.setup.ts` (jest-dom + polyfills Radix iguais aos do `shared-ui`)
- Create: `apps/web-client/app/(painel)/layout.test.tsx`, `app/login/page.test.tsx`, `components/EventForm.test.tsx`, `components/EstablishmentFields.test.tsx`, `components/settings/NotificationsSection.test.tsx`

Mocks: `next/navigation` (`useRouter().replace` espionado, `usePathname`), `@agenda/core` parcial.

- [ ] **Step 1:** Autorização de dependências (conjunto para os 5 apps de uma vez) e instalação neste app.
- [ ] **Step 2:** Mesmos cenários de Regra/Erro da Task 2 para guard, `EventForm` (inclui `max={MAX_RECURRENCE_COUNT}` no input e clamp do valor enviado), `EstablishmentFields`, `NotificationsSection` e login.
- [ ] **Step 3:** `pnpm --filter @agenda/web-client test` → verde; `pnpm --filter @agenda/web-client build` continua verde (arquivos `*.test.tsx` dentro de `app/` não podem virar rota — se o build reclamar, mover os testes de rota para `__tests__/` ao lado do segmento, ainda dentro do app).
- [ ] **Step 4:** CHANGELOG. **Commit** — `Add test suite to web-client`

---

### Task 4: `web` e `admin`

**Files:** mesma infraestrutura da Task 3 (`jest.config.mjs`, `jest.setup.ts`, script) em cada app, mais:
- `apps/web/hooks/useRequireAuth.test.ts`, `components/filters/DateRangeField.test.tsx`, `components/filters/FiltersSidebar.test.tsx`, `app/login/page.test.tsx`, `app/delete-account/page.test.tsx`
- `apps/admin/app/(admin)/layout.test.tsx`, `components/ui/PdfUpload.test.tsx`, `components/ui/ImageUpload.test.tsx`, `components/ui/Modal.test.tsx` e um teste de modal de criação/edição por domínio em `app/(admin)/{establishments,events,notices}/` (localizar o componente de modal de cada página)

- [ ] **Step 1: `web`** — Regra: `useRequireAuth` deixa passar `signedIn`; `DateRangeField` emite intervalo `'YYYY-MM-DD'` com início ≤ fim; filtros atualizam `useFiltersStore`. Erro: `signedOut` redireciona para login preservando destino; fim antes do início é rejeitado/corrigido conforme o componente; exclusão de conta com falha mostra mensagem amigável.
- [ ] **Step 2: `admin`** — Regra: `is_admin = true` renderiza o painel; modal válido chama o service de criação/edição. Erro: sessão sem `is_admin` → login/negado (o teste afirma o redirect; a segurança real é RLS, coberta no Plano 4.2); `PdfUpload`/`ImageUpload` com MIME fora da allowlist e com `FileTooLargeError` mostram mensagem e não chamam `onChange`; erro do service no modal não fecha o modal.
- [ ] **Step 3:** `pnpm --filter @agenda/web test && pnpm --filter @agenda/admin test` + `build` de ambos → verde.
- [ ] **Step 4:** CHANGELOGs. **Commit** — `Add test suites to web and admin`

---

### Task 5: `web-artists` e `landing`

**Files:** infraestrutura da Task 3 em cada app, mais `apps/web-artists/components/MusicianForm.test.tsx`, `apps/landing/app/page.test.tsx`, `apps/landing/app/support/page.test.tsx`, `apps/landing/components/DownloadButtons.test.tsx`

- [ ] **Step 1: `web-artists`** — Regra: envio válido chama o service de lead com payload validado pelo `musicianLeadSchema` e mostra sucesso. Erro: obrigatórios vazios e WhatsApp inválido mostram erro por campo e não chamam o service; falha do Supabase mostra mensagem amigável e mantém o form preenchido.
- [ ] **Step 2: `landing`** — Regra: links de App Store/Play Store/web têm `href` vindo da env configurada no teste (`process.env` definido no `beforeAll`, sem valor real) e `rel="noopener noreferrer"` quando `target="_blank"`; `metadata` exportado tem `title`/`description`. Erro: env ausente não renderiza link quebrado (`href` vazio ou `undefined`) — afirmar o comportamento atual; se renderizar link quebrado, reportar como achado.
- [ ] **Step 3:** `test` + `build` dos dois apps → verde.
- [ ] **Step 4:** CHANGELOGs. **Commit** — `Add test suites to web-artists and landing`

---

### Task 6: Playwright E2E

**Files:**
- Create: `e2e/playwright.config.ts` — projetos `web-client` (`:8090/client`), `web` (`:8088/app`), `web-artists` (`:8091/artists`), `admin` (`:8089/admin`), cada um com `webServer` (`pnpm --filter <app> dev`), `use.baseURL` e `trace: 'off'`.
- Create: `e2e/fixtures/seed-users.ts` — cria dono, admin e consumidor via Admin API do Supabase **local** usando `SUPABASE_SERVICE_ROLE_KEY` lido de env do job (nunca de app cliente, nunca literal).
- Create: `e2e/web-client/owner-event.spec.ts`, `e2e/web/discover-favorite.spec.ts`, `e2e/web-artists/lead.spec.ts`, `e2e/admin/moderation.spec.ts`
- Modify: `package.json` raiz (`@playwright/test` + `"test:e2e": "playwright test -c e2e/playwright.config.ts --trace off"`)
- Modify: `.github/workflows/ci.yml` — job `e2e` (após `db-tests`): `supabase start`, exporta `supabase status -o env` para `$GITHUB_ENV` (mascarando com `::add-mask::`), seed, `playwright install --with-deps chromium`, `pnpm test:e2e`.

- [ ] **Step 1:** Autorização de `@playwright/test`; instalar.
- [ ] **Step 2: Specs** (cada `.spec.ts` com os dois `describe`)
  - `owner-event` — Regra: dono faz login, cria evento publicado e o vê na lista. Erro: submissão com nome vazio permanece na página com erro de campo; usuário sem bar cai em onboarding.
  - `discover-favorite` — Regra: consumidor filtra por cidade, abre evento, favorita e o vê em favoritos. Erro: favoritar deslogado leva ao login.
  - `lead` — Regra: músico envia formulário e vê confirmação. Erro: WhatsApp inválido bloqueia envio.
  - `moderation` — Regra: admin cria/edita bar. Erro: consumidor comum acessando `/admin` não vê o painel.
- [ ] **Step 3:** No CI do PR, job `e2e` verde. Local só com autorização para `supabase start`.
- [ ] **Step 4:** Conferir que os 4 `.spec.ts` entraram em `.github/test-lock.json` (o `lock-new` do pre-commit cobre `**/*.spec.ts`). **Commit** — `Add Playwright E2E for critical journeys`

- [ ] **Step 5: Verificação final**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:verify-lock`
Expected: todos os 10 workspaces JS/TS com suíte própria verde (`core`, `mobile`, `mobile-client`, `shared-ui`, `shared-ui-mobile`, `web`, `web-client`, `web-artists`, `admin`, `landing`); relatar números reais.
