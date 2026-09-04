# Governança: regras explícitas + auditoria periódica obrigatória — design

Data: 2026-09-03
Status: aprovado, aguardando plano de implementação
Issue: #94 (auditoria) → esta spec é uma das 5 tarefas derivadas

## Contexto

As 4 specs anteriores (paginação, LGPD, rate-limiting, supply chain)
corrigem achados pontuais da auditoria #94. Esta spec formaliza a regra
para que a **classe de problema** não reapareça sem detecção: paginação
obrigatória em listagem nova, checklist de supply chain antes de
dependência nova, e uma cadência de auditoria com gate de CI que bloqueia
merge se a auditoria estiver vencida.

`AGENTS_RULES.md` já existe e é robusto — tem Seção 8 "Débitos Conhecidos"
e um Checklist de 17 itens bloqueantes. Esta spec **estende**, não recria.
Enquanto isso, confirmado que a tabela de apps/versões dessa seção está
desatualizada frente ao `AGENTS.md` (não lista `web-client`, `web-artists`,
`shared-ui`) — corrigido junto, por já estar sendo tocado.

## Escopo

1. Nota curta no `AGENTS.md` sobre paginação obrigatória, apontando para a
   regra bloqueante em `AGENTS_RULES.md`.
2. `AGENTS_RULES.md`: sincronizar tabela de apps/versões; nova Seção 9
   "Auditoria Periódica"; item 18 no Checklist.
3. `AUDIT_LOG.md` (raiz, legível por humano) + `.github/audit-log.json`
   (legível por máquina) — sempre sincronizados.
4. Hook `pre-commit` nativo (`core.hooksPath`, sem husky) bloqueando commit
   se os dois arquivos de audit divergirem ou um for editado sem o outro.
5. GitHub Action bloqueando merge em PRs para `alfa`/`beta`/`release` se a
   última auditoria tiver mais de 30 dias.

## 1. `AGENTS.md` — nota de paginação

Na Seção 4 (Fluxo de Dados) ou 6 (Performance), adicionar uma linha curta:
"Listagem nova sem paginação é infração bloqueante — ver
`AGENTS_RULES.md` Seção 8, item 7 (N+1)/item novo." Só aponta, não duplica
a regra completa (que já mora no `AGENTS_RULES.md`, fonte única do que
bloqueia merge, por design do próprio arquivo).

## 2. `AGENTS_RULES.md` — mudanças

**Sincronizar tabela de apps** (Seção "Versões atuais" citada na Seção 6):
incluir `web-client`, `web-artists`, `packages/shared-ui`, e nota sobre
`mobile-artists`/`mobile-client` planejados — espelhando a tabela já
correta do `AGENTS.md`.

**Nova Seção 9 — Auditoria Periódica:**

```markdown
## 9. 🗓️ Auditoria Periódica Obrigatória

Toda auditoria de segurança/performance/supply-chain/LGPD (como a que
gerou este arquivo pela primeira vez, issue #94) registra sua conclusão em
dois arquivos, sempre sincronizados:

- `AUDIT_LOG.md` (raiz) — humano, data ISO + link da issue.
- `.github/audit-log.json` (raiz) — máquina, mesmo dado em JSON.

Um hook `pre-commit` (`.githooks/pre-commit`, ativado via
`git config core.hooksPath .githooks`) bloqueia o commit se:
(a) um dos dois arquivos for alterado no stage sem o outro, ou
(b) as datas dentro deles divergirem.

Uma GitHub Action (`.github/workflows/audit-gate.yml`) roda em todo PR
para `alfa`/`beta`/`release` e falha o check se `hoje - lastAuditDate`
(lido de `AUDIT_LOG.md`) for maior que 30 dias — bloqueando o merge via
branch protection (a branch protection em si é configuração do GitHub,
habilitada manualmente fora do código).

Nova auditoria: atualizar ambos os arquivos no mesmo commit, com a data do
dia e o número da issue que a originou.
```

**Item 18 do Checklist bloqueante:**

