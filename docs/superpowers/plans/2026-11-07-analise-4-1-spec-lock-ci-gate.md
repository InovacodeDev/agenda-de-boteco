# Análise 4.1 — Spec-Lock, CI Gate e Linter Anti-Skip — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo PR para `alfa`/`beta`/`release` passa a rodar `pnpm test`, e qualquer edição/remoção de teste já existente é bloqueada no pre-commit e no CI sem aprovação humana explícita.

**Architecture:** Um script Node puro (`scripts/spec-lock/`, só módulos nativos: `node:crypto`, `node:fs`, `node:child_process`) mantém `.github/test-lock.json` com o SHA-256 de cada arquivo de teste. O pre-commit (Husky, único diretório de hooks) roda `verify` + `lock-new`; o CI roda `verify` no job `verify` e um workflow próprio (`spec-lock-gate.yml`) compara o lock do PR com o da base e só libera mudança de entrada existente com a label `spec-change-approved`. `eslint-plugin-jest` bloqueia `.skip`/`.only`/teste comentado/teste sem asserção.

**Tech Stack:** Node 22 (`node --test` para testar o próprio script), GitHub Actions, Husky 9.1.7, ESLint 9 flat config, `eslint-plugin-jest` (dependência nova — exige autorização).

**Spec:** `docs/analise-4-testes-regra-de-negocio.md` (Seções 3.3 e 4 — Plano de Ação 4.1). Ordem de execução: **este plano primeiro**, depois `2026-11-07-analise-4-2-core-shared-ui-rls.md`, depois `2026-11-07-analise-4-3-apps-next-mobile-e2e.md`.

## Global Constraints

- Package manager `pnpm@10.20.0`; nunca npm/yarn. Node 22 (mesmo do `ci.yml`).
- **Nenhuma dependência nova sem autorização no chat** (AGENTS.md Regra 10). Este plano só precisa de uma: `eslint-plugin-jest` (Task 5). O script de lock usa apenas módulos nativos do Node.
- Arquivos de teste cobertos pelo lock (globs exatos): `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `supabase/tests/**/*.sql`, sempre via `git ls-files` (nunca `node_modules`).
- Label de liberação: `spec-change-approved` (exatamente esse nome).
- Lock em `.github/test-lock.json`; comandos de raiz: `pnpm test:verify-lock`, `pnpm test:lock-new`, `pnpm test:approve-spec-change <arquivo> --reason "<motivo>"`.
- Proibido editar, apagar, `skip`ar ou afrouxar qualquer um dos 80 testes atuais para fazer algo passar (AGENTS.md Regra 11). Se uma regra de lint acusar teste existente, ajusta-se a **configuração** da regra, nunca o teste.
- Commits em inglês, imperativo. Mudanças só em `scripts/`, `.github/`, `.husky/`, configs de raiz → **não exigem CHANGELOG** (AGENTS.md §8.1).
- Editar `AGENTS.md` (Task 6, passo opcional) exige autorização explícita no chat — é `.md` existente (Regra 9).
- Owner do repositório para CODEOWNERS: `@titorm` (autor de 44/52 commits). Confirmar com o usuário antes do commit da Task 4.

## Review Focus

1. **Arquivo de teste renomeado (`git mv`)** — para o lock é "apagado + novo"; deve falhar como remoção, não passar como arquivo novo livre. Teste em Task 3.
2. **CRLF/EOL ou só whitespace alterado** — qualquer byte muda o hash; deve bloquear (não normalizar). Teste em Task 3.
3. **`approve` rodado por agente (stdin sem TTY) ou com `CI=true`** — deve recusar com código ≠ 0 e não tocar o lock. Teste em Task 3.
4. **PR que remove a entrada do lock junto com o teste** (tentativa de "limpar o rastro") — o gate do PR compara contra o lock da **base**, então deve falhar sem label. Teste em Task 3 (`diffAgainstBase`).
5. **Teste novo vazio ou sem os dois blocos `describe('Regra de negócio: …')`/`describe('Tratamento de erro: …')`** — deve falhar no `verify` (arquivo novo) e no lint (`expect-expect`). Teste em Task 3.

---

### Task 1: Testes obrigatórios no CI e task `test` do Turbo

**Files:**
- Modify: `.github/workflows/ci.yml` (job `verify`, após o passo `Run Typecheck`)
- Modify: `turbo.json` (task `test`)

- [ ] **Step 1: Confirmar baseline local verde**

Run: `pnpm install --frozen-lockfile && pnpm test`
Expected: `@agenda/core`, `@agenda/mobile` e `@agenda/mobile-client` passam (60 + 13 + 7 suítes). Se algo falhar **antes** de qualquer mudança, pare e reporte ao usuário — não corrija teste.

- [ ] **Step 2: Ajustar `turbo.json`**

`"test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] }`.

