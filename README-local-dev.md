# Rodando o Supabase localmente

Por padrão, web, admin e mobile apontam para o Supabase local — nunca para produção.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) rodando
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) instalado (`brew install supabase/tap/supabase`)

## Subindo o ambiente

```bash
supabase start
```

Ou, no VS Code: `Terminal > Run Task > supabase: start`. Para derrubar: `supabase stop` (ou a task `supabase: stop`).

Isso sobe Postgres 17 + PostGIS, Auth, Storage, Realtime e aplica as migrations de `supabase/migrations/`. Studio fica em [http://127.0.0.1:54323](http://127.0.0.1:54323), Mailpit (e-mails locais, ex. OTP) em [http://127.0.0.1:54324](http://127.0.0.1:54324).

## Configurando os apps

Cada app já tem um `.env.example` com URL e anon key do Supabase local (valores fixos e públicos do CLI, não são segredo). Basta copiar:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

## Populando dados de catálogo

```bash
supabase db reset
```

Aplica as migrations do zero e roda `supabase/seed.sql`.

## Mobile em dispositivo físico ou emulador Android

`http://127.0.0.1:54321` só funciona no simulador iOS e na web. Para emulador Android, troque o host por `10.0.2.2`; para dispositivo físico, use o IP da sua máquina na rede local (ex. `192.168.x.x`) — o Supabase local já escuta em `0.0.0.0`.
