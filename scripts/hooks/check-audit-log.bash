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