- [ ] **Step 3: Adicionar passo ao `ci.yml`**

Novo passo `- name: Run Tests` / `run: pnpm run test` entre `Run Typecheck` e `Run Build`.

- [ ] **Step 4: Verificar**

Run: `pnpm test` (de novo, pelo Turbo) e `node -e "JSON.parse(require('fs').readFileSync('turbo.json','utf8'))"`.
Expected: mesmas suítes verdes; JSON válido.

- [ ] **Step 5: Commit** — `Run test suites in CI verify job`

---

### Task 2: Unificar hooks locais em `.husky/`

Hoje `scripts/setup-hooks.bash` faz `git config core.hooksPath .githooks`, o que desliga o Husky (`prepare: husky` aponta para `.husky/_`). Decisão: **Husky é o único diretório ativo**; a lógica de auditoria vira script chamado por ele.

**Files:**
- Create: `scripts/hooks/check-audit-log.bash` (conteúdo atual de `.githooks/pre-commit`, sem alteração de lógica)
- Modify: `.husky/pre-commit` (bloqueio de branch protegida existente + chamada `bash scripts/hooks/check-audit-log.bash`)
- Delete: `.githooks/pre-commit`, `scripts/setup-hooks.bash`

- [ ] **Step 1: Mapear referências**

Run: `grep -rn "setup-hooks\|\.githooks" --exclude-dir=node_modules .`
Expected: lista de referências. Referência em `.md` existente → **não editar**, apenas relatar ao usuário no fim. Referência em script/workflow → ajustar neste task.

- [ ] **Step 2: Mover lógica e reescrever `.husky/pre-commit`**

Ordem no hook: (1) bloqueio `alfa|beta|release`, (2) `bash scripts/hooks/check-audit-log.bash`. As Tasks 3 e 6 acrescentam passos depois.

- [ ] **Step 3: Verificar**

Run: `git config --unset core.hooksPath; pnpm install && git config core.hooksPath`
Expected: `.husky/_`.
Run (em clone temporário no scratchpad, nunca no checkout de trabalho): `git checkout alfa && git commit --allow-empty -m x`
Expected: `❌ Commit direto bloqueado na branch 'alfa'`.
Run: stage só `AUDIT_LOG.md` alterado → commit falha com `ERRO: AUDIT_LOG.md e .github/audit-log.json devem ser alterados no mesmo commit.`

- [ ] **Step 4: Commit** — `Unify git hooks under Husky`

---

### Task 3: Script de Spec-Lock (`scripts/spec-lock/`)

**Files:**
- Create: `scripts/spec-lock/lib.mjs` (funções puras)
- Create: `scripts/spec-lock/cli.mjs` (I/O, git, TTY)
- Create: `scripts/spec-lock/lib.test.mjs` (`node:test` + `node:assert/strict`)
- Modify: `package.json` (raiz) — scripts `test:verify-lock`, `test:lock-new`, `test:approve-spec-change`, `test:spec-lock-tooling`

**Interfaces (Produces):**
- Formato do lock:
  ```json
  { "version": 1, "files": { "packages/core/src/utils/slug.test.ts": { "sha256": "<hex>", "lockedAt": "2026-11-07", "reason": "initial" } } }
  ```
  Chaves de `files` ordenadas alfabeticamente; arquivo gravado com `JSON.stringify(lock, null, 2) + '\n'` (diff estável).
- `lib.mjs`:
  - `TEST_FILE_PATTERNS: readonly RegExp[]` — `/\.test\.tsx?$/`, `/\.spec\.ts$/`, `/^supabase\/tests\/.+\.sql$/`
  - `isTestFile(path: string): boolean`
  - `sha256(content: Buffer): string`
  - `verify(lock, current: Map<string, string /*sha*/>, readContent: (path) => string): { violations: Violation[] }` onde `Violation = { path, kind: 'modified' | 'removed' | 'missing-contract' }`. `missing-contract` só para arquivo `.ts/.tsx` **fora** do lock que não contém **ambos** `describe('Regra de negócio:` e `describe('Tratamento de erro:` (aceitar aspas simples, duplas ou crase).
  - `addNew(lock, current, today: string): { lock, added: string[] }` — só adiciona caminhos ausentes; nunca altera entrada existente.
  - `approve(lock, path, sha, reason, today): lock` — lança se `reason` vazio ou `path` não está em `current`.
  - `diffAgainstBase(baseLock, headLock): { changed: string[], removed: string[] }` — entradas da base cujo `sha256` mudou ou que sumiram no head.
