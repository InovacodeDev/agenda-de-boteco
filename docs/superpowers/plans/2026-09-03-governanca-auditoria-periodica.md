# Governança: Regras Explícitas e Auditoria Periódica Obrigatória — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalizar as regras que impedem a reincidência dos achados da auditoria #94 e criar o mecanismo que bloqueia merge quando a auditoria passa de 30 dias, com hook pré-commit garantindo a sincronia entre o log humano e o log de máquina.

**Architecture:** Dois arquivos de log (`AUDIT_LOG.md` para humano, `.github/audit-log.json` para máquina) mantidos em sincronia por um hook `pre-commit` em `.githooks/` (ativado via `core.hooksPath`, sem dependência nova). Um workflow novo `audit-gate.yml` falha o check em PRs para `alfa`/`beta`/`release` quando a última auditoria tem mais de 30 dias.

**Tech Stack:** Bash (hooks e workflow), Node 22 (parse do JSON), GitHub Actions, `actions/checkout@v4`.

---

## Contexto que o implementador precisa saber

**`AGENTS_RULES.md` já existe e é a fonte das regras que bloqueiam merge.** Ele tem 8 seções e um Checklist de 17 itens bloqueantes. O `AGENTS.md` descreve arquitetura; o `AGENTS_RULES.md` descreve o que bloqueia. Este plano **estende**, não recria. O próprio arquivo declara essa divisão na linha 5.

**Editar `AGENTS_RULES.md` é permitido aqui.** O item 17 do checklist proíbe editar `.md` sem autorização, com duas exceções — e este trabalho foi explicitamente pedido pelo usuário, o que constitui a autorização.

**O repo não tem hooks hoje.** Confirmado: `.githooks/` não existe, `core.hooksPath` não está configurado, e `.git/hooks/` só tem os `.sample` do git. O hook precisa ser criado do zero e a ativação precisa ser documentada — hooks não são versionados pelo git automaticamente, então cada dev precisa rodar o comando de ativação uma vez.

**Já existem 3 workflows:** `ci.yml`, `deploy.yml`, `version-gate.yml`. O `version-gate.yml` é o modelo estilístico a seguir para o novo gate — usa `set -euo pipefail`, `::error::` para falhar com mensagem visível, e comentários explicando o porquê de cada decisão não óbvia.

**A tabela de versões do `AGENTS_RULES.md` está desatualizada.** A Seção 6 lista só `mobile`, `web`, `admin`, `landing`, `core` — faltam `web-client` e `web-artists`, que existem e têm CHANGELOG próprio. O usuário autorizou alinhar isso.

**Branch protection não é código.** O workflow falhando é o gate técnico; transformá-lo em bloqueio real de merge exige marcar o check como obrigatório nas configurações do repositório no GitHub. Isso não pode ser feito por commit — a Task 6 documenta o passo manual.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `AUDIT_LOG.md` (criar) | Histórico de auditorias, legível por humano |
| `.github/audit-log.json` (criar) | Mesma data, legível por máquina |
| `.githooks/pre-commit` (criar) | Bloqueia commit com logs dessincronizados |
| `scripts/setup-hooks.bash` (criar) | Ativa o `core.hooksPath` |
| `.github/workflows/audit-gate.yml` (criar) | Falha PR com auditoria vencida |
| `AGENTS_RULES.md` (modificar) | Seção 9, item 18, tabela de versões |
| `AGENTS.md` (modificar) | Ponteiro para a regra de paginação |
| `README-local-dev.md` (modificar) | Instrução de ativação do hook |

---

### Task 1: Criar os dois arquivos de log

**Files:**
- Create: `AUDIT_LOG.md`
- Create: `.github/audit-log.json`

- [ ] **Step 1: Criar o log humano**

Crie `AUDIT_LOG.md` na raiz:

