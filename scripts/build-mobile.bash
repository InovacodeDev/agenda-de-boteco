#!/usr/bin/env bash
# Build mobile das lojas: Android primeiro (--local), iOS depois (EAS remoto),
# encadeando os scripts `pnpm --filter @agenda/mobile build:{branch}:{platform}`.
# Só roda em alfa | beta | release. No fim gera um changelog (via `claude` CLI,
# com fallback para changelog cru) a partir dos commits desde a última versão
# publicada no canal.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
FILTER="@agenda/mobile"

branch="$(git -C "$ROOT" symbolic-ref --short HEAD)"
case "$branch" in
  alfa|beta|release) ;;
  *)
    echo "Erro: build só roda em alfa | beta | release (branch atual: $branch)." >&2
    exit 1
    ;;
esac

version="$(jq -r '.version' "$MOBILE/package.json")"
echo "→ Canal: $branch · versão: $version"

# Android primeiro; só segue pro iOS se terminar OK.
echo "→ Build Android ($branch)..."
pnpm --filter "$FILTER" "build:${branch}:android"

echo "→ Build iOS ($branch)..."
pnpm --filter "$FILTER" "build:${branch}:ios"

# --- Changelog -------------------------------------------------------------
# Range: da última tag do canal ({branch}-v*) até HEAD. Sem tag ainda = tudo.
last_tag="$(git -C "$ROOT" tag --list "${branch}-v*" --sort=-v:refname | head -n1)"
if [ -n "$last_tag" ]; then
  range="${last_tag}..HEAD"
  echo "→ Changelog desde $last_tag"
else
  range=""
  echo "→ Sem tag anterior no canal — changelog do histórico completo"
fi

commits="$(git -C "$ROOT" log ${range:+$range} --no-merges --pretty='- %s')"
if [ -z "$commits" ]; then
  commits="- (sem novos commits desde a última versão)"
fi

out="$MOBILE/CHANGELOG-${branch}-v${version}.md"

# ponytail: claude CLI headless; se ausente ou falhar, cai no changelog cru.
if command -v claude >/dev/null 2>&1; then
  echo "→ Gerando changelog com IA (claude)..."
  prompt="Gere um changelog em português (pt-BR) para publicar na loja de apps, versão ${version} do app 'Agenda de Boteco'. Use tom amigável e voltado ao usuário final, agrupando por Novidades / Melhorias / Correções. Não invente itens; baseie-se apenas nestes commits. Retorne só o markdown do changelog, sem preâmbulo.

Commits:
${commits}"
  if changelog="$(printf '%s' "$prompt" | claude -p 2>/dev/null)" && [ -n "$changelog" ]; then
    printf '%s\n' "$changelog" > "$out"
  else
    echo "⚠ claude falhou — usando changelog cru." >&2
    printf '# Changelog %s (%s)\n\n%s\n' "$version" "$branch" "$commits" > "$out"
  fi
else
  echo "⚠ claude CLI não encontrado — usando changelog cru." >&2
  printf '# Changelog %s (%s)\n\n%s\n' "$version" "$branch" "$commits" > "$out"
fi

echo "✓ Builds concluídos. Changelog: $out"