```markdown
### 18. ❌ Auditoria vencida ou arquivos de audit dessincronizados

**Regra:** `AUDIT_LOG.md` e `.github/audit-log.json` têm sempre a mesma
data; auditoria com mais de 30 dias bloqueia merge em `alfa`/`beta`/`release`
até nova auditoria.
**Prompt de correção:** "Sincronize a data em `AUDIT_LOG.md` e
`.github/audit-log.json`, ou conduza nova auditoria e atualize ambos no
mesmo commit."
```

## 3. Arquivos de controle

`AUDIT_LOG.md`:

```markdown
# Log de Auditorias

| Data | Issue | Escopo |
| --- | --- | --- |
| 2026-09-03 | #94 | Performance/N+1, dependências/CVE, mapa LGPD, rate limiting |
```

`.github/audit-log.json`:

```json
{
  "lastAuditDate": "2026-09-03",
  "issue": 94,
  "scope": ["performance", "dependencies", "lgpd", "rate-limiting"]
}
```

O hook e a Action leem `lastAuditDate` do JSON (parse trivial) e a
primeira data da tabela do `.md` (regex simples na primeira linha de
dados) para comparar.

## 4. Hook `pre-commit`

`.githooks/pre-commit` (bash, sem dependência nova):

```bash
#!/usr/bin/env bash
set -euo pipefail

staged=$(git diff --cached --name-only)
md_touched=$(echo "$staged" | grep -c '^AUDIT_LOG\.md$' || true)
json_touched=$(echo "$staged" | grep -c '^\.github/audit-log\.json$' || true)

if [ "$md_touched" -gt 0 ] || [ "$json_touched" -gt 0 ]; then
  if [ "$md_touched" -ne "$json_touched" ]; then
    echo "❌ AUDIT_LOG.md e .github/audit-log.json devem ser alterados juntos." >&2
    exit 1
  fi
fi

md_date=$(grep -oE '^\| [0-9]{4}-[0-9]{2}-[0-9]{2}' AUDIT_LOG.md | head -1 | tr -d '| ')
json_date=$(node -e "console.log(require('./.github/audit-log.json').lastAuditDate)")

if [ "$md_date" != "$json_date" ]; then
  echo "❌ Data divergente: AUDIT_LOG.md ($md_date) vs audit-log.json ($json_date)." >&2
  exit 1
fi
```

Ativação documentada em `README.md`/`README-local-dev.md` (edição
autorizada, é a exceção de doc de setup) ou via script `pnpm run
setup:hooks` que roda `git config core.hooksPath .githooks` — decisão de
implementação, ambos cumprem o requisito de "sem husky".

## 5. GitHub Action — `audit-gate.yml`

```yaml
name: Audit Gate
on:
  pull_request:
    branches: [alfa, beta, release]

jobs:
  check-audit-freshness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check audit log freshness
        run: |
          last_date=$(node -e "console.log(require('./.github/audit-log.json').lastAuditDate)")
          last_epoch=$(date -d "$last_date" +%s)
          now_epoch=$(date +%s)
          days=$(( (now_epoch - last_epoch) / 86400 ))
          if [ "$days" -gt 30 ]; then
            echo "::error::Última auditoria foi há $days dias (>30). Rode nova auditoria antes de mergear."
            exit 1
          fi
          echo "Auditoria em dia: $days dias desde a última."
```

Roda em todo PR para os 3 canais, sem path filter — decisão já validada
("todo PR", sem exceção de escopo de diff).

## 6. Débito registrado

Adicionar linha na Seção 8 "Débitos Conhecidos" do `AGENTS_RULES.md`:
`image-size` sem fix de CVE disponível (da spec de supply chain) —
revisar na próxima auditoria agendada.

## Testes

Nenhuma lógica de aplicação — é config de CI/git hook. Verificação manual:
simular commit alterando só um dos dois arquivos (deve falhar) e simular
Action com data antiga no JSON local (deve falhar o step).

## Fora de escopo

- Habilitar a branch protection do GitHub em si (config fora do repo,
  precisa ser feita manualmente nas configurações do repositório).
- Husky ou qualquer dependência nova para o hook.
