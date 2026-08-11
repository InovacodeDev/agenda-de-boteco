#!/usr/bin/env bash
#
# Testes da regra de versão por canal. Roda offline: as tags são passadas
# como argumento, então nada depende do estado do repositório.
#
#   bash scripts/check-channel-version.test.bash
set -uo pipefail

script="$(dirname "$0")/check-channel-version.bash"
pass=0
fail=0

# expect <esperado: ok|block> <descrição> <canal> <versão> [tags...]
expect() {
  local want="$1" desc="$2"
  shift 2
  local out rc
  out="$(bash "$script" "$@" 2>&1)" && rc=0 || rc=$?
  local got="ok"
  [ "$rc" -eq 0 ] || got="block"
  if [ "$got" = "$want" ]; then
    pass=$((pass + 1))
    printf '  ok   %s\n' "$desc"
  else
    fail=$((fail + 1))
    printf '  FAIL %s\n       esperado=%s obtido=%s :: %s\n' "$desc" "$want" "$got" "$out"
  fi
}

echo "beta: publicou 0.0.9"
expect block "mesma versão é recusada"            beta 0.0.9  beta-v0.0.9
expect block "patch não promove (0.0.10)"         beta 0.0.10 beta-v0.0.9
expect ok    "minor promove (0.1.0)"              beta 0.1.0  beta-v0.0.9
expect ok    "major promove (1.0.0)"              beta 1.0.0  beta-v0.0.9

echo "release: publicou 0.1.0"
expect block "mesma versão é recusada"            release 0.1.0 release-v0.1.0
expect block "patch não promove (0.1.1)"          release 0.1.1 release-v0.1.0
expect ok    "minor promove (0.2.0)"              release 0.2.0 release-v0.1.0
expect ok    "major promove (1.0.0)"              release 1.0.0 release-v0.1.0

echo "alfa: patch continua valendo"
expect ok    "patch promove (0.0.10)"             alfa 0.0.10 alfa-v0.0.9
expect block "mesma versão é recusada"            alfa 0.0.9  alfa-v0.0.9

echo "ordenação semver"
expect block "0.0.10 é a última, não 0.0.9"       beta 0.0.11 beta-v0.0.9 beta-v0.0.10
expect ok    "minor sobre 0.0.10"                 beta 0.1.0  beta-v0.0.9 beta-v0.0.10

echo "bordas"
expect ok    "primeiro deploy do canal"           release 0.0.1
expect block "não retrocede major.minor"          release 0.0.5 release-v0.1.0
expect block "não retrocede minor"                beta 0.1.0 beta-v0.2.0
expect ok    "major zera minor e ainda avança"    release 1.0.0 release-v0.9.5
expect ok    "ignora tags de outros canais"       release 0.1.0 alfa-v9.9.9 beta-v5.0.0
expect block "versão não-semver"                  beta abc beta-v0.0.9
expect ok    "minor salta vários"                 beta 0.5.0 beta-v0.0.9

printf '\n%d passou, %d falhou\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