```markdown
# Log de Auditorias

Registro das auditorias de segurança, performance, supply chain e LGPD deste
repositório. A auditoria vence em **30 dias**: passado esse prazo, o workflow
`audit-gate.yml` bloqueia merge em `alfa`, `beta` e `release` até que uma nova
seja concluída e registrada aqui.

Ao registrar uma auditoria nova, atualize **também** `.github/audit-log.json`
com a mesma data, no mesmo commit — o hook `pre-commit` recusa o commit se os
dois arquivos divergirem.

| Data | Issue | Escopo |
| --- | --- | --- |
| 2026-09-03 | #94 | Performance e N+1, dependências e CVEs, mapa de PII (LGPD), rate limiting |
```

- [ ] **Step 2: Criar o log de máquina**

Crie `.github/audit-log.json`:

```json
{
  "lastAuditDate": "2026-09-03",
  "issue": 94,
  "scope": ["performance", "dependencies", "lgpd", "rate-limiting"],
  "maxAgeDays": 30
}
```

- [ ] **Step 3: Verificar que o JSON é válido**

Run: `node -e "console.log(require('./.github/audit-log.json').lastAuditDate)"`
Expected: imprime `2026-09-03`.

- [ ] **Step 4: Commit**

```bash
git add AUDIT_LOG.md .github/audit-log.json
git commit -m "Add audit log files for periodic audit gate"
```

---

### Task 2: Criar o hook pré-commit

**Files:**
- Create: `.githooks/pre-commit`
- Create: `scripts/setup-hooks.bash`

- [ ] **Step 1: Criar o hook**

Crie `.githooks/pre-commit`:

```bash
#!/usr/bin/env bash
# Mantem AUDIT_LOG.md e .github/audit-log.json sincronizados. Os dois carregam a
# mesma informacao para publicos diferentes (humano e CI); se divergirem, o gate
# de auditoria passa a mentir — o CI leria uma data que ninguem revisou.
set -euo pipefail

MD_FILE="AUDIT_LOG.md"
JSON_FILE=".github/audit-log.json"

staged=$(git diff --cached --name-only)
md_staged=$(printf '%s\n' "$staged" | grep -cx "$MD_FILE" || true)
json_staged=$(printf '%s\n' "$staged" | grep -cx "$JSON_FILE" || true)

# Um sem o outro: quase sempre esquecimento de atualizar o par.
if [ "$md_staged" -ne "$json_staged" ]; then
  echo "ERRO: $MD_FILE e $JSON_FILE devem ser alterados no mesmo commit." >&2
  echo "  $MD_FILE no stage: $md_staged" >&2
  echo "  $JSON_FILE no stage: $json_staged" >&2
  exit 1
fi

# Sem nenhum dos dois no stage, nao ha o que validar neste commit.
if [ "$md_staged" -eq 0 ]; then
  exit 0
fi

# Le a primeira data da tabela do markdown (linha mais recente) e a do JSON.
md_date=$(grep -oE '^\| [0-9]{4}-[0-9]{2}-[0-9]{2}' "$MD_FILE" | head -1 | tr -d '| ')
json_date=$(node -e "process.stdout.write(require('./$JSON_FILE').lastAuditDate)")

if [ -z "$md_date" ]; then
  echo "ERRO: nao encontrei uma data no formato YYYY-MM-DD na tabela de $MD_FILE." >&2
  exit 1
fi

if [ "$md_date" != "$json_date" ]; then
  echo "ERRO: data de auditoria divergente entre os arquivos." >&2
  echo "  $MD_FILE:   $md_date" >&2
  echo "  $JSON_FILE: $json_date" >&2
  exit 1
fi

echo "Auditoria sincronizada em $md_date."
```

- [ ] **Step 2: Tornar o hook executável**

Run: `chmod +x .githooks/pre-commit`
Expected: sem saída.

- [ ] **Step 3: Criar o script de ativação**

Hooks não são ativados automaticamente ao clonar. Crie `scripts/setup-hooks.bash`:

