#!/usr/bin/env bash
# Build mobile das lojas: Android primeiro (--local), iOS depois (EAS remoto),
# encadeando os scripts `pnpm --filter @agenda/<app> build:{branch}:{platform}`.
# Uso: scripts/build-mobile.bash [mobile|mobile-client] (padrão: mobile).
# Só roda em alfa | beta | release. O CHANGELOG do canal não é gerado aqui:
# é escrito a cada commit, conforme a Seção 8 do AGENTS.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app="${1:-mobile}"
case "$app" in
  mobile|mobile-client) ;;
  *)
    echo "Erro: app inválido \"$app\" (use mobile | mobile-client)." >&2
    exit 1
    ;;
esac
MOBILE="$ROOT/apps/$app"
FILTER="@agenda/$app"

branch="$(git -C "$ROOT" symbolic-ref --short HEAD)"
case "$branch" in
  alfa|beta|release) ;;
  *)
    echo "Erro: build só roda em alfa | beta | release (branch atual: $branch)." >&2
    exit 1
    ;;
esac

version="$(jq -r '.version' "$MOBILE/package.json")"
echo "→ App: $app · canal: $branch · versão: $version"

# Android primeiro; só segue pro iOS se terminar OK.
echo "→ Build Android ($branch)..."
pnpm --filter "$FILTER" "build:${branch}:android"

echo "→ Build iOS ($branch)..."
pnpm --filter "$FILTER" "build:${branch}:ios"

echo "✓ Builds concluídos"