- `cli.mjs` subcomandos: `verify`, `lock-new [--stage]`, `approve <path> --reason "<texto>"`, `gate --base <ref>` (lê o lock da base via `git show <ref>:.github/test-lock.json`; base sem lock → passa).
- Saída de erro: uma linha por violação `SPEC-LOCK <kind>: <path>` + instrução final apontando para `pnpm test:approve-spec-change`. Exit code 1.

- [ ] **Step 1: Escrever os testes em `lib.test.mjs`**

Casos (todos com `assert.deepEqual`/`assert.equal`):
- `Regra de negócio: verify` — lock com `a.test.ts` e `current` com mesmo hash → `violations: []`; arquivo novo `b.test.ts` contendo os dois `describe` → `[]`.
- `Tratamento de erro: verify` — hash diferente → `[{ path: 'a.test.ts', kind: 'modified' }]`; ausente em `current` → `kind: 'removed'`; conteúdo igual exceto `\n`→`\r\n` → `modified`; rename (`a.test.ts` some, `c.test.ts` aparece com conteúdo idêntico) → contém `{ path: 'a.test.ts', kind: 'removed' }`; arquivo novo sem `describe('Tratamento de erro:` → `missing-contract`; arquivo `.sql` novo nunca gera `missing-contract`.
- `addNew` — não sobrescreve `sha256` de entrada existente mesmo com hash diferente em `current`; `added` lista só os novos, ordenados.
- `approve` — `reason: ''` lança `/reason/`; atualiza só a entrada pedida e grava `reason`.
- `diffAgainstBase` — mudança de sha → `changed`; entrada apagada → `removed`; entrada só adicionada no head → ambos vazios.
- `isTestFile` — `true` para `x.test.tsx`, `e2e/login.spec.ts`, `supabase/tests/rls_events.test.sql`; `false` para `x.test.mjs`, `node_modules/a.test.ts` não é chamado (garantido pelo `git ls-files`), `supabase/migrations/a.sql`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test scripts/spec-lock/`
Expected: FAIL (`lib.mjs` não existe).

- [ ] **Step 3: Implementar `lib.mjs` e `cli.mjs`**

`cli.mjs`: lista arquivos com `git ls-files -z --cached --others --exclude-standard` filtrados por `isTestFile`; `approve` recusa com exit 2 e mensagem `approve exige terminal interativo de um humano` quando `process.env.CI` está definido **ou** `!process.stdin.isTTY`, e pede confirmação digitando o caminho do arquivo. `lock-new --stage` roda `git add .github/test-lock.json` quando `added.length > 0`.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test scripts/spec-lock/`
Expected: PASS, 0 falhas.

- [ ] **Step 5: Gerar o lock inicial**

Run: `node scripts/spec-lock/cli.mjs lock-new` e depois `pnpm test:verify-lock`.
Expected: `added` com **80** caminhos (60 core, 13 mobile, 7 mobile-client); `verify` sem violações. Se o número diferir de 80, relatar a contagem real no fim do task — não forçar.
Run: `echo 'x' | pnpm test:approve-spec-change packages/core/src/utils/slug.test.ts --reason teste`
Expected: exit ≠ 0, lock inalterado (`git diff --quiet .github/test-lock.json`).

- [ ] **Step 6: Commit** — `Add spec-lock manifest for existing test files`

---

### Task 4: Gate de PR (`spec-lock-gate.yml`) e CODEOWNERS

**Files:**
- Create: `.github/workflows/spec-lock-gate.yml`
- Create: `.github/CODEOWNERS`
- Modify: `.github/workflows/ci.yml` — passos `Verify spec-lock` (`pnpm test:verify-lock`) e `Spec-lock tooling tests` (`pnpm test:spec-lock-tooling`) no job `verify`, antes de `Run Lint`

**Interfaces:** Consome `cli.mjs gate --base <ref>` da Task 3.

- [ ] **Step 1: Workflow**

`on: pull_request` para `[alfa, beta, release]`, `types: [opened, synchronize, reopened, labeled, unlabeled]`; `permissions: contents: read, pull-requests: read`; checkout com `fetch-depth: 0`; `git fetch origin "$GITHUB_BASE_REF"`; roda `node scripts/spec-lock/cli.mjs gate --base "origin/$GITHUB_BASE_REF"`; se falhar **e** `contains(github.event.pull_request.labels.*.name, 'spec-change-approved')` for falso → `exit 1` com `::error::`. Com a label → `::warning::` listando os arquivos e exit 0. Não precisa de `pnpm install` (script sem dependências).

