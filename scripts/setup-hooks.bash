#!/usr/bin/env bash
# Ativa os hooks versionados. Husky (.husky/) e o unico diretorio de hooks:
# um core.hooksPath apontando para outro lugar desliga o Husky em silencio.
set -euo pipefail

git config --unset core.hooksPath || true
pnpm exec husky
echo "core.hooksPath configurado para $(git config core.hooksPath)"
echo "Hooks ativos:"
ls -1 .husky | grep -v '^_$'