```bash
#!/usr/bin/env bash
# Aponta o git deste clone para os hooks versionados em .githooks/.
# Rode uma vez apos clonar o repositorio.
set -euo pipefail

git config core.hooksPath .githooks
echo "core.hooksPath configurado para .githooks"
echo "Hooks ativos:"
ls -1 .githooks
```

Run: `chmod +x scripts/setup-hooks.bash`
Expected: sem saída.

- [ ] **Step 4: Ativar e testar o caminho feliz**

Run: `bash scripts/setup-hooks.bash && git config --get core.hooksPath`
Expected: imprime `.githooks`.

- [ ] **Step 5: Testar que o hook bloqueia divergência**

Simule a falha alterando só um arquivo:

Run: `node -e "const fs=require('fs');const p='.github/audit-log.json';const j=require('./'+p);j.lastAuditDate='2020-01-01';fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n')" && git add .github/audit-log.json && git commit -m "test hook" ; echo "exit=$?"`
Expected: o commit **falha** com a mensagem "data de auditoria divergente entre os arquivos" e `exit=1`. Isso confirma que o hook funciona.

- [ ] **Step 6: Reverter o teste**

Run: `git restore --staged .github/audit-log.json && git checkout -- .github/audit-log.json && node -e "console.log(require('./.github/audit-log.json').lastAuditDate)"`
Expected: imprime `2026-09-03` de volta.

- [ ] **Step 7: Commit**

```bash
git add .githooks/pre-commit scripts/setup-hooks.bash
git commit -m "Add pre-commit hook keeping audit logs in sync"
```

---

### Task 3: Criar o workflow de gate

**Files:**
- Create: `.github/workflows/audit-gate.yml`

- [ ] **Step 1: Criar o workflow**

Segue o estilo de `.github/workflows/version-gate.yml` (mesmo `set -euo pipefail`, mesmo uso de `::error::`).

Crie `.github/workflows/audit-gate.yml`:

```yaml
name: Audit Gate

# A auditoria de seguranca/performance/supply-chain/LGPD vence em 30 dias.
# Passado o prazo, nenhum merge entra nos canais ate que uma nova seja feita e
# registrada em AUDIT_LOG.md + .github/audit-log.json.
on:
  pull_request:
    branches: [ alfa, beta, release ]

permissions:
  contents: read

concurrency:
  group: audit-gate-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  check:
    name: Audit freshness
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Require a recent audit
        run: |
          set -euo pipefail

          json_file=".github/audit-log.json"
          md_file="AUDIT_LOG.md"

          if [ ! -f "$json_file" ] || [ ! -f "$md_file" ]; then
            echo "::error::Arquivos de auditoria ausentes ($md_file / $json_file)."
            exit 1
          fi

          last_date=$(node -e "process.stdout.write(require('./$json_file').lastAuditDate)")
          max_age=$(node -e "process.stdout.write(String(require('./$json_file').maxAgeDays ?? 30))")

          # A data do markdown e a fonte que humanos leem; divergencia entre as
          # duas significa que uma delas nao foi revisada. O hook pre-commit ja
          # barra isso localmente, mas commits podem chegar sem o hook ativo.
          md_date=$(grep -oE '^\| [0-9]{4}-[0-9]{2}-[0-9]{2}' "$md_file" | head -1 | tr -d '| ')
          if [ "$md_date" != "$last_date" ]; then
            echo "::error::Data divergente: $md_file diz $md_date e $json_file diz $last_date."
            exit 1
          fi

          last_epoch=$(date -u -d "$last_date" +%s)
          now_epoch=$(date -u +%s)
          age_days=$(( (now_epoch - last_epoch) / 86400 ))

          if [ "$age_days" -gt "$max_age" ]; then
            echo "::error::Ultima auditoria foi ha $age_days dias (limite: $max_age). Rode uma nova auditoria e atualize $md_file e $json_file antes de mergear."
            exit 1
          fi

          echo "Auditoria de $last_date tem $age_days dias — dentro do limite de $max_age."
```

- [ ] **Step 2: Validar a lógica localmente**

