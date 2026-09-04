# Supply Chain: CVEs, Overrides, Knip e Avaliação do Next 16 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver os CVEs transitivos com fix disponível, revisar os overrides existentes, remover o que o knip apontou como órfão **e** foi confirmado por grep, e produzir um relatório de impacto do Next 16 sem aplicá-lo.

**Architecture:** Todos os CVEs são de dependências transitivas (toolchain de build), então a correção é via `pnpm.overrides` no `package.json` raiz — nenhum `package.json` de app muda. A limpeza do knip deleta apenas arquivos com zero importadores confirmados. O upgrade do Next é só investigação documentada.

**Tech Stack:** pnpm 10.20.0 (workspaces + overrides + patchedDependencies), Turborepo 2.

---

## Contexto que o implementador precisa saber

**Nada aqui é uma dependência direta.** Os 25 high + 14 moderate vêm todos de pacotes transitivos puxados por Next, Turbo, Jest e Expo. Por isso a correção certa é `pnpm.overrides`, não `pnpm update` nos apps.

**O estado atual dos overrides** (`package.json` raiz):

```json
"pnpm": {
  "overrides": {
    "lightningcss": "1.30.1",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "patchedDependencies": {
    "react-native-css@0.0.0-nightly.5ce6396": "patches/react-native-css@0.0.0-nightly.5ce6396.patch"
  }
}
```

**O patch de `react-native-css` NÃO pode ser removido.** Ele adapta `withReactNativeCSS`/`watcher.emit` à API do Metro ≥0.83, e `metro@0.84.4` está instalado. Removê-lo quebra o build do mobile. O AGENTS_RULES.md item 15 também proíbe explicitamente.

**Cuidado com falso positivo do knip.** O knip rodou sem config própria (`knip.json` não existe no repo). Ele marcou como órfãs 6 dependências (`zod`, `zustand`, `clsx`, `tailwind-merge`, `@supabase/supabase-js`, `@tanstack/query-async-storage-persister`) que estão declaradas nos apps mas são consumidas via `@agenda/core` — mexer nelas é risco sem ganho. **Este plano não as toca.** Também não toca `expo-updates`/`expo-system-ui`/`next/font/local` (apontados como "usados mas não declarados" sem evidência de uso real em grep).

**O que foi confirmado por grep e pode ser deletado:** as fachadas de re-export do mobile que ninguém importa (nem por caminho relativo, nem por alias `@/`), e `mapStyle.ts`, que só aparece citado em prosa no README.

**Atenção ao `eslint-config-expo`.** Ele **está** em `devDependencies` da raiz (`^56.0.4`), mas o bloco que o usaria está comentado em `eslint.config.mjs` (linhas 88-91). É órfão real — mas confirme que o bloco continua comentado antes de remover.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `package.json` (raiz, modificar) | Overrides de CVE; remoção do `eslint-config-expo` |
| `pnpm-lock.yaml` (regenerado) | Resultado do `pnpm install` |
| `apps/mobile/src/**` (deletar 9 arquivos) | Fachadas órfãs confirmadas |
| `docs/superpowers/next-16-impact-report.md` (criar) | Relatório de impacto, sem aplicar |
| `AGENTS_RULES.md` (modificar) | Registrar `image-size` como risco aceito |

---

### Task 1: Aplicar os overrides de CVE

**Files:**
- Modify: `package.json` (raiz)

- [ ] **Step 1: Registrar o estado atual da auditoria**

Run: `pnpm audit --json > /tmp/audit-before.json; node -e "const a=require('/tmp/audit-before.json');console.log(JSON.stringify(a.metadata?.vulnerabilities ?? a.metadata, null, 2))"`
Expected: imprime a contagem por severidade. Guarde esse número — a Task 2 compara com ele.

- [ ] **Step 2: Adicionar os overrides**

No `package.json` da raiz, substitua o bloco `pnpm.overrides` por:

```json
  "pnpm": {
    "overrides": {
      "lightningcss": "1.30.1",
      "react": "19.2.3",
      "react-dom": "19.2.3",
      "postcss": ">=8.5.18",
      "js-yaml": ">=4.3.1",
      "brace-expansion": ">=2.0.2",
      "browserslist": ">=4.28.7",
      "sharp": ">=0.35.0",
      "form-data": ">=4.0.6",
      "shell-quote": ">=1.9.0",
      "nanoid": ">=3.3.18",
      "uuid": ">=11.1.1",
      "decode-uri-component": ">=0.5.0",
      "@xmldom/xmldom": ">=0.9.12"
    },
    "patchedDependencies": {
      "react-native-css@0.0.0-nightly.5ce6396": "patches/react-native-css@0.0.0-nightly.5ce6396.patch"
    }
  }
```

- [ ] **Step 3: Instalar**

Run: `pnpm install`
Expected: instala sem erro. Se algum override for incompatível com um peer dependency, o pnpm avisa — nesse caso, remova apenas o override problemático da lista, anote qual foi e siga; não force resolução quebrada.

- [ ] **Step 4: Verificar a suíte completa**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: os quatro passam. `sharp` e `postcss` participam do build do Next — o `pnpm build` aqui não é opcional, é a verificação que pega regressão de override.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Override transitive dependencies with known CVEs"
```

---

### Task 2: Confirmar a redução e documentar o risco residual

**Files:**
- Modify: `AGENTS_RULES.md`

- [ ] **Step 1: Rodar a auditoria de novo**

Run: `pnpm audit --json > /tmp/audit-after.json; node -e "const a=require('/tmp/audit-after.json');console.log(JSON.stringify(a.metadata?.vulnerabilities ?? a.metadata, null, 2))"`
Expected: contagem menor que a do Step 1 da Task 1. Anote o número exato de antes e depois — ele entra no CHANGELOG e no AUDIT_LOG (plano de governança).

- [ ] **Step 2: Registrar `image-size` como risco aceito**

`image-size` tem DoS conhecido (ICNS/JXL/HEIF) e **nenhuma versão corrigida publicada** — não há override possível. Em `AGENTS_RULES.md`, na tabela da Seção 8 (Débitos Conhecidos), acrescente a linha:

```markdown
| `image-size` com CVE de DoS sem correção publicada (dependência transitiva do toolchain) | `pnpm-lock.yaml` | 15 — revisar a cada auditoria; sem fix upstream até 2026-09-03 |
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS_RULES.md
git commit -m "Record image-size CVE as accepted risk pending upstream fix"
```

---

### Task 3: Revisar os overrides herdados

**Files:**
- Modify: `package.json` (raiz)

- [ ] **Step 1: Verificar se o override de react ainda é necessário**

Run: `pnpm why react | head -40`
Expected: mostra quem depende de react e em que faixa. Se **todos** os consumidores aceitarem `19.2.3` sem o override forçar nada (ou seja, nenhum pede faixa conflitante), o override é redundante.

- [ ] **Step 2: Decidir sobre react/react-dom**

Se o Step 1 mostrou conflito real de faixas entre pacotes (por exemplo, algum pacote pedindo `^18`), **mantenha** o override e pule para o Step 3.

Se não houve conflito, remova `react` e `react-dom` do bloco `overrides`, rode `pnpm install`, e então:

Run: `pnpm typecheck && pnpm build`
Expected: passa. Se falhar ou se o lockfile passar a resolver react em versão diferente de `19.2.3`, **reverta a remoção** (`git checkout package.json && pnpm install`) — o override existia por um motivo que o `pnpm why` não capturou.

- [ ] **Step 3: Alinhar o override de lightningcss**

O lockfile hoje tem `lightningcss@1.30.1` (forçado) convivendo com `1.32.0` (puxado por nativewind/tailwind v4) — o override não está unificando nada, que era seu propósito. Atualize para a versão que já está em uso:

```json
      "lightningcss": "1.32.0",
```

Run: `pnpm install && pnpm build`
Expected: passa. `lightningcss` é binário nativo usado pelo Tailwind v4 — se o build quebrar, reverta para `1.30.1` e registre no relatório da Task 5 que o alinhamento não é viável agora.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "Review inherited pnpm overrides"
```

---

### Task 4: Limpeza dos órfãos confirmados

**Files:**
- Delete: 9 arquivos em `apps/mobile/src/`
- Modify: `package.json` (raiz)

- [ ] **Step 1: Reconfirmar que ninguém importa as fachadas**

O código pode ter mudado desde a auditoria. Rode a confirmação antes de apagar:

