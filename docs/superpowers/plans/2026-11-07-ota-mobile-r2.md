# OTA Mobile (`expo-updates` + Cloudflare R2 + Edge Function) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar atualizações JS/Hermes Over-The-Air para `@agenda/mobile` e `@agenda/mobile-client` com servidor próprio (Supabase Edge Function + Cloudflare R2), code signing RSA-SHA256, limpeza automática do bucket e rollback sem re-upload.

**Architecture:** O cliente oficial `expo-updates` (protocolo Expo Updates v1) consulta `GET /functions/v1/ota-manifest`. A Edge Function lê a release ativa em `public.ota_releases` (acesso só por `service_role`), monta o manifesto com URLs públicas do R2 e o assina com `OTA_PRIVATE_KEY`. O CI decide por fingerprint: runtime nativo já conhecido → `expo export` + upload no R2 + registro da release; runtime novo → `eas build` e registro em `ota_native_builds`. Lógica pura (manifesto, assinatura, seleção de GC, rollback) vive em módulos sem I/O testados com `node --test`.

**Tech Stack:** Expo SDK 57 / RN 0.86.3 / `expo-updates` ~57, Supabase Edge Functions (Deno 2), Postgres + RLS, Cloudflare R2 (API S3), GitHub Actions, Node 22 (`node --test`, `--experimental-strip-types`), Jest (`jest-expo` e `ts-jest`), Zustand 5, Zod 3.23.8.

**Spec:** `docs/analise-3-deploy-ota-mobile.md` (complemento: `docs/analise-3b-alternativas-gratuitas-ota.md`)

## Global Constraints

- **Autorização prévia (Regra 10) — bloqueia o início das tasks indicadas:** `expo-updates` (Task 2), `@aws-sdk/client-s3` como devDependency da raiz (Tasks 6–8), `@posthog/cli` via `npx` no CI (Task 7). Nenhuma outra dependência nova.
- Package manager `pnpm@10.20.0`; não tocar `pnpm.overrides` nem `patchedDependencies`.
- Versão do Expo instalada é **57** (o AGENTS.md ainda cita 56): `expo-updates` usa a faixa `~57.0.x` que `pnpm exec expo install expo-updates` resolver.
- `runtimeVersion: { policy: 'fingerprint' }` — e `version`/`buildNumber`/`versionCode` **fora** do fingerprint (`SourceSkips.ExpoConfigVersions`), senão cada bump exigido pelo `version-gate`/`ci.yml` gera runtime novo e o OTA nunca se aplica.
- Layout no R2: `ota/<app_slug>/<channel>/<runtime_version>/<release_id>/{bundles/*, assets/*}`; **nunca** subir `.map`.
- `app_slug` ∈ {`agenda-de-boteco`, `agenda-de-boteco-client`} (os `slug` dos `app.config.ts`). `channel` ∈ {`alfa`, `beta`, `production`}. `platform` ∈ {`ios`, `android`}.
- Retenção: R2 Lifecycle expira `alfa`/`beta` em **30 dias**; GC mantém **top 3** releases por `(app_slug, channel, platform, runtime_version)` em `production`; runtimes sem release nova há **> 90 dias** são aposentados; alerta acima de **1,5 GB** (75% de 2 GB).
- `Cache-Control` dos objetos no R2: `public, max-age=31536000, immutable`. Resposta da Edge Function: `cache-control: private, max-age=0`.
- `checkAutomatically: 'ON_LOAD'`, `fallbackToCacheTimeout: 0`.
- Code signing: `codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' }`; só `certificate.pem` é versionado (o `.gitignore` bloqueia `*.pem` — precisa de exceção explícita); chave privada só em Secrets (Supabase + GitHub Actions).
- Tabelas novas com `ENABLE ROW LEVEL SECURITY` e **nenhuma** policy para `anon`/`authenticated` (escrita e leitura só via `service_role`).
- Sem `console.*` em código de app/core; scripts Node de CI podem usar `process.stdout`/`console` (não são bundle de cliente) mas **nunca** imprimem segredo, chave ou URL assinada.
- Toda env nova entra no `.env.example` correspondente com placeholder.
- Commit em inglês imperativo; CHANGELOG da próxima versão (`apps/mobile/CHANGELOG-alfa-v0.3.1.md`, `apps/mobile-client/CHANGELOG-alfa-v0.1.1.md`, `packages/core/CHANGELOG-alfa-v1.0.4.md`) em todo commit que toca código desses projetos. Scripts/CI/SQL/Edge Function sozinhos não exigem CHANGELOG.
- Antes de cada commit: `pnpm typecheck && pnpm lint && pnpm test` (+ `pnpm test:ota` a partir da Task 4).

## Review Focus