O runner é Ubuntu, então `date -u -d` funciona (no macOS a sintaxe seria `date -j -f`). Para testar a aritmética na sua máquina, use Node em vez de `date`:

Run: `node -e "const d=require('./.github/audit-log.json').lastAuditDate;const age=Math.floor((Date.now()-Date.parse(d))/86400000);console.log(d, age+' dias')"`
Expected: imprime a data e a idade em dias. Se for maior que 30, a auditoria já está vencida e o gate falharia — nesse caso, atualize a data ao registrar esta entrega.

- [ ] **Step 3: Validar a sintaxe YAML**

Run: `node -e "const fs=require('fs');const t=fs.readFileSync('.github/workflows/audit-gate.yml','utf8');if(!t.includes('runs-on'))throw new Error('yaml suspeito');console.log('ok, '+t.split('\n').length+' linhas')"`
Expected: imprime `ok, <n> linhas`. (Validação estrutural completa acontece no GitHub, no primeiro PR.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/audit-gate.yml
git commit -m "Add audit gate workflow blocking stale audits"
```

---

### Task 4: Estender o `AGENTS_RULES.md`

**Files:**
- Modify: `AGENTS_RULES.md`

- [ ] **Step 1: Atualizar a tabela de versões da Seção 6**

Localize o bloco que lista as versões atuais (dentro de "## 6. CHANGELOG Obrigatório em Cada Commit"). Ele hoje lista 5 projetos e está desatualizado. Primeiro descubra as versões reais:

Run: `node -e "['apps/mobile','apps/web','apps/admin','apps/landing','apps/web-client','apps/web-artists','packages/core'].forEach(p=>console.log(p.padEnd(22), require('./'+p+'/package.json').version))"`
Expected: imprime as 7 versões.

Substitua a tabela "Qual arquivo editar" para incluir as duas linhas faltantes:

```markdown
| `apps/web-client/` | `apps/web-client/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/web-artists/` | `apps/web-artists/CHANGELOG-<branch>-v<próxima-versão>.md` |
```

E substitua o bloco de versões atuais pelos valores que o comando acima imprimiu, no mesmo formato já usado:

```txt
apps/mobile       <versão>  → CHANGELOG-alfa-v<próxima>.md
apps/web          <versão>  → CHANGELOG-alfa-v<próxima>.md
apps/admin        <versão>  → CHANGELOG-alfa-v<próxima>.md
apps/landing      <versão>  → CHANGELOG-alfa-v<próxima>.md
apps/web-client   <versão>  → CHANGELOG-alfa-v<próxima>.md
apps/web-artists  <versão>  → CHANGELOG-alfa-v<próxima>.md
packages/core     <versão>  → CHANGELOG-alfa-v<próxima>.md
```

- [ ] **Step 2: Adicionar a Seção 9**

Insira, entre a Seção 8 (Débitos Conhecidos) e o fim do arquivo:

```markdown
---

## 9. 🗓️ Auditoria Periódica Obrigatória

Auditoria de segurança, performance, supply chain e LGPD **vence em 30 dias**.
Passado o prazo, merge em `alfa`, `beta` e `release` fica bloqueado até que uma
nova seja concluída e registrada.

### Os dois arquivos de registro

| Arquivo | Público | Conteúdo |
| --- | --- | --- |
| `AUDIT_LOG.md` (raiz) | humano | tabela com data ISO, issue e escopo |
| `.github/audit-log.json` | máquina | `lastAuditDate`, `issue`, `scope`, `maxAgeDays` |

Os dois carregam a mesma data e **são alterados sempre no mesmo commit**. O hook
`.githooks/pre-commit` recusa o commit quando um é alterado sem o outro, ou
quando as datas divergem. Ative os hooks uma vez após clonar:

```bash
bash scripts/setup-hooks.bash
```

### O gate de CI

`.github/workflows/audit-gate.yml` roda em **todo** PR para `alfa`, `beta` e
`release` — sem filtro por tipo de arquivo alterado — e falha quando:

- os arquivos de auditoria estão ausentes;
- as datas dos dois divergem (rede de segurança para commits feitos sem o hook ativo);
- `hoje − lastAuditDate` passa de `maxAgeDays` (30).

O bloqueio efetivo de merge depende de o check estar marcado como obrigatório
nas configurações de branch protection do repositório — isso é configuração do
GitHub, não versionada aqui.

### Escopo mínimo de uma auditoria

Uma auditoria só pode ser registrada como concluída se cobriu, no mínimo:

1. `pnpm audit` com o resultado registrado (contagem por severidade, antes/depois).
2. Busca por consulta ao banco dentro de laço (N+1) nas camadas de service e query.
3. Conferência de que toda listagem nova está paginada.
4. Mapa de dados pessoais: todo campo de PII coletado tem finalidade declarada na
   política de privacidade do app correspondente, e tem consumidor real no código.
5. Confirmação de que os limites de `[auth.rate_limit]` em `supabase/config.toml`
   continuam coerentes com os cooldowns de UI.
```

- [ ] **Step 3: Adicionar o item 18 ao Checklist**

Ao final da Seção 5 (após o item 17), acrescente:

````markdown
### 18. ❌ Auditoria vencida ou arquivos de auditoria dessincronizados

**Regra:** `AUDIT_LOG.md` e `.github/audit-log.json` carregam a mesma data e
mudam no mesmo commit. Auditoria com mais de 30 dias bloqueia merge em
`alfa`/`beta`/`release` até que uma nova seja registrada (Seção 9).
**Prompt de correção:** "Sincronize a data nos dois arquivos de auditoria, ou
conduza uma nova auditoria cobrindo o escopo mínimo da Seção 9 e registre-a em
ambos no mesmo commit."

```diff
  {
-   "lastAuditDate": "2026-07-01",
+   "lastAuditDate": "2026-09-03",
    "issue": 94
  }

  | Data | Issue | Escopo |
  | --- | --- | --- |
+ | 2026-09-03 | #94 | Performance, dependências, LGPD, rate limiting |
```
````

- [ ] **Step 4: Adicionar a regra de paginação à Seção 3**

Na Seção 3 (Performance, Otimização de Banco e SEO Técnico), a linha sobre `max_rows = 1000` já menciona paginação. Torne-a bloqueante acrescentando logo abaixo dela:

```markdown
- **Paginação obrigatória:** listagem nova que possa crescer sem teto nasce paginada
  por cursor (`CatalogPage<T>` / `flattenPages` de `@agenda/core`), com infinite
  scroll disparando a 80% do conteúdo (`onEndReachedThreshold={0.2}` no
  `FlashList`; `useInfiniteScrollSentinel` na web). Trazer o conjunto inteiro
  numa query só é aceitável em catálogo pequeno e limitado por natureza
  (estilos musicais, cidades) — e isso deve estar dito no docblock da função.
```

- [ ] **Step 5: Verificar que o arquivo continua bem formado**

Run: `grep -c "^## " AGENTS_RULES.md && grep -n "^### 18" AGENTS_RULES.md`
Expected: a contagem de seções aumentou em 1 e o item 18 aparece.

- [ ] **Step 6: Commit**

```bash
git add AGENTS_RULES.md
git commit -m "Add periodic audit rules and pagination requirement to project rules"
```

---

### Task 5: Ponteiros no `AGENTS.md` e no README

**Files:**
- Modify: `AGENTS.md`
- Modify: `README-local-dev.md`

- [ ] **Step 1: Apontar a regra de paginação no AGENTS.md**

`AGENTS.md` descreve arquitetura e aponta para `AGENTS_RULES.md` quando o assunto é regra bloqueante. Na Seção 6 (Performance), junto dos outros bullets de performance, acrescente:

```markdown
- **Listagem nova nasce paginada** por cursor (`CatalogPage<T>`, `flattenPages`), com
  infinite scroll a 80% do conteúdo. É regra bloqueante — ver `AGENTS_RULES.md` Seção 3.
```

- [ ] **Step 2: Apontar a auditoria periódica no AGENTS.md**

Na Seção 6, junto de "Segurança defensiva", acrescente:

```markdown
- **Auditoria vence em 30 dias.** `AUDIT_LOG.md` e `.github/audit-log.json` registram a
  última; o workflow `audit-gate.yml` bloqueia merge quando o prazo passa. Escopo mínimo
  e procedimento em `AGENTS_RULES.md` Seção 9.
```

- [ ] **Step 3: Documentar a ativação do hook no README de dev**

`README-local-dev.md` é o documento de setup local. Acrescente uma seção nova logo após "Pré-requisitos":

```markdown
## Ativando os hooks de git

O repositório versiona seus hooks em `.githooks/`, mas o git não os ativa
sozinho ao clonar. Rode uma vez:

```bash
bash scripts/setup-hooks.bash
```

Isso configura `core.hooksPath` neste clone. O hook `pre-commit` garante que
`AUDIT_LOG.md` e `.github/audit-log.json` nunca fiquem dessincronizados.
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README-local-dev.md
git commit -m "Document pagination rule, audit cadence and hook setup"
```

---

### Task 6: Verificação final e passo manual pendente

**Files:** nenhum (verificação)

- [ ] **Step 1: Rodar a verificação completa**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: os três passam. Nenhum código de aplicação foi alterado por este plano, então falha aqui indica problema pré-existente ou de outro plano — investigue antes de encerrar.

- [ ] **Step 2: Confirmar que o hook está ativo e passa**

Run: `git config --get core.hooksPath && bash .githooks/pre-commit`
Expected: imprime `.githooks` e, como nenhum arquivo de auditoria está no stage, o hook sai com sucesso sem mensagem de erro.

- [ ] **Step 3: Confirmar que a data registrada está dentro do prazo**

Run: `node -e "const d=require('./.github/audit-log.json').lastAuditDate;const age=Math.floor((Date.now()-Date.parse(d))/86400000);console.log(age+' dias desde a auditoria; gate '+(age>30?'FALHARIA':'passa'))"`
Expected: imprime a idade e `gate passa`. Se disser `FALHARIA`, atualize a data nos dois arquivos antes de abrir o PR — senão o próprio PR desta entrega é bloqueado pelo gate que ele introduz.

- [ ] **Step 4: Registrar o passo manual pendente**

Este plano não consegue habilitar a branch protection — é configuração do GitHub, fora do repositório. Ao final, informe ao usuário:

> O workflow `Audit Gate` já roda em PRs para `alfa`/`beta`/`release`, mas para
> ele **bloquear** o merge de fato, o check precisa ser marcado como obrigatório
> em Settings → Branches → branch protection rules, em cada uma das três
> branches. Sem isso, o check aparece como falho mas o merge continua possível.

- [ ] **Step 5: Nenhum CHANGELOG necessário**

AGENTS_RULES.md Seção 6: mudanças restritas a `.md`, `scripts/` ou configuração de CI **não exigem CHANGELOG**. Todo o conteúdo deste plano cai nessas categorias, então nenhum arquivo de CHANGELOG é criado ou alterado.

---

## Ordem recomendada entre os 5 planos

Este plano depende de dois outros para ficar coerente:

1. O **plano de paginação** precisa ter sido executado antes da regra de
   paginação da Task 4 Step 4 fazer sentido (ela cita `CatalogPage<T>`,
   `flattenPages` e `useInfiniteScrollSentinel`, que só existem depois dele).
2. O **plano de supply chain** acrescenta uma linha à Seção 8 do
   `AGENTS_RULES.md` (risco aceito do `image-size`). Executar os dois em
   paralelo gera conflito no mesmo arquivo — faça o de supply chain antes, ou
   resolva o conflito manualmente.

Os planos de privacidade e rate-limiting são independentes e podem rodar em
qualquer ordem.
