# Design — Landing page (`apps/landing`)

Data: 2026-07-02

## Objetivo

Criar `apps/landing`: um app Next.js independente que serve a raiz do domínio
(`/`). A landing é o ponto de entrada do produto e permite:

1. **Baixar o app** — botões de download com detecção de plataforma:
   Android → só Play Store; iPhone/iPad → só App Store; Browser desktop → ambos.
2. **Entrar no app web** (`/app`).
3. **Acessar o painel admin** (`/admin`) — link discreto.

## Decisões (já aprovadas)

- **App independente**, não uma rota do `apps/web`. Deploy próprio. Isso evita
  mover o feed atual (que vive em `apps/web/app/(app)/` servindo `/`) e não toca
  nos 6 redirects internos para `/`.
- **Stack: Next 15 + App Router + Tailwind v4**, espelhando `apps/web` e
  `apps/admin`. Reaproveita tokens de tema, fontes (Space Grotesk / Inter) e
  `@agenda/core`. Porta dev nova: `8087`.
- **Topologia: mesmo domínio via rewrites.** A landing é o deploy raiz e faz
  proxy para os outros dois:
  - `agendadeboteco.com/` → `apps/landing`
  - `agendadeboteco.com/app/*` → `apps/web` (deploy com `basePath: '/app'`)
  - `agendadeboteco.com/admin/*` → `apps/admin` (deploy com `basePath: '/admin'`)
- **Escopo visual: hero enxuto** (uma seção). Sem features/screenshots/prova
  social — conteúdo que ainda não existe.
- **Acesso admin: link discreto** no rodapé, não botão de destaque.
- **Links das lojas ainda não existem** → placeholders num ponto único do core,
  para trocar depois sem caçar.

## Arquitetura

```
apps/landing/                 (NOVO — @agenda/landing)
  package.json                dev na porta 8087; deps mínimas (next, react, @agenda/core)
  next.config.ts              transpilePackages: ['@agenda/core']  (sem basePath — é a raiz)
  tsconfig.json               espelha apps/web
  postcss.config.mjs          Tailwind v4
  vercel.json                 rewrites /app/* e /admin/* → deploys web/admin
  .env.example                NEXT_PUBLIC_WEB_URL, NEXT_PUBLIC_ADMIN_URL (para os rewrites)
  app/
    layout.tsx                fontes + metadata; SEM Providers/Supabase (landing é estática)
    globals.css               mesmos @theme tokens de apps/web
    page.tsx                  hero (Server Component estático)
  components/
    DownloadButtons.tsx       'use client' — único ponto client da página

packages/core/src/
  utils/platform.ts           NOVO — detectPlatform(ua): 'android' | 'ios' | 'other'
  utils/platform.test.ts      NOVO — teste do contrato (obrigatório: util)
  config/stores.ts            NOVO — STORE_URLS = { android, ios }  (placeholders '#')
  index.ts                    barrel: + export './utils/platform' e './config/stores'
```

> `utils/platform.ts` (detecção pura de UA) não se confunde com o diretório
> `platform/storage.ts` já existente (adapter de storage injetado). `STORE_URLS`
> mora em `config/` junto de `config/features.ts`, que já guarda constantes de
> configuração do app.

```txt
```

### Mudanças fora da landing (habilitar os rewrites)

- `apps/web/next.config.ts`: adicionar `basePath: '/app'`.
- `apps/admin/next.config.ts`: adicionar `basePath: '/admin'`.

Com `basePath`, os links internos de cada app (`/`, `/mapa`, `router.push('/')`,
etc.) continuam válidos — o Next prefixa automaticamente. **Nenhum redirect
interno do web/admin muda.**

## Componentes

### `app/page.tsx` — hero (Server Component estático)

Sem `'use client'`. Estrutura vertical centralizada:

- Logo 🍺 + wordmark "Agenda de Boteco".
- Título + subtítulo (linha dos "eventos e bares da sua cidade").
- `<DownloadButtons />` (bloco de download).
- Link primário "Entrar no app web" → `/app`.
- Rodapé com link discreto "Painel admin" → `/admin`.

### `components/DownloadButtons.tsx` — `'use client'`

Único componente client. Lê `navigator.userAgent` em `useEffect`, resolve a
plataforma via `detectPlatform` e decide quais botões mostrar:

- `android` → 1 botão (Play Store).
- `ios` → 1 botão (App Store).
- `other` → 2 botões.

**Fallback sem flash:** o estado inicial (SSR + primeiro paint, antes do
`useEffect`) mostra **ambos** os botões. Assim funciona com JS desligado e não
esconde download de ninguém; a filtragem por plataforma é progressive
enhancement.

Enquanto `STORE_URLS.*` for `'#'`, o botão renderiza visualmente desabilitado
(sem navegação).

### `packages/core` — `detectPlatform`

Função pura, contrato estável:

```ts
export function detectPlatform(ua: string): 'android' | 'ios' | 'other'
```

- `/android/i.test(ua)` → `'android'` (checado antes de iOS).
- `/iphone|ipad|ipod/i.test(ua)` → `'ios'`.
- caso contrário → `'other'`.
- entrada vazia/indefinida → `'other'`.

`STORE_URLS` fica no core como fonte única:

```ts
export const STORE_URLS = { android: '#', ios: '#' } as const;
```

## Fluxo de dados

Estático. Nenhuma chamada de rede, Supabase ou TanStack Query. A única lógica
dinâmica é a leitura de `navigator.userAgent` no client, isolada em
`DownloadButtons`.

## Erros e casos de borda

- **JS desligado / pré-hidratação:** mostra ambos os botões (fallback seguro).
- **`userAgent` vazio:** `detectPlatform` retorna `'other'` → ambos.
- **URL de loja ainda placeholder (`'#'`):** botão desabilitado, sem navegação.
- **Env de rewrite ausente em dev:** o `vercel.json` só age em deploy; em dev os
  botões `/app` e `/admin` apontam para os paths, que só resolvem no domínio
  unificado. Para testar os apps localmente, usar as portas dev diretas
  (`:8088` / `:8089`). A landing em si (`:8087`) roda isolada.

## Testes

- **`detectPlatform`** (util no core → obrigatório): teste unitário cobrindo
  Android, iPhone, iPad, iPod, desktop e string vazia. É a source of truth do
  contrato (recebe string, retorna união de 3 literais).
- **Landing / `DownloadButtons`:** UI de app web → sem teste unitário exigido;
  o gate é `typecheck && build`.

## Gates de verificação (AGENTS.md)

- `apps/landing` (web-pure): `pnpm --filter @agenda/landing typecheck && build`.
- `apps/web` e `apps/admin` (mudança de `basePath`): `typecheck && build`.
- `@agenda/core` (util novo): `typecheck && lint && test`.

## Fora de escopo (YAGNI)

- Seções de features, screenshots, prova social, footer legal completo.
- i18n (a landing é pt-BR, como o resto).
- Analytics / tracking de clique de download.
- Detecção de plataforma server-side (via header `user-agent`): o fallback
  "ambos" cobre o caso; SSR por UA adiciona complexidade sem ganho real aqui.
