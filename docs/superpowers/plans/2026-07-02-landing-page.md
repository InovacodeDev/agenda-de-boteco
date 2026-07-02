# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `apps/landing`, um app Next.js independente que serve a raiz do domínio com hero de download (detecção de plataforma), link para o app web (`/app`) e link discreto para o admin (`/admin`).

**Architecture:** App Next 15 (App Router, estático) espelhando `apps/web`/`apps/admin`. A detecção de plataforma é uma util pura no `@agenda/core`, consumida por um único componente client. Os apps web/admin ganham `basePath` e a landing carrega o `vercel.json` de rewrites para unificar os três deploys sob um domínio.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, TypeScript strict, jest (core).

---

## Estrutura de arquivos

```
packages/core/src/
  utils/platform.ts           NOVO — detectPlatform(ua)
  utils/platform.test.ts      NOVO — teste (jest)
  config/stores.ts            NOVO — STORE_URLS
  index.ts                    MOD — + 2 exports no barrel

apps/landing/                 NOVO app (@agenda/landing, porta 8087)
  package.json
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  next-env.d.ts               (gerado pelo next; não versionar manualmente)
  .env.example
  .gitignore
  vercel.json
  app/layout.tsx
  app/globals.css
  app/page.tsx
  components/DownloadButtons.tsx
  components/icons.tsx

apps/web/next.config.ts        MOD — basePath '/app'
apps/admin/next.config.ts      MOD — basePath '/admin'
```

---

## Task 1: `detectPlatform` no core (util pura + teste)

**Files:**
- Create: `packages/core/src/utils/platform.ts`
- Test: `packages/core/src/utils/platform.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/core/src/utils/platform.test.ts`:

```ts
import { detectPlatform } from './platform';

describe('detectPlatform', () => {
  it('retorna união de 3 literais', () => {
    const r = detectPlatform('');
    expect(['android', 'ios', 'other']).toContain(r);
  });

  it('detecta Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';
    expect(detectPlatform(ua)).toBe('android');
  });

  it('detecta iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(detectPlatform(ua)).toBe('ios');
  });

  it('detecta iPad', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(detectPlatform(ua)).toBe('ios');
  });

  it('detecta iPod', () => {
    expect(detectPlatform('Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
  });

  it('desktop → other', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
    expect(detectPlatform(ua)).toBe('other');
  });

  it('string vazia → other', () => {
    expect(detectPlatform('')).toBe('other');
  });

  it('android tem prioridade sobre iphone se ambos aparecerem', () => {
    expect(detectPlatform('android iphone')).toBe('android');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agenda/core exec jest src/utils/platform.test.ts`
Expected: FAIL — `Cannot find module './platform'`.

- [ ] **Step 3: Write minimal implementation**

`packages/core/src/utils/platform.ts`:

```ts
export type Platform = 'android' | 'ios' | 'other';

/**
 * Detecta a plataforma a partir do user-agent do navegador.
 * Android tem prioridade (alguns UAs de webview citam ambos).
 */
export function detectPlatform(ua: string): Platform {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'other';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agenda/core exec jest src/utils/platform.test.ts`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/utils/platform.ts packages/core/src/utils/platform.test.ts
git commit -m "feat(core): add detectPlatform util"
```

---

## Task 2: `STORE_URLS` no core + barrel

**Files:**
- Create: `packages/core/src/config/stores.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create `STORE_URLS`**

`packages/core/src/config/stores.ts`:

```ts
/**
 * URLs das lojas. Placeholders até a publicação — trocar aqui (fonte única).
 * Um valor '#' sinaliza "ainda sem link" e a UI deve desabilitar o botão.
 */
export const STORE_URLS = {
  android: '#',
  ios: '#',
} as const;

export type StoreKey = keyof typeof STORE_URLS;
```

- [ ] **Step 2: Export no barrel**

Em `packages/core/src/index.ts`, adicionar duas linhas junto aos demais `export *` de `utils`/`config` (após `export * from './config/features';` e junto do bloco de utils):

```ts
export * from './config/stores';
export * from './utils/platform';
```

- [ ] **Step 3: Typecheck o core**

Run: `pnpm --filter @agenda/core typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/config/stores.ts packages/core/src/index.ts
git commit -m "feat(core): add STORE_URLS config and export platform util"
```

---

## Task 3: `basePath` em web e admin