Run: `cd apps/mobile && grep -rn "services/catalog\|services/favorites\|services/proximity\|data/mock\|utils/images\|utils/pressGuard" --include=*.ts --include=*.tsx app src | grep -v "^src/services/catalog.ts\|^src/services/favorites.ts\|^src/services/proximity.ts\|^src/data/mock.ts\|^src/utils/images.ts\|^src/utils/pressGuard.ts"`
Expected: nenhuma saída. Se aparecer qualquer linha, **não delete o arquivo correspondente** — ele tem consumidor.

- [ ] **Step 2: Confirmar que `utils/auth.ts` é a fachada, não o service**

Existem dois arquivos parecidos. `apps/mobile/src/services/auth.ts` tem lógica própria (~4.4 KB) e **é usado**; `apps/mobile/src/utils/auth.ts` é a fachada de 30 bytes.

Run: `wc -c apps/mobile/src/utils/auth.ts apps/mobile/src/services/auth.ts && cat apps/mobile/src/utils/auth.ts`
Expected: `utils/auth.ts` tem ~30 bytes e o conteúdo é `export * from '@agenda/core';`. Se for diferente disso, pare e investigue antes de deletar.

- [ ] **Step 3: Deletar as fachadas órfãs**

```bash
git rm apps/mobile/src/data/index.ts apps/mobile/src/data/mock.ts \
       apps/mobile/src/services/catalog.ts apps/mobile/src/services/favorites.ts \
       apps/mobile/src/services/proximity.ts apps/mobile/src/utils/auth.ts \
       apps/mobile/src/utils/images.ts apps/mobile/src/utils/pressGuard.ts \
       apps/mobile/src/screens/map/mapStyle.ts
```

- [ ] **Step 4: Verificar typecheck e testes do mobile**

Run: `pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile test`
Expected: passa. Se algum import quebrar, restaure só o arquivo em questão (`git checkout HEAD -- <path>`) e registre no relatório que ele tinha consumidor não detectado.

- [ ] **Step 5: Remover a menção a `mapStyle.ts` do README do mobile**

`apps/mobile/README.md` cita o arquivo em prosa. Editar `.md` existente exige autorização (AGENTS_RULES.md item 17) — **esta é uma exceção justificada** porque o arquivo citado deixou de existir e a menção vira documentação errada. Remova apenas a linha que cita `mapStyle.ts`, nada mais.

- [ ] **Step 6: Remover `eslint-config-expo`**

Confirme primeiro que o bloco continua comentado:

Run: `grep -n "eslint-config-expo" eslint.config.mjs`
Expected: as ocorrências aparecem apenas em linhas de comentário (`//`). Se aparecer em código ativo, **não remova a dependência**.

Confirmado, remova a linha `"eslint-config-expo": "^56.0.4",` de `devDependencies` no `package.json` da raiz.

Run: `pnpm install && pnpm lint`
Expected: lint passa normalmente.

- [ ] **Step 7: Commit**

```bash
git add -A apps/mobile package.json pnpm-lock.yaml
git commit -m "Remove orphaned mobile facades and unused eslint config dependency"
```

---

### Task 5: Relatório de impacto do Next 16 (investigação, sem aplicar)

**Files:**
- Create: `docs/superpowers/next-16-impact-report.md`

- [ ] **Step 1: Confirmar a versão instalada**

Run: `node -e "console.log(require('./node_modules/next/package.json').version)"`
Expected: `15.5.19`. Declarado como `^15.1.0` em cinco apps (`web`, `admin`, `landing`, `web-artists`, `web-client`).

- [ ] **Step 2: Ler a documentação oficial do upgrade**

