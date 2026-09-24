#!/usr/bin/env bash
# Aponta o git deste clone para os hooks versionados em .githooks/.
# Rode uma vez apos clonar o repositorio.
set -euo pipefail

git config core.hooksPath .githooks
echo "core.hooksPath configurado para .githooks"
echo "Hooks ativos:"
ls -1 .githooks