1. **Bump de versão com mesmo código nativo** — um commit que só muda `package.json#version` + JS deve manter o mesmo `runtimeVersion` (senão todo deploy vira build de loja). Teste: Task 2, Step 4.
2. **Release de `alfa`/`beta` expirada pelo Lifecycle mas ainda "ativa" no banco** — o app não pode receber manifesto com URLs 404; o esperado é `204` (fica no bundle atual). Teste: Task 4 (`selectServableRelease` ignora release com mais de 29 dias em canal não-produção).
3. **Rollback para release mais antiga** — o `expo-updates` só aplica manifesto com `createdAt` mais novo que o instalado; rollback precisa republicar N-1 com id/`createdAt` novos apontando para os objetos já existentes, e o GC não pode apagar prefixo referenciado por release mantida. Testes: Task 8 (`buildRollbackRow`) e Task 7 (`planPrune` preserva `asset_prefix` compartilhado).
4. **Cliente sem `expo-expect-signature` ou header de canal/app ausente/forjado** — Edge Function responde `400` para `x-app-slug`/canal/plataforma fora da allowlist e nunca concatena valor de header em URL ou em query textual. Teste: Task 4 (`parseManifestRequest`).
5. **Valor de enum novo vindo do banco antes do OTA chegar** — um atributo/status/tipo desconhecido não pode derrubar o parse do estabelecimento/evento/notificação inteiro. Teste: Task 9.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `apps/{mobile,mobile-client}/app.config.ts` | `runtimeVersion`, `updates.*`, plugin `expo-updates`, `getEnvVar` com `alfa`/`beta` |
| `apps/{mobile,mobile-client}/fingerprint.config.js` | O que entra/sai do hash nativo |
| `apps/{mobile,mobile-client}/certs/certificate.pem` | Certificado público de code signing |
| `apps/mobile/eas.json` (modificar), `apps/mobile-client/eas.json` (criar) | `channel` por perfil de build |
| `supabase/migrations/20261107120000_ota_releases.sql` | `ota_native_builds`, `ota_releases`, RLS |
| `supabase/functions/_shared/ota/protocol.ts` | Parse do request, seleção da release servível, montagem do manifesto/diretiva e do multipart — **puro** |
| `supabase/functions/_shared/ota/signing.ts` | Import de PEM PKCS#8 e header `expo-signature` via WebCrypto — **puro** |
| `supabase/functions/ota-manifest/index.ts` | I/O: Supabase query + resposta HTTP |
| `scripts/ota/lib/*.mjs` | Lógica pura de CI: manifest a partir do `dist/metadata.json`, plano de GC, linha de rollback, regras de lifecycle |
| `scripts/ota/{publish,prune,rollback,setup-r2-lifecycle}.mjs` | CLIs finos (I/O: R2, Supabase REST, `expo export`) |
| `scripts/ota/test/*.test.mjs`, `supabase/functions/_shared/ota/*.test.ts` | Testes `node --test` |
| `.github/workflows/{ci,deploy}.yml`, `.github/workflows/ota-gc.yml` | Detecção de mudança, publicação OTA, GC mensal |
| `apps/{mobile,mobile-client}/src/lib/updates.ts` | Telemetria do update + "Verificar atualizações" |
| `packages/core/src/stores/{usePreferences,useFavorites,useNotifications}Store.ts` | `version` + `migrate` |
| `packages/core/src/schemas/catalog.ts` | Fallback de enums de leitura |

Script raiz novo em `package.json`: `"test:ota": "node --test --experimental-strip-types scripts/ota/test supabase/functions/_shared/ota"`. Os módulos de `_shared/ota` importam só com extensão `.ts` explícita e sem `npm:`/`jsr:` — assim rodam igual no Deno e no Node 22.

---

### Task 1: Code signing — par de chaves e exceção no `.gitignore`

**Files:**
- Create: `apps/mobile/certs/certificate.pem`, `apps/mobile-client/certs/certificate.pem`
- Modify: `.gitignore` (bloco "Keys, certificates & signing material")