- [ ] **Step 2: CODEOWNERS**

Linhas para `@titorm`: `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `/supabase/tests/`, `/.github/test-lock.json`, `/scripts/spec-lock/`, `/.github/workflows/spec-lock-gate.yml`, `/.github/CODEOWNERS`, `/.husky/`.

- [ ] **Step 3: Verificar localmente**

Run: `node scripts/spec-lock/cli.mjs gate --base origin/alfa` (alfa ainda sem lock)
Expected: exit 0 com mensagem de base sem lock.
Validação do YAML: não há linter de Actions instalado (e instalar exige autorização) — conferir no PR que o check `Spec-Lock Gate` aparece e roda verde.

- [ ] **Step 4: Commit** — `Add spec-lock PR gate and CODEOWNERS`

- [ ] **Step 5: Ação manual do dono (relatar ao usuário, não executar)**

Em Settings → Branches de `alfa`/`beta`/`release`: marcar "Require review from Code Owners" e tornar `Spec-Lock Gate` check obrigatório; criar a label `spec-change-approved` e restringir quem aplica (só maintainers). Sem isso o gate é contornável.

---

### Task 5: `eslint-plugin-jest` como linter anti-sabotagem

**Files:**
- Modify: `package.json` (raiz, devDependencies)
- Modify: `eslint.config.mjs` (novo bloco antes de `prettier`)

- [ ] **Step 1: Pedir autorização no chat**

Propor `eslint-plugin-jest` (nome exato; mantido pelo org `jest-community`) na maior versão com `peerDependencies` compatível com `eslint@^9.39` e `@typescript-eslint/utils@^8`; checar `pnpm audit` após instalar. Sem autorização → pular este task e relatar.

- [ ] **Step 2: Instalar**

Run: `pnpm add -D -w eslint-plugin-jest@<versão aprovada>`

- [ ] **Step 3: Bloco de config**

`files: ['**/*.test.{ts,tsx}', '**/*.spec.ts']`, plugin `jest`, regras como `'error'`: `jest/no-disabled-tests`, `jest/no-focused-tests`, `jest/no-commented-out-tests`, `jest/expect-expect`, `jest/valid-expect`. `languageOptions.globals` com os globals do Jest (`jest.configs['flat/recommended'].languageOptions`).

- [ ] **Step 4: Rodar lint**

Run: `pnpm lint`
Expected: zero erros. Se `expect-expect` acusar teste existente que valida via helper próprio, adicionar o nome do helper em `assertFunctionNames` (ex.: `['expect', 'expect*']`) — **nunca editar o teste**. Registrar no relatório quais helpers foram liberados.

- [ ] **Step 5: Provar que bloqueia**

Criar temporariamente `packages/core/src/__tmp__.test.ts` com `it.skip('x', () => { expect(1).toBe(1); })` e `it('y', () => {})`; `pnpm --filter @agenda/core lint` → 2 erros (`no-disabled-tests`, `expect-expect`); apagar o arquivo.

- [ ] **Step 6: Commit** — `Lint test files against skips, focus and empty tests`

---

### Task 6: Pipeline completo no pre-commit

**Files:**
- Modify: `.husky/pre-commit`
- Modify (opcional, **só com autorização**): `AGENTS.md` — uma regra em §0 item 11: agente nunca roda `test:approve-spec-change` nem aplica a label `spec-change-approved`.

- [ ] **Step 1: Acrescentar ao hook, nesta ordem, após a auditoria**

1. `node scripts/spec-lock/cli.mjs verify` (falha = commit bloqueado);
2. `node scripts/spec-lock/cli.mjs lock-new --stage` (congela testes novos no mesmo commit);
3. `pnpm turbo run test --filter='...[HEAD]'` (só pacotes afetados pelo que está mudado; mantém o hook rápido).

- [ ] **Step 2: Verificar**

Em clone temporário no scratchpad, numa branch de teste:
- editar 1 caractere em `packages/core/src/utils/slug.test.ts` e commitar → bloqueado com `SPEC-LOCK modified: packages/core/src/utils/slug.test.ts`;
- criar `packages/core/src/utils/dummy.test.ts` com os dois `describe` e uma asserção → commit passa e `.github/test-lock.json` entra no mesmo commit com a nova entrada;
- criar arquivo novo sem `describe('Tratamento de erro:` → bloqueado com `missing-contract`.

- [ ] **Step 3: Commit** — `Enforce spec-lock and affected tests in pre-commit`

- [ ] **Step 4: Verificação final do plano**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:verify-lock && pnpm test:spec-lock-tooling`
Expected: tudo verde; relatar a saída real.