**Files:**
- Modify: `apps/web/next.config.ts`
- Modify: `apps/admin/next.config.ts`

- [ ] **Step 1: Editar web**

`apps/web/next.config.ts` (conteúdo completo):

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/app',
  transpilePackages: ['@agenda/core'],
};

export default config;
```

- [ ] **Step 2: Editar admin**

`apps/admin/next.config.ts` (conteúdo completo):

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/admin',
  transpilePackages: ['@agenda/core'],
};

export default config;
```

- [ ] **Step 3: Verificar que os apps ainda buildam com basePath**

> Nota: `.next` é gerado — não rodar com o dev server ativo (corrompe cache). Parar previews antes.

Run: `pnpm --filter @agenda/web build && pnpm --filter @agenda/admin build`
Expected: ambos buildam. Nos logs, as rotas aparecem prefixadas (`/app`, `/admin`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/next.config.ts apps/admin/next.config.ts
git commit -m "feat: set basePath /app and /admin for unified-domain routing"
```

---

## Task 4: Scaffold do `apps/landing`

**Files:**
- Create: `apps/landing/package.json`
- Create: `apps/landing/next.config.ts`
- Create: `apps/landing/tsconfig.json`
- Create: `apps/landing/postcss.config.mjs`
- Create: `apps/landing/.gitignore`
- Create: `apps/landing/.env.example`

- [ ] **Step 1: `package.json`**

`apps/landing/package.json`:

```json
{
  "name": "@agenda/landing",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 8087",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@agenda/core": "workspace:*",
    "next": "^15.1.0",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@agenda/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "@types/node": "^22.0.0",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: `next.config.ts`** (é a raiz — sem basePath)

`apps/landing/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@agenda/core'],
};

export default config;
```

- [ ] **Step 3: `tsconfig.json`** (espelha o web)

`apps/landing/tsconfig.json`:

```json
{
  "extends": "@agenda/typescript-config/base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: `postcss.config.mjs`**

`apps/landing/postcss.config.mjs`:

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
```

- [ ] **Step 5: `.gitignore`**

`apps/landing/.gitignore`:

```gitignore
/.next/
/node_modules
next-env.d.ts
*.tsbuildinfo
```

- [ ] **Step 6: `.env.example`**

`apps/landing/.env.example`:

```bash
# URLs de destino dos rewrites (usadas pelo vercel.json em produção).
# Em dev os apps rodam nas portas diretas (web :8088, admin :8089).
NEXT_PUBLIC_WEB_URL=https://web-agenda-de-boteco.vercel.app
NEXT_PUBLIC_ADMIN_URL=https://admin-agenda-de-boteco.vercel.app
```

- [ ] **Step 7: Instalar deps do workspace**

Run: `pnpm install`
Expected: `@agenda/landing` resolvido no workspace, sem erros.

- [ ] **Step 8: Commit**

```bash
git add apps/landing/package.json apps/landing/next.config.ts apps/landing/tsconfig.json apps/landing/postcss.config.mjs apps/landing/.gitignore apps/landing/.env.example pnpm-lock.yaml
git commit -m "chore(landing): scaffold Next.js app"
```

---

## Task 5: Layout + globals da landing

**Files:**
- Create: `apps/landing/app/globals.css`
- Create: `apps/landing/app/layout.tsx`

- [ ] **Step 1: `globals.css`** (mesmos tokens do web — ver `apps/web/app/globals.css`)

`apps/landing/app/globals.css`:

```css
@import 'tailwindcss';

@theme {
  --color-background: #0f0f0f;
  --color-foreground: #fafafa;
  --color-card: #171717;
  --color-card-foreground: #fafafa;
  --color-surface: #1c1c1c;
  --color-surface-elevated: #242424;
  --color-muted: #242424;
  --color-muted-foreground: #a6a6a6;
  --color-border: #292929;
  --color-primary: #1dd75e;
  --color-primary-foreground: #0f0f0f;
  --color-primary-glow: #3df57d;
  --color-accent: #f9a91f;
  --color-accent-foreground: #0f0f0f;
  --color-ring: #1dd75e;

  --font-heading: var(--font-space-grotesk), system-ui, sans-serif;
  --font-body: var(--font-inter), system-ui, sans-serif;
}

html, body {
  background: var(--color-background);
  color: var(--color-foreground);
}

body {
  font-family: var(--font-body);
}
```

- [ ] **Step 2: `layout.tsx`** (fontes + metadata; sem Providers/Supabase)

`apps/landing/app/layout.tsx`:

```tsx
import './globals.css';

import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Agenda de Boteco',
  description: 'Os melhores eventos e bares da sua cidade. Baixe o app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/landing/app/globals.css apps/landing/app/layout.tsx
git commit -m "feat(landing): add layout and theme tokens"
```

---

## Task 6: Ícones das lojas

**Files:**
- Create: `apps/landing/components/icons.tsx`

- [ ] **Step 1: Criar ícones**

`apps/landing/components/icons.tsx`. O `AppleIcon` é o mesmo SVG usado em `apps/web/components/auth/icons.tsx`. O `PlayIcon` é o triângulo do Google Play em `currentColor`.

```tsx
interface IconProps {
  size?: number;
}

export function AppleIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.13 3.01-.86.99-2.26 1.76-3.45 1.66a3.45 3.45 0 0 1-.03-.42c0-1.1.49-2.27 1.2-3.05.86-.95 2.34-1.66 3.4-1.7.01.17.01.34.01.5zM20.5 17.05c-.55 1.27-.81 1.84-1.52 2.96-.99 1.57-2.39 3.53-4.12 3.54-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.78-4.04-3.35C-.07 17.66-.34 12.4 1.4 9.7c1.06-1.65 2.73-2.62 4.31-2.62 1.6 0 2.61 1.04 4.04 1.04 1.39 0 2.23-1.04 4.08-1.04 1.4 0 2.89.76 3.95 2.08-3.47 1.9-2.9 6.85.72 7.89z" />
    </svg>
  );
}

export function PlayIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.6 2.3a1 1 0 0 0-.6.9v17.6a1 1 0 0 0 .6.9l9.9-9.7L3.6 2.3zm11.3 8.6 2.7-2.6-11.2-6.4 8.5 9zm0 2.2-8.5 9 11.2-6.4-2.7-2.6zm1.5-1.1 3.4-1.9c.7-.4.7-1.4 0-1.8l-3.4-1.9-2 2 2 2z" />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/landing/components/icons.tsx
git commit -m "feat(landing): add store icons"
```

---

## Task 7: `DownloadButtons` (detecção de plataforma)

**Files:**
- Create: `apps/landing/components/DownloadButtons.tsx`

- [ ] **Step 1: Criar componente**

`apps/landing/components/DownloadButtons.tsx`:

```tsx
'use client';

import { detectPlatform, STORE_URLS, type Platform } from '@agenda/core';
import { useEffect, useState } from 'react';

import { AppleIcon, PlayIcon } from '@/components/icons';

const BTN =
  'flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-[family-name:var(--font-body)] font-semibold transition-opacity hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-40';

function StoreButton({ store, children }: { store: 'android' | 'ios'; children: React.ReactNode }) {
  const href = STORE_URLS[store];
  const disabled = href === '#';
  return (
    <a
      href={href}
      aria-disabled={disabled}
      aria-label={store === 'android' ? 'Baixar na Google Play' : 'Baixar na App Store'}
      className={`${BTN} bg-foreground text-background`}
    >
      {children}
    </a>
  );
}

export function DownloadButtons() {
  // Pré-hidratação/SSR: mostra ambos (fallback sem flash, funciona sem JS).
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent));
  }, []);

  const showAndroid = platform === 'android' || platform === 'other';
  const showIos = platform === 'ios' || platform === 'other';

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {showAndroid ? (
        <StoreButton store="android">
          <PlayIcon />
          Google Play
        </StoreButton>
      ) : null}
      {showIos ? (
        <StoreButton store="ios">
          <AppleIcon />
          App Store
        </StoreButton>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/landing/components/DownloadButtons.tsx
git commit -m "feat(landing): add platform-aware download buttons"
```

---

## Task 8: Página hero (`app/page.tsx`)

**Files:**
- Create: `apps/landing/app/page.tsx`

- [ ] **Step 1: Criar a página**

`apps/landing/app/page.tsx` (Server Component estático):

```tsx
import { DownloadButtons } from '@/components/DownloadButtons';

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[linear-gradient(160deg,#1A122B,#0F0F0F)]">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 text-[40px]">
            🍺
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-[40px] font-bold leading-tight text-foreground">
            Agenda de <span className="text-primary">Boteco</span>
          </h1>
          <p className="max-w-md text-[16px] leading-6 text-muted-foreground">
            Os melhores eventos e bares da sua cidade, sempre à mão. Baixe o app e
            descubra o que rola na noite.
          </p>
        </div>

        <DownloadButtons />

        <a
          href="/app"
          className="text-[14px] font-semibold text-primary underline-offset-4 hover:underline"
        >
          Entrar no app web →
        </a>
      </div>

      <footer className="flex flex-col items-center gap-2 px-6 pb-8 text-center">
        <p className="text-[12px] text-muted-foreground">
          © 2026 Agenda de Boteco ·{' '}
          <a href="/app/privacidade" className="hover:text-foreground">
            Privacidade
          </a>
        </p>
        <a href="/admin" className="text-[12px] text-muted-foreground hover:text-foreground">
          Painel admin
        </a>
      </footer>
    </main>
  );
}
```

> Nota: `/app/privacidade` porque a página de privacidade vive no app web (`apps/web/app/privacidade`), agora sob o basePath `/app`.

- [ ] **Step 2: Commit**

```bash
git add apps/landing/app/page.tsx
git commit -m "feat(landing): add hero page"
```

---

## Task 9: `vercel.json` (rewrites do domínio unificado)

**Files:**
- Create: `apps/landing/vercel.json`

- [ ] **Step 1: Criar rewrites**

`apps/landing/vercel.json`. Os destinos são deploys separados; as URLs vêm das env vars configuradas no projeto Vercel da landing.

```json
{
  "rewrites": [
    { "source": "/app", "destination": "https://web-agenda-de-boteco.vercel.app/app" },
    { "source": "/app/:path*", "destination": "https://web-agenda-de-boteco.vercel.app/app/:path*" },
    { "source": "/admin", "destination": "https://admin-agenda-de-boteco.vercel.app/admin" },
    { "source": "/admin/:path*", "destination": "https://admin-agenda-de-boteco.vercel.app/admin/:path*" }
  ]
}
```

> As URLs de destino são placeholders com o padrão de nome de deploy Vercel — ajustar quando os projetos web/admin forem criados no Vercel. `vercel.json` não interpola env vars em `destination`, então o valor fica literal aqui (fonte única para editar na publicação).

- [ ] **Step 2: Commit**

```bash
git add apps/landing/vercel.json
git commit -m "chore(landing): add rewrites for /app and /admin"
```

---

## Task 10: Verificação final e checks

**Files:** nenhum (só verificação).

- [ ] **Step 1: Typecheck + build da landing**

Run: `pnpm --filter @agenda/landing typecheck && pnpm --filter @agenda/landing build`
Expected: sem erros; build gera a rota `/` estática.

- [ ] **Step 2: Verificar a landing no browser (preview_start `@agenda/landing`, porta 8087)**

- Snapshot mostra: título "Agenda de Boteco", botões de download, link "Entrar no app web", link "Painel admin".
- Console sem erros de hidratação.
- `preview_resize` mobile: os botões empilham (coluna) — layout ok.

- [ ] **Step 3: Checar detecção de plataforma via UA (preview_eval)**

Simular UA de iPhone e recarregar; confirmar que só o botão "App Store" aparece. Depois Android → só "Google Play". Depois desktop → ambos.

> Como `detectPlatform` já tem teste unitário no core (Task 1), esta é só uma confirmação visual do wiring.

- [ ] **Step 4: Checks completos dos pacotes tocados**

Run:
```bash
pnpm --filter @agenda/core typecheck && pnpm --filter @agenda/core lint && pnpm --filter @agenda/core test
pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web build
pnpm --filter @agenda/admin typecheck && pnpm --filter @agenda/admin build
pnpm --filter @agenda/landing typecheck && pnpm --filter @agenda/landing build
```
Expected: tudo verde.

- [ ] **Step 5: Adicionar script de dev raiz (opcional, segue o padrão existente)**

Em `package.json` (raiz), na seção `scripts`, adicionar após `dev:web`:

```json
"dev:landing": "pnpm --filter @agenda/landing dev",
```

- [ ] **Step 6: Commit final**

```bash
git add package.json
git commit -m "chore: add dev:landing script"
```