Consulte o guia de upgrade oficial do Next.js para a versão 16 (https://nextjs.org/docs/app/guides/upgrading) e as release notes da 16.3.4. **Não escreva o relatório de memória** — a Regra 9 do AGENTS_RULES.md exige consultar a doc da versão. Use WebFetch ou o MCP de docs disponível.

- [ ] **Step 3: Escrever o relatório**

Crie `docs/superpowers/next-16-impact-report.md` cobrindo, com base no que a doc oficial disser:

```markdown
# Relatório de impacto — upgrade Next 15.5.19 → 16.3.4

Data: <data da investigação>
Status: investigação, nenhuma mudança aplicada
Issue: #94

## Versão atual

- Instalada: 15.5.19 (resolvida de `^15.1.0`)
- Apps afetados: web, admin, landing, web-artists, web-client (5)

## Breaking changes relevantes a este repo

<Preencher a partir da doc oficial. Para cada breaking change, dizer se este
repo é afetado e por quê. Verificar no mínimo:>

- Versão mínima de Node exigida (o CI usa Node 22 — ver `.github/workflows/ci.yml`)
- Mudanças no App Router (`params`/`searchParams` já são assíncronos desde o 15)
- Turbopack como bundler padrão e compatibilidade com `@tailwindcss/postcss` v4
- `next/font` (usado via `packages/core/src/fonts/next-fonts.ts`)
- `transpilePackages` (usado por todos os 5 apps para `@agenda/core` e `@agenda/shared-ui`)
- `experimental.optimizePackageImports` (usado para `@phosphor-icons/react`)
- `basePath` + `redirects()` (usados em web, admin, web-client, web-artists)
- `next/image` e `next/link`

## CVEs resolvidos pelo upgrade

<Os 5 CVEs de `next` listados na auditoria #94 têm fix em >=15.5.21. Registrar
se o upgrade para 16.3.4 os cobre e se introduz outros.>

## Esforço estimado

<Arquivos a tocar, por app. No mínimo: 5 `next.config.ts`, 5 `package.json`.>

## Recomendação

<Uma linha: vale agora, vale depois de X, ou não vale. Com o porquê.>
```

- [ ] **Step 4: Avaliar os demais majors disponíveis**

Run: `pnpm outdated -r 2>&1 | head -60`
Expected: lista de pacotes com versão mais nova disponível. Acrescente ao relatório uma seção listando os que têm **major** novo.

**Não inclua como candidatos ao upgrade:** `zod` (pinado em 3.23.8 por decisão documentada — v4 tem API incompatível), `react`/`react-dom` (override deliberado), `react-native-css` (nightly com patch). Esses são pins intencionais, não desatualização.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/next-16-impact-report.md
git commit -m "Add Next 16 upgrade impact report"
```

---

### Task 6: CHANGELOGs e verificação final

**Files:**
- Create/Modify: CHANGELOG da próxima versão de `apps/mobile` e `packages/core`

- [ ] **Step 1: Descobrir as versões**

Run: `node -e "['apps/mobile','packages/core'].forEach(p=>console.log(p, require('./'+p+'/package.json').version))"`
Expected: imprime as versões. Use patch +1.

Só esses dois projetos tiveram código alterado (deleção de arquivos do mobile). Mudanças restritas ao `package.json` raiz, `pnpm-lock.yaml` e docs **não exigem CHANGELOG** (AGENTS_RULES.md Seção 6: mudanças em `.md`, `scripts/` ou configuração de CI estão fora).

Se a Task 4 não tiver deletado nada de `apps/mobile` (por algum arquivo ter consumidor), pule esta task inteira.

- [ ] **Step 2: Escrever o bullet**

Em `apps/mobile`:

```markdown
- Limpeza interna de código não utilizado, sem mudança visível no aplicativo
```

- [ ] **Step 3: Rodar a verificação completa**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: os quatro passam. Relate o resultado real, incluindo a contagem de vulnerabilidades antes/depois medida na Task 2.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/CHANGELOG-alfa-*.md
git commit -m "Add changelog entry for mobile dead code removal"
```

---

## O que este plano deliberadamente NÃO faz

- **Não aplica o upgrade do Next** — só investiga e documenta (Task 5).
- **Não remove as 6 dependências "órfãs"** apontadas pelo knip nos apps (`zod`, `zustand`, `clsx`, `tailwind-merge`, `@supabase/supabase-js`, `@tanstack/query-async-storage-persister`): são consumidas via `@agenda/core` e a remoção depende de decisão de arquitetura, não de higiene de dependência.
- **Não toca `expo-updates`, `expo-system-ui`, `next/font/local`** — knip os apontou como "usados mas não declarados" e o grep não sustentou uso real; provável falso positivo do plugin Expo.
- **Não remove o patch de `react-native-css`** — ainda necessário para o Metro 0.84.4.
- **Não adiciona `knip` como dependência do projeto** — foi rodado via `pnpm dlx`, sem instalar. Torná-lo parte do CI seria dependência nova (exige autorização).
