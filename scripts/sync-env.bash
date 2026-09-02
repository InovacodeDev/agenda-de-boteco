#!/usr/bin/env bash
# Sobe o Supabase local, aplica migrations pendentes e sincroniza URL/anon key
# nos .env de cada app (exceto landing, que não usa Supabase). Rodado antes de
# `turbo run dev` via `pnpm dev` — ver package.json raiz.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

supabase start >/dev/null 2>&1 || true
supabase migration up

env_output="$(supabase status -o env)"
api_url="$(echo "$env_output" | grep '^API_URL=' | cut -d'"' -f2)"
anon_key="$(echo "$env_output" | grep '^ANON_KEY=' | cut -d'"' -f2)"

if [ -z "$api_url" ] || [ -z "$anon_key" ]; then
  echo "Erro: não foi possível obter API_URL/ANON_KEY de 'supabase status'." >&2
  exit 1
fi

# upsert_var <arquivo> <chave> <valor> — atualiza a linha se existir, senão acrescenta
upsert_var() {
  local file="$1" key="$2" value="$3"
  touch "$file"
  if grep -q "^${key}=" "$file"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "$file.bak"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

upsert_var "$ROOT/apps/web/.env.local" NEXT_PUBLIC_SUPABASE_URL "$api_url"
upsert_var "$ROOT/apps/web/.env.local" NEXT_PUBLIC_SUPABASE_ANON_KEY "$anon_key"

upsert_var "$ROOT/apps/web-client/.env.local" NEXT_PUBLIC_SUPABASE_URL "$api_url"
upsert_var "$ROOT/apps/web-client/.env.local" NEXT_PUBLIC_SUPABASE_ANON_KEY "$anon_key"

upsert_var "$ROOT/apps/admin/.env.local" NEXT_PUBLIC_SUPABASE_URL "$api_url"
upsert_var "$ROOT/apps/admin/.env.local" NEXT_PUBLIC_SUPABASE_ANON_KEY "$anon_key"

upsert_var "$ROOT/apps/mobile/.env" EXPO_PUBLIC_SUPABASE_URL "$api_url"
upsert_var "$ROOT/apps/mobile/.env" EXPO_PUBLIC_SUPABASE_ANON_KEY "$anon_key"

echo "Supabase local ativo em $api_url — .env sincronizados (web, web-client, admin, mobile)."