**Interfaces:**
- Produces: `./certs/certificate.pem` em cada app (consumido pela Task 2); secret `OTA_PRIVATE_KEY` (PEM PKCS#8) em Supabase Secrets e GitHub Actions (consumido pela Task 5).

- [ ] **Step 1:** Gerar **um** par para os dois apps, fora do repo (scratch), com `npx expo-updates codesigning:generate --key-output-directory <scratch>/keys --certificate-output-directory <scratch>/certs --certificate-validity-duration-years 10 --certificate-common-name "Agenda de Boteco OTA"` (rodar depois da Task 2 instalar o pacote, ou via `pnpm dlx` com autorização). Copiar só `certificate.pem` para `apps/*/certs/`.
- [ ] **Step 2:** Adicionar ao `.gitignore`, logo abaixo de `*.pem`: `!apps/*/certs/certificate.pem` e `apps/*/keys/`.
- [ ] **Step 3:** Verificar: `git check-ignore -v apps/mobile/certs/certificate.pem` → sem saída (não ignorado); `git check-ignore apps/mobile/keys/private-key.pem` → ignorado.
- [ ] **Step 4:** O humano grava `OTA_PRIVATE_KEY` (`supabase secrets set` e GitHub → Settings → Secrets). A chave **nunca** aparece em chat, log ou commit. Apagar o scratch.
- [ ] **Step 5:** Commit `Add OTA code signing certificates`.

### Task 2: `expo-updates`, fingerprint e config dos dois apps

> **Bloqueado por autorização:** instalar `expo-updates`.

**Files:**
- Modify: `apps/mobile/package.json`, `apps/mobile-client/package.json` (via `pnpm --filter <app> exec expo install expo-updates`), `pnpm-lock.yaml`
- Modify: `apps/mobile/app.config.ts`, `apps/mobile-client/app.config.ts`
- Create: `apps/mobile/fingerprint.config.js`, `apps/mobile-client/fingerprint.config.js`
- Modify: `apps/mobile/eas.json`; Create: `apps/mobile-client/eas.json`
- Modify: `apps/mobile/.env.example`, `apps/mobile-client/.env.example` (`EXPO_PUBLIC_OTA_MANIFEST_URL=`)
- Create: `apps/mobile/CHANGELOG-alfa-v0.3.1.md`; Modify (acrescentar): `apps/mobile-client/CHANGELOG-alfa-v0.1.1.md`

**Interfaces:**
- Consumes: `./certs/certificate.pem` (Task 1).
- Produces: header `x-app-slug: <slug>` e `expo-channel-name: <channel>` em todo request de update (Task 4 valida); `runtimeVersion` = fingerprint.

- [ ] **Step 1: `app.config.ts` (ambos)** — adicionar:
  - `runtimeVersion: { policy: 'fingerprint' }`
  - `updates: { url: process.env.EXPO_PUBLIC_OTA_MANIFEST_URL, enabled: Boolean(process.env.EXPO_PUBLIC_OTA_MANIFEST_URL), checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0, codeSigningCertificate: './certs/certificate.pem', codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' }, requestHeaders: { 'x-app-slug': <slug literal> } }`
  - `'expo-updates'` em `plugins`.
  - `getEnvVar` (só `apps/mobile`): perfis que exigem env passam a ser `['production', 'preview', 'alfa', 'beta']` (`const STRICT_PROFILES = [...] as const`). Também exigir `EXPO_PUBLIC_OTA_MANIFEST_URL` nesses perfis.
- [ ] **Step 2: `eas.json`** — `"channel"` em cada perfil: `production` → `production`, `alfa` → `alfa`, `beta` → `beta`, `preview` → `alfa`; `development` sem canal. É o EAS que grava `expo-channel-name` no binário — `app.config.ts` não repete o header. `apps/mobile-client/eas.json` copia a estrutura de `apps/mobile/eas.json` (sem `ascAppId` até existir app na App Store Connect — ver Questões em aberto).
- [ ] **Step 3: `fingerprint.config.js`** (CommonJS, ambos):
  ```js
  const { SourceSkips } = require('@expo/fingerprint');
  /** @type {import('@expo/fingerprint').Config} */
  module.exports = {
    sourceSkips: SourceSkips.ExpoConfigVersions | SourceSkips.ExpoConfigRuntimeVersionIfString,
    ignorePaths: ['CHANGELOG-*.md', '**/*.test.ts', '**/*.test.tsx', 'docs/**', '../web*/**', '../admin/**', '../landing/**'],
  };
  ```
  Se o lint reclamar de `require`, adicionar `fingerprint.config.js` ao bloco de arquivos CommonJS do `eslint.config.mjs` (pedir permissão — arquivo fora do escopo).
- [ ] **Step 4: Verificar Review Focus #1** — em `apps/mobile`: `npx expo-updates runtimeversion:resolve --platform android` → anotar hash; trocar `version` no `package.json` para `9.9.9` e uma string em qualquer `.tsx`; rodar de novo → **mesmo hash**; reverter. Repetir adicionando um plugin falso em `plugins` → hash **diferente**; reverter.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint && pnpm test` → verde. `pnpm --filter @agenda/mobile exec expo config --type public | grep -A12 '"updates"'` mostra a config.
- [ ] **Step 6:** CHANGELOG (ambos): "- O app passa a receber correções e melhorias sem precisar atualizar pela loja". Commit `Configure expo-updates with fingerprint runtime and code signing`.

### Task 3: Migração `ota_native_builds` + `ota_releases`

**Files:**
- Create: `supabase/migrations/20261107120000_ota_releases.sql`

**Interfaces:**
- Produces (lidas/escritas só por `service_role` nas Tasks 4–8):

```sql
create table public.ota_native_builds (
  id uuid primary key default gen_random_uuid(),
  app_slug text not null check (app_slug in ('agenda-de-boteco','agenda-de-boteco-client')),
  channel text not null check (channel in ('alfa','beta','production')),
  platform text not null check (platform in ('ios','android')),
  runtime_version text not null,
  eas_build_id text,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (app_slug, channel, platform, runtime_version)
);

create table public.ota_releases (
  id uuid primary key,                         -- = manifest.id (gerado no CI)
  app_slug text not null, channel text not null, platform text not null,
  runtime_version text not null,
  kind text not null default 'update' check (kind in ('update','rollback_embedded')),
  asset_prefix text,                           -- ota/<app>/<canal>/<runtime>/<release_id_de_origem>/ ; null p/ rollback_embedded
  manifest jsonb,                              -- launchAsset/assets com keys RELATIVAS ao bucket; null p/ rollback_embedded
  source_release_id uuid references public.ota_releases(id),  -- preenchido em rollback por republicação
  git_sha text not null,
  created_at timestamptz not null default now(),
  pruned_at timestamptz,
  foreign key (app_slug, channel, platform, runtime_version)
    references public.ota_native_builds (app_slug, channel, platform, runtime_version)
);
create index ota_releases_lookup on public.ota_releases
  (app_slug, channel, platform, runtime_version, created_at desc) where pruned_at is null;
```
mesmas `check` de `app_slug`/`channel`/`platform` em `ota_releases`; `ENABLE ROW LEVEL SECURITY` nas duas; `revoke all ... from anon, authenticated`; `grant select, insert, update on ... to service_role`. Sem policies.

- [ ] **Step 1:** Escrever a migração acima.
- [ ] **Step 2:** Verificar sintaxe sem subir banco remoto: `supabase db lint` só se o humano autorizar `supabase start`; caso contrário revisar no PR. Conferir com `grep -c "enable row level security" ...` → `2`.
- [ ] **Step 3:** Regenerar tipos **não** é necessário (nenhum app lê essas tabelas). Commit `Add OTA releases tables with service-role-only RLS`.

### Task 4: Protocolo Expo Updates v1 — módulo puro

**Files:**
- Create: `supabase/functions/_shared/ota/protocol.ts`
- Test: `supabase/functions/_shared/ota/protocol.test.ts`
- Modify: `package.json` (raiz) — script `test:ota`

**Interfaces:**
- Produces:
  ```ts
  export const APP_SLUGS = ['agenda-de-boteco', 'agenda-de-boteco-client'] as const;
  export const CHANNELS = ['alfa', 'beta', 'production'] as const;
  export const PLATFORMS = ['ios', 'android'] as const;
  export const PREVIEW_CHANNEL_MAX_AGE_DAYS = 29;
  export interface ManifestRequest { appSlug: AppSlug; channel: Channel; platform: Platform; runtimeVersion: string; currentUpdateId: string | null; expectSignature: boolean }
  export interface ReleaseRow { id: string; kind: 'update' | 'rollback_embedded'; manifest: StoredManifest | null; created_at: string }
  export interface StoredManifest { launchAsset: StoredAsset; assets: StoredAsset[]; metadata: Record<string, string> }
  export interface StoredAsset { key: string; hash: string; contentType: string; fileExtension?: string; path: string } // path relativo ao bucket
  export function parseManifestRequest(headers: Headers): { ok: true; value: ManifestRequest } | { ok: false; status: 400; reason: string };
  export function selectServableRelease(rows: readonly ReleaseRow[], channel: Channel, now: Date): ReleaseRow | null; // rows já ordenadas desc
  export function buildManifestBody(row: ReleaseRow, runtimeVersion: string, publicBaseUrl: string): string; // JSON estável
  export function buildDirectiveBody(row: ReleaseRow): string; // {"type":"rollBackToEmbedded","parameters":{"commitTime":...}}
  export function buildMultipart(part: { name: 'manifest' | 'directive'; body: string; signature: string | null }, boundary: string): string;
  ```

- [ ] **Step 1: Testes que falham** (`node:test` + `node:assert/strict`):
  - `parseManifestRequest` aceita headers `expo-protocol-version: 1`, `expo-platform: ios`, `expo-runtime-version: abc`, `expo-channel-name: production`, `x-app-slug: agenda-de-boteco`, `expo-expect-signature: sig, keyid="main", alg="rsa-v1_5-sha256"` → `ok: true`, `expectSignature: true`.
  - rejeita (`status 400`): `x-app-slug: evil`, `expo-channel-name: ../production`, `expo-platform: web`, `expo-protocol-version: 0`, runtime vazio ou > 128 chars ou fora de `/^[A-Za-z0-9._-]+$/`.
  - `selectServableRelease`: em `alfa`, row com `created_at` = agora − 30 dias → `null`; em `production` a mesma row → retornada; lista vazia → `null`.
  - `buildManifestBody`: `launchAsset.url === 'https://ota.example.com/' + path`; `createdAt === row.created_at`; `id === row.id`; `runtimeVersion` ecoado; nenhum `.map` em `assets` (row de teste contém um e ele é descartado); base com barra final não duplica barra.
  - `buildDirectiveBody` → `type: 'rollBackToEmbedded'`, `parameters.commitTime === row.created_at`.
  - `buildMultipart` contém `content-disposition: form-data; name="manifest"`, `content-type: application/json` e `expo-signature: <sig>` quando assinado; sem `expo-signature` quando `signature === null`; termina com `--<boundary>--`.
- [ ] **Step 2:** `pnpm test:ota` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar. `publicBaseUrl` vem só de env (Task 5), nunca de header.
- [ ] **Step 4:** `pnpm test:ota` → PASS.
- [ ] **Step 5:** Commit `Add Expo Updates v1 protocol helpers`.

### Task 5: Assinatura + Edge Function `ota-manifest`

**Files:**
- Create: `supabase/functions/_shared/ota/signing.ts`, Test: `supabase/functions/_shared/ota/signing.test.ts`
- Create: `supabase/functions/ota-manifest/index.ts`
- Modify: `supabase/config.toml` — `[functions.ota-manifest]` com `verify_jwt = false` (o `expo-updates` não envia JWT; o endpoint só serve conteúdo público e assinado)
- Modify: `.env.example` raiz — `OTA_PUBLIC_BASE_URL=`, `OTA_PRIVATE_KEY=` (comentário: "só em Supabase Secrets / GitHub Secrets")

**Interfaces:**
- Consumes: Task 4 inteira; tabela `ota_releases` (Task 3).
- Produces:
  ```ts
  export async function importSigningKey(pkcs8Pem: string): Promise<CryptoKey>; // RSASSA-PKCS1-v1_5 / SHA-256
  export async function signatureHeader(key: CryptoKey, body: string, keyId?: string): Promise<string>; // 'sig="<base64>", keyid="main"'
  ```

- [ ] **Step 1: Testes que falham** — gerar par com `crypto.subtle.generateKey` no teste, exportar PKCS#8 para PEM, `importSigningKey` → `signatureHeader(key, '{"a":1}')` casa `/^sig="[A-Za-z0-9+/=]+", keyid="main"$/` e a assinatura verifica com a chave pública; PEM inválido → rejeita com `Error` cuja mensagem **não** contém o conteúdo do PEM.
- [ ] **Step 2:** `pnpm test:ota` → FAIL. **Step 3:** implementar `signing.ts`. **Step 4:** PASS.
- [ ] **Step 5: `index.ts`** (`Deno.serve`), fluxo:
  1. `GET` apenas (senão `405`). `parseManifestRequest` → `400` em falha.
  2. Client com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (envs nativas da Edge Function), select em `ota_releases` por `(app_slug, channel, platform, runtime_version)`, `pruned_at is null`, `order created_at desc`, `limit 5` — query builder, nada textual.
  3. `selectServableRelease`; `null` **ou** `row.id === currentUpdateId` → `204` com `expo-protocol-version: 1`.
  4. Monta manifesto/diretiva; assina se `expectSignature` (chave importada uma vez por isolate, memoizada); responde `200`, `content-type: multipart/mixed; boundary=<uuid>`, `expo-protocol-version: 1`, `expo-sfv-version: 0`, `cache-control: private, max-age=0`.
  5. Erro inesperado → `500` com corpo genérico; log via `console.error` **apenas** com `method` e `release id` (sem headers, sem chave).
- [ ] **Step 6: Verificação manual** (com autorização para `supabase start` + `supabase functions serve ota-manifest`): `curl -i` com os headers do Step 1 da Task 4 e tabela vazia → `204`; com `x-app-slug: evil` → `400`.
- [ ] **Step 7:** Commit `Add signed OTA manifest edge function`.

### Task 6: Bucket R2 + Lifecycle de `alfa`/`beta`

> **Bloqueado por autorização:** `@aws-sdk/client-s3` (devDependency da raiz).

**Files:**
- Create: `scripts/ota/lib/lifecycle.mjs`, Test: `scripts/ota/test/lifecycle.test.mjs`
- Create: `scripts/ota/lib/r2.mjs` (factory do `S3Client` com `endpoint: https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, `region: 'auto'`, credenciais de env)
- Create: `scripts/ota/setup-r2-lifecycle.mjs`
- Modify: `.env.example` raiz — `R2_ACCOUNT_ID=`, `R2_ACCESS_KEY_ID=`, `R2_SECRET_ACCESS_KEY=`, `R2_BUCKET=agenda-ota`

**Interfaces:**
- Produces: `export function buildLifecycleRules(appSlugs: readonly string[], days: number): LifecycleRule[]` e `export function createR2Client(env: NodeJS.ProcessEnv): S3Client` (lança se faltar variável, sem ecoar valor).

R2 Lifecycle filtra **só por prefixo literal** (sem `*`), então a regra é uma por app × canal: `ota/<slug>/alfa/` e `ota/<slug>/beta/` → 4 regras, `ID` = `expire-<slug>-<canal>`, `Expiration.Days = 30`, `Status: 'Enabled'`.

- [ ] **Step 1:** Teste: `buildLifecycleRules(['agenda-de-boteco','agenda-de-boteco-client'], 30)` → 4 regras; prefixos exatos acima; nenhuma com `production`; todos terminam em `/`.
- [ ] **Step 2–4:** FAIL → implementar → PASS (`pnpm test:ota`).
- [ ] **Step 5:** `setup-r2-lifecycle.mjs` aplica via `PutBucketLifecycleConfigurationCommand`, idempotente (substitui a config inteira) e imprime só os IDs das regras.
- [ ] **Step 6 (humano):** criar bucket `agenda-ota`, domínio customizado público (valor vai para `OTA_PUBLIC_BASE_URL`), token R2 com escopo só nesse bucket; rodar o script uma vez.
- [ ] **Step 7:** Commit `Add R2 lifecycle rules for preview OTA channels`.

### Task 7: Publicação OTA + Garbage Collector

> **Bloqueado por autorização:** `@posthog/cli` (via `npx`, só no CI; o passo é pulado sem `POSTHOG_CLI_TOKEN`).

**Files:**
- Create: `scripts/ota/lib/manifest.mjs`, `scripts/ota/lib/prune.mjs`, `scripts/ota/lib/supabase-rest.mjs` (fetch fino na REST API com `service_role`, só Node de CI)
- Test: `scripts/ota/test/manifest.test.mjs`, `scripts/ota/test/prune.test.mjs`
- Create: `scripts/ota/publish.mjs`, `scripts/ota/prune.mjs`
- Modify: `package.json` raiz — `"ota:publish"`, `"ota:prune"`, `"ota:rollback"` (Task 8)

**Interfaces:**
- Consumes: tabelas da Task 3; formato `StoredManifest` da Task 4; `createR2Client` da Task 6.
- Produces:
  ```js
  /** metadata = dist/metadata.json do `expo export`; files = Map<relPath, Buffer> */
  export function buildStoredManifest({ metadata, platform, files, assetPrefix }) // -> { manifest: StoredManifest, uploads: Array<{ key, path, contentType }> }
  export function planPrune(rows, { now, keepPerRuntime = 3, retireAfterDays = 90 }) // -> { pruneReleaseIds: string[], deletePrefixes: string[], retireRuntimes: Array<{app_slug, channel, platform, runtime_version}> }
  export const BUCKET_ALERT_BYTES = 1.5 * 1024 ** 3;
  ```

- [ ] **Step 1: Testes `buildStoredManifest`** — com um `metadata` de fixture (`fileMetadata.ios.bundle = '_expo/static/js/ios/entry-abc.hbc'`, 2 assets, 1 `.map` em `files`):
  - `launchAsset.hash` = SHA-256 **base64url sem padding** do buffer; `launchAsset.contentType === 'application/javascript'`;
  - `assets[i].path` começa com `assetPrefix` e preserva a extensão; `contentType` derivado da extensão (png/jpg/ttf/otf/json; desconhecida → `application/octet-stream`);
  - nenhum upload/asset com `.map`;
  - `platform: 'android'` lê `fileMetadata.android`.
- [ ] **Step 2: Testes `planPrune`** (só canal `production`; `alfa`/`beta` → só marca `pruned_at` em rows com > 30 dias, sem `deletePrefixes`, já que o Lifecycle apaga):
  - 5 releases no mesmo runtime → poda as 2 mais antigas;
  - Review Focus #3: release mantida com `asset_prefix` igual ao de uma podada (rollback republicado) → prefixo **não** entra em `deletePrefixes`;
  - runtime cuja release mais nova tem > 90 dias e existe outro runtime mais novo para o mesmo app/canal/plataforma → entra em `retireRuntimes`, suas releases todas podadas; runtime **mais novo** nunca é aposentado, mesmo com > 90 dias (Global Constraint: nunca apagar a última release ativa de runtime em uso);
  - `rollback_embedded` não tem prefixo e não gera delete.
- [ ] **Step 3–5:** FAIL → implementar libs → PASS.
- [ ] **Step 6: `publish.mjs --app <dir> --channel <canal>`**:
  1. Para cada plataforma: `npx expo-updates runtimeversion:resolve --platform <p>` no app.
  2. Runtime ausente em `ota_native_builds` → sai com código `78` e escreve `needs_native_build=true` em `$GITHUB_OUTPUT` (o workflow decide o build — Task 8b).
  3. `npx expo export --platform <p> --dump-sourcemap --output-dir dist-ota/<p>` com as `EXPO_PUBLIC_*` do canal já no env do job.
  4. `.map` → `npx @posthog/cli hermes upload --directory dist-ota/<p>` se `POSTHOG_CLI_TOKEN` existir; senão aviso.
  5. `releaseId = crypto.randomUUID()`; `assetPrefix = ota/<slug>/<canal>/<runtime>/<releaseId>/`; upload com `PutObjectCommand` + `CacheControl: 'public, max-age=31536000, immutable'`.
  6. Insert em `ota_releases` (`id = releaseId`, `git_sha = GITHUB_SHA`) **depois** do upload completo (release nunca fica visível com objeto faltando).
  7. Chama `prune.mjs`.
- [ ] **Step 7: `prune.mjs`** — lê `ota_releases` não podadas + `ota_native_builds`, aplica `planPrune`, `DeleteObjectsCommand` em lotes de até 1000 chaves por prefixo listado (`ListObjectsV2`), grava `pruned_at`/`retired_at`, soma `Size` do bucket e emite `::warning::` acima de `BUCKET_ALERT_BYTES`. `--dry-run` imprime o plano sem apagar.
- [ ] **Step 8:** `pnpm test:ota && pnpm lint` → verde. Commit `Add OTA publish and pruning scripts`.

### Task 8: Rollback + integração CI/CD

**Files:**
- Create: `scripts/ota/lib/rollback.mjs`, Test: `scripts/ota/test/rollback.test.mjs`, Create: `scripts/ota/rollback.mjs`, `scripts/ota/register-native-build.mjs`
- Modify: `.github/workflows/ci.yml` (job `version-gate`, linhas 35–82)
- Modify: `.github/workflows/deploy.yml` (job `deploy`)
- Create: `.github/workflows/ota-gc.yml`

**Interfaces:**
- Consumes: `publish.mjs`/`prune.mjs` (Task 7), tabelas (Task 3).
- Produces:
  ```js
  export function buildRollbackRow(rows, { mode, now, newId, gitSha }) // mode: 'previous' | 'embedded'
  // 'previous': copia manifest + asset_prefix da 2ª release servível, id = newId, created_at = now, source_release_id = id copiado
  // 'embedded': kind 'rollback_embedded', manifest/asset_prefix null
  // lança se não houver N-1 em 'previous'
  ```

- [ ] **Step 1: Testes `buildRollbackRow`** — `previous` com [N, N-1, N-2] → `asset_prefix` e `manifest` de N-1, `id === newId`, `created_at === now.toISOString()`, `source_release_id === N-1.id`; com 1 release → lança `Error('Nenhuma release anterior para rollback')`; `embedded` → `kind: 'rollback_embedded'`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `rollback.mjs --app <slug> --channel <canal> --platform <ios|android|all> [--embedded]` — um insert por plataforma; nenhum upload. Script `"ota:rollback": "node scripts/ota/rollback.mjs"`.
- [ ] **Step 6: `ci.yml`** — `mobile_changed` passa a considerar `apps/mobile/ apps/mobile-client/ packages/core/ packages/shared-ui-mobile/` (o `git diff --name-only "$range" -- <paths>`). Mensagem de erro do gate continua citando `apps/mobile/package.json`.
- [ ] **Step 7: `deploy.yml`** — job `deploy` vira matrix `app: [{dir: apps/mobile, filter: '@agenda/mobile'}, {dir: apps/mobile-client, filter: '@agenda/mobile-client'}]` com `fail-fast: false`, e o `CHANNEL_PROFILE` existente vira o canal OTA:
  1. Passo `ota` roda `pnpm ota:publish --app ${{ matrix.app.dir }} --channel $CHANNEL_PROFILE` com env: `EXPO_PUBLIC_*` do canal (de `vars`/`secrets` por environment GitHub — mesmo nome das chaves do `.env.example`), `R2_*`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secret do CI, nunca no app), `POSTHOG_CLI_TOKEN`, `GOOGLE_MAPS_API_KEY_*` (entram no fingerprint via `app.config.ts`; precisam ser **os mesmos** do EAS — puxar com `eas env:exec <environment> --` envolvendo o comando).
  2. Passo `Build` atual só roda se `steps.ota.outputs.needs_native_build == 'true'`; depois do `eas build --json`, gravar `runtimeVersion` de cada build retornado em `ota_native_builds` (`scripts/ota/register-native-build.mjs` lendo `$RUNNER_TEMP/eas-build.json` — mesmo padrão de `lib/supabase-rest.mjs`).
  3. Summary passa a indicar "OTA publicado (release `<id>`)" ou "Build nativo".
  4. `migrate` continua antes do deploy em `release` (expand-and-contract).
- [ ] **Step 8: `ota-gc.yml`** — `on: schedule: cron: '17 6 1 * *'` + `workflow_dispatch`; roda `pnpm ota:prune`. `permissions: contents: read`.
- [ ] **Step 9:** `pnpm test:ota`; validar YAML com `npx --yes actionlint` (se o humano autorizar) ou revisão no PR. Commit `Wire OTA publish, rollback and GC into CI`.

### Task 9: Resiliência de contratos — enums e stores versionadas

**Files:**
- Modify: `packages/core/src/schemas/catalog.ts` (linhas 23, 30–67, 75, 101, 110, 132–137)
- Create: `packages/core/src/schemas/catalog.test.ts`
- Modify: `packages/core/src/stores/usePreferencesStore.ts:47`, `useFavoritesStore.ts:112`, `useNotificationsStore.ts:26` e os `.test.ts` ao lado
- Modify: `packages/core/CHANGELOG-alfa-v1.0.4.md`, `apps/mobile/CHANGELOG-alfa-v0.3.1.md`

**Interfaces:**
- Produces: tipos inferidos **inalterados** (`EstablishmentAttribute[]`, `EventStatus`, `PriceRange | null`, `NotificationType`); `export const PERSISTED_STORE_VERSION = 1` em `packages/core/src/config/stores.ts`.

Decisões de fallback (leitura tolera, escrita continua estrita via derivação):
- `attributes`: `z.array(z.string()).default([]).transform(v => v.filter(isEstablishmentAttribute))` com `isEstablishmentAttribute` = type guard sobre `establishmentAttributeSchema.safeParse`.
- `price_range`: `priceRangeSchema.nullable().catch(null)`.
- `status`: `eventStatusSchema.catch('draft').default('published')` — ausente continua `published` (default do banco); **desconhecido vira `draft`** (falha fechada: some do feed público).
- `type` da notificação: `notificationTypeSchema.catch('promo')` (ver Questões em aberto).
- `CACHE_BUSTER` **não** muda: o shape de saída é idêntico.

- [ ] **Step 1: Testes que falham** (`catalog.test.ts`): establishment com `attributes: ['pet-friendly','rooftop-new']` → parse ok, `['pet-friendly']`; `price_range: '$$$$$'` → `null`; event com `status: 'archived'` → `'draft'`; sem `status` → `'published'`; notificação `type: 'artist'` → `'promo'`; `establishmentWriteSchema` continua aceitando atributo conhecido.
- [ ] **Step 2: Testes das stores** — para cada store: storage em memória com JSON legado **sem** `version` (formato atual) → após `persist.rehydrate()` o estado é preservado (`cityId`, `eventIds`, `readIds`); `persist.getOptions().version === PERSISTED_STORE_VERSION`; payload com `version: 99` não derruba a store (mantém defaults).
- [ ] **Step 3:** `pnpm --filter @agenda/core test` → FAIL.
- [ ] **Step 4:** Implementar: `version: PERSISTED_STORE_VERSION` e `migrate: (persisted, fromVersion) => fromVersion === 0 ? persisted as <PersistedState> : <defaults>` com type guard por store (sem `as` solto — validar com um schema Zod mínimo do estado persistido).
- [ ] **Step 5:** `pnpm typecheck && pnpm lint && pnpm test` → verde.
- [ ] **Step 6:** CHANGELOG core/mobile: "- O app continua funcionando quando novas categorias e atributos são publicados antes da atualização chegar". Commit `Tolerate unknown catalog enums and version persisted stores`.

### Task 10: Telemetria do update e "Verificar atualizações"

**Files:**
- Create: `apps/mobile/src/lib/updates.ts`, `apps/mobile/src/lib/updates.test.ts`
- Create: `apps/mobile-client/src/lib/updates.ts`, `apps/mobile-client/src/lib/updates.test.ts`
- Modify: `apps/mobile/app/(tabs)/profile.tsx`, `apps/mobile-client/app/(painel)/settings/index.tsx`
- Modify: bootstrap de cada app (`src/lib/bootstrap.ts`) — chamar `reportUpdateContext` uma vez após `initAnalytics`
- Modify: CHANGELOGs dos dois apps

**Interfaces:**
- Consumes: `AnalyticsAdapter` de `@agenda/core`; `expo-updates` (Task 2).
- Produces (mesma assinatura nos dois apps):
  ```ts
  export type UpdateCheckResult =
    | { status: 'unavailable' }          // dev client, web ou updates desabilitado
    | { status: 'up-to-date' }
    | { status: 'ready-to-restart' }     // baixado; UI oferece reiniciar
    | { status: 'error' };
  export function reportUpdateContext(analytics: AnalyticsAdapter | null): void; // evento 'ota_update_context' { update_id, channel, runtime_version, is_embedded_launch }
  export async function checkForAppUpdate(): Promise<UpdateCheckResult>;
  export async function applyDownloadedUpdate(): Promise<void>; // Updates.reloadAsync()
  ```

- [ ] **Step 1: Testes que falham** (`jest.mock('expo-updates', ...)`): `Updates.isEnabled = false` → `unavailable` sem chamar `checkForUpdateAsync`; `isAvailable: false` → `up-to-date`; `isAvailable: true` + `fetchUpdateAsync` ok → `ready-to-restart`; `checkForUpdateAsync` lança → `error` e `handleServiceError` **não** é usado (não é service) — usar `logErrorToTerminal(error, { method: 'updates.checkForAppUpdate' })` sem `args`; `reportUpdateContext(null)` não lança; com adapter, captura `ota_update_context` só com os 4 campos (sem PII).
- [ ] **Step 2–4:** FAIL → implementar → PASS (`pnpm --filter @agenda/mobile test`, idem client).
- [ ] **Step 5: UI** — botão "Verificar atualizações" (`Button` de `components/ui` no mobile; equivalente de `@agenda/shared-ui-mobile` no client), protegido contra duplo toque (`GuardedPressable`/`useGuardedPress`). Textos: "Você já está na versão mais recente", "Atualização baixada. Reiniciar agora?" (`ConfirmDialog` → `applyDownloadedUpdate`), "Não foi possível verificar agora. Tente novamente mais tarde.". Botão oculto quando `unavailable`. Exibir abaixo o identificador curto `Updates.updateId?.slice(0, 8) ?? 'embutido'` para suporte.
- [ ] **Step 6:** `pnpm typecheck && pnpm lint && pnpm test` → verde. CHANGELOG (ambos): "- Nova opção para verificar atualizações nas configurações". Commit `Add OTA update telemetry and manual update check`.

---

## Ordem e dependências

`1 → 2` (certificado antes do config) · `3 → 4 → 5` (backend) · `6 → 7 → 8` (CI) · `9` e `10` independentes (10 depende de 2). Primeiro deploy real exige **um build nativo** de cada app já com `expo-updates` (é ele que registra o primeiro runtime em `ota_native_builds`).

## Questões em aberto (decisão do humano antes da Task indicada)

1. **Task 2/8 — `mobile-client` nas lojas:** hoje não há `eas.json`, `ascAppId` nem fluxo de deploy para ele. Proposta: entra na matrix com build **sem** auto-submit até a ficha da loja existir. Confirmar.
2. **Task 7 — Source maps no PostHog:** depende de `@posthog/cli` (autorização) e do projeto PostHog aceitar Hermes source maps; sem o token o passo é pulado.
3. **Task 9 — fallback de `notification.type` desconhecido:** proposta `'promo'` (ícone genérico). Alternativa: descartar a notificação na leitura.
4. **AGENTS.md** cita Expo 56 / RN 0.85; o repo está em Expo 57 / RN 0.86.3 — atualizar o `.md` exige autorização (Regra 9).
