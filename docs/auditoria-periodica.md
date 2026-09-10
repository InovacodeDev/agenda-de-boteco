# Roteiro de Auditoria Periódica

Execute este roteiro a cada **30 dias**. O workflow `audit-gate.yml` bloqueia
merge em `alfa`/`beta`/`release` quando a última auditoria passa desse prazo.

Ao final, registre nos dois arquivos de log no mesmo commit (o hook `pre-commit`
rejeita se divergirem).

---

## 0. Pré-voo

```bash
# Confirme que os hooks estão ativos neste clone
git config --get core.hooksPath   # deve imprimir: .githooks

# Se não estiver:
bash scripts/setup-hooks.bash

# Veja quantos dias faz desde a última auditoria
node -e "
const d = require('./.github/audit-log.json').lastAuditDate;
const age = Math.floor((Date.now() - Date.parse(d)) / 86400000);
console.log('Última auditoria: ' + d + ' (' + age + ' dias atrás)');
"
```

---

## 1. Supply chain — `pnpm audit`

```bash
pnpm audit 2>&1 | tee /tmp/audit-before.txt
```

Registre a contagem por severidade:

| Severidade | Antes | Depois (se corrigido) |
| --- | --- | --- |
| critical | | |
| high | | |
| moderate | | |
| low | | |

**O que fazer com os achados:**

- CVE com fix disponível (`pnpm audit --fix`) → aplique, rode typecheck + teste, commite.
- CVE sem fix (ex.: `image-size` — risco aceito documentado em `AGENTS_RULES.md` Seção 8) → confirme que o risco aceito ainda está documentado e que não surgiu fix upstream. Se surgiu, aplique.
- Dependência nova não autorizada → investigue origem (transitive? direto?) e abra issue antes de decidir.

---

## 2. N+1 e queries dentro de laço

Grep pelos padrões mais comuns. Qualquer hit merece leitura manual — não é automático que seja um bug, mas é o lugar onde N+1 mora.

```bash
# Chamada a service/query dentro de map/forEach/for
grep -rn "\.map\|\.forEach\|for " \
  packages/core/src/services/ \
  packages/core/src/queries/ \
  --include="*.ts" \
  | grep -v "\.test\." \
  | grep -v "//.*map\|//.*forEach"
```

**O que verificar em cada hit:**

- A chamada ao banco está *dentro* do laço? → N+1.
- Solução padrão deste repo: buscar todos os ids de uma vez (`in`, `.in()` do supabase-js) e montar um índice com `indexById` (`@agenda/core/utils`).

---

## 3. Paginação — listagens novas sem teto

```bash
# Funções de listagem sem range/limit explícito
grep -rn "\.from\(.*\)\.select\(" \
  packages/core/src/services/ \
  packages/core/src/queries/ \
  --include="*.ts" \
  | grep -v "\.test\." \
  | grep -v "\.range\|\.limit\|maybeSingle\|single"
```

**O que verificar:**

- Cada resultado é uma listagem que pode crescer sem teto?
- Se sim: está usando `CatalogPage<T>` + `flattenPages` + `useInfiniteScrollSentinel` (web) ou `onEndReached` com `FlashList` (mobile)?
- Catálogos pequenos e limitados por natureza (estilos musicais, cidades) são exceção — o docblock da função deve dizer isso.

---

## 4. Mapa de PII — coerência código × política de privacidade

### 4a. Campos de PII no schema

```bash
# Colunas suspeitas de conter PII nas tabelas públicas
grep -n "email\|phone\|whatsapp\|cpf\|cnpj\|address\|lat\|lng\|name\|instagram" \
  packages/core/src/types/database.types.ts \
  | grep -v "//\|_url\|brand\|music\|style\|establishment_name"
```

Para cada campo identificado, confirme:

| Campo | Tabela | Finalidade no código | Declarado na política? |
| --- | --- | --- | --- |
| | | | |

### 4b. Políticas de privacidade — links rápidos

| App | Arquivo |
| --- | --- |
| web (consumidor) | `apps/web/app/privacy/page.tsx` |
| mobile | `apps/mobile/app/privacy.tsx` |
| admin | `apps/admin/app/privacy/page.tsx` |
| web-client (dono do bar) | `apps/web-client/app/privacy/page.tsx` |
| web-artists (músicos) | `apps/web-artists/app/privacy/page.tsx` |

**O que verificar:** cada campo de PII encontrado em 4a tem finalidade declarada na política do app que o coleta? Se um campo foi adicionado desde a última auditoria e a política não foi atualizada, atualize antes de registrar a auditoria como concluída.

### 4c. PII em logs (dívida conhecida, confirme que não piorou)

```bash
# args com campos sensíveis em handleServiceError
grep -rn "args:.*email\|args:.*token\|args:.*phone\|args:.*cpf" \
  packages/core/src/services/ \
  --include="*.ts"
```

A única ocorrência aceitável é a dívida já documentada em `AGENTS_RULES.md` Seção 8 (`auth.verifyEmailOtp` loga `{ email, token }`). Qualquer hit novo é uma infração do item 2 do checklist — corrija antes de registrar.

---

## 5. Rate limiting — coerência config.toml × UI

Valores atuais em `supabase/config.toml` (`[auth.rate_limit]`):

| Parâmetro | Valor atual | Equivalente na UI |
| --- | --- | --- |
| `email_sent` | `2` por hora | `OTP_ATTEMPTS_PER_HOUR = 2` em `useResendCooldown` |
| `otp_expiry` | `3600` s (1h) | — (expiração silenciosa, não exibida) |
| `sign_in_sign_ups` | `30` / 5 min | — (sem cooldown de UI, volume baixo) |
| `token_verifications` | `30` / 5 min | — (idem) |

**O que verificar:**

```bash
# Confirme que OTP_ATTEMPTS_PER_HOUR ainda bate com email_sent
grep -n "OTP_ATTEMPTS_PER_HOUR" packages/core/src/hooks/useResendCooldown.ts
grep -n "email_sent" supabase/config.toml
```

Se `email_sent` foi alterado no `config.toml`, atualize `OTP_ATTEMPTS_PER_HOUR` no hook e o docblock correspondente. Se `DEFAULT_RESEND_COOLDOWN_SECONDS` (60s) não reflete mais a experiência desejada, ajuste com cuidado — o objetivo é avisar o usuário *antes* de bater no limite real.

---

## 6. Verificação final

```bash
pnpm typecheck && pnpm --filter @agenda/core test
```

Ambos devem passar limpos. Relate qualquer falha antes de registrar a auditoria.

---

## 7. Registrar a auditoria concluída

Abra uma issue no GitHub descrevendo o que foi encontrado e o que foi corrigido. Anote o número da issue.

Depois, no mesmo commit, atualize os dois arquivos:

**`AUDIT_LOG.md`** — acrescente uma linha no topo da tabela:

```markdown
| YYYY-MM-DD | #<issue> | <escopo resumido> |
```

**`.github/audit-log.json`** — atualize `lastAuditDate` e `issue`:

```json
{
  "lastAuditDate": "YYYY-MM-DD",
  "issue": <número>,
  "scope": ["performance", "dependencies", "lgpd", "rate-limiting"],
  "maxAgeDays": 30
}
```

```bash
git add AUDIT_LOG.md .github/audit-log.json
git commit -m "Record periodic audit #<issue>"
```

O hook `pre-commit` confirma que as datas batem antes de deixar o commit passar.
