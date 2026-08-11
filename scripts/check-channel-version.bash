#!/usr/bin/env bash
#
# Valida a versão do mobile contra a última publicada num canal.
#
#   check-channel-version.bash <canal> <versão> [tag...]
#
# Regras por canal:
#   alfa            — só recusa versão idêntica à já publicada (bump de patch basta)
#   beta, release   — exige bump de minor ou major sobre a última publicada
#                     naquele canal; patch não promove
#
# As tags podem vir como argumentos (para teste); sem elas, lê de `git tag`.
# Sai 0 quando libera, 1 quando bloqueia, 2 em erro de uso.
set -euo pipefail

channel="${1:-}"
version="${2:-}"
shift 2 || true

if [ -z "$channel" ] || [ -z "$version" ]; then
  echo "uso: check-channel-version.bash <canal> <versão> [tag...]" >&2
  exit 2
fi

if ! [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "::error::Versão '$version' não é semver (major.minor.patch)." >&2
  exit 1
fi
new_major="${BASH_REMATCH[1]}"
new_minor="${BASH_REMATCH[2]}"
new_patch="${BASH_REMATCH[3]}"

if [ "$#" -gt 0 ]; then
  tags="$*"
else
  tags="$(git tag -l "${channel}-v*")"
fi

# Última versão publicada no canal, por ordenação semver (-V ordena numérico
# por segmento: 0.0.10 vem depois de 0.0.9, o que `sort` lexical erraria).
last=""
for tag in $tags; do
  case "$tag" in
    "${channel}-v"*) ;;
    *) continue ;;
  esac
  candidate="${tag#"${channel}-v"}"
  [[ "$candidate" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue
  if [ -z "$last" ] || [ "$(printf '%s\n%s\n' "$last" "$candidate" | sort -V | tail -1)" = "$candidate" ]; then
    last="$candidate"
  fi
done

if [ -z "$last" ]; then
  echo "Nenhuma versão publicada em '$channel' — liberado ($version será a primeira)."
  exit 0
fi

[[ "$last" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]
last_major="${BASH_REMATCH[1]}"
last_minor="${BASH_REMATCH[2]}"
last_patch="${BASH_REMATCH[3]}"

# Nunca aceita retroceder nem repetir, em canal nenhum.
if [ "$new_major" -lt "$last_major" ] ||
   { [ "$new_major" -eq "$last_major" ] && [ "$new_minor" -lt "$last_minor" ]; } ||
   { [ "$new_major" -eq "$last_major" ] && [ "$new_minor" -eq "$last_minor" ] && [ "$new_patch" -le "$last_patch" ]; }; then
  echo "::error::Versão $version não avança sobre $last, já publicada em '$channel'. Bumpe apps/mobile/package.json." >&2
  exit 1
fi

case "$channel" in
  beta|release)
    # Canal estável: patch não promove, o minor precisa mudar.
    if [ "$new_major" -eq "$last_major" ] && [ "$new_minor" -eq "$last_minor" ]; then
      required="${last_major}.$((last_minor + 1)).0"
      echo "::error::'$channel' exige bump de minor sobre $last (publicada). Versão $version só muda o patch — use $required ou superior." >&2
      exit 1
    fi
    ;;
esac

echo "Versão $version avança sobre $last em '$channel' — liberado."
