import { withPostHogConfig } from '@posthog/nextjs-config';
import type { NextConfig } from 'next';

// A origem do Supabase entra na CSP a partir da env pública. Sem ela, o
// connect-src sairia sem o banco e a CSP bloquearia o envio do formulário em
// silêncio. Build de deploy falha alto; dev e CI (que buildam sem env) só avisam.
const SUPABASE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');

if (!SUPABASE_ORIGIN) {
  const message =
    'NEXT_PUBLIC_SUPABASE_URL ausente: a CSP sairá sem a origem do Supabase e ' +
    'todas as chamadas ao banco serão bloqueadas pelo navegador.';
  if (process.env.VERCEL) {
    throw new Error(message);
  }
  console.warn(`[@agenda/web-artists] ${message} Cadastro ficará sem envio.`);
}

const SUPABASE_WS = SUPABASE_ORIGIN.replace(/^http/, 'ws');

// posthog-js fala com o api_host e baixa extensões (surveys, replay) de
// *.posthog.com; o host da env cobre um reverse proxy próprio.
const POSTHOG_ORIGINS = `${process.env.NEXT_PUBLIC_POSTHOG_HOST ?? ''} https://*.posthog.com`;

// Proxy first-party do PostHog: o browser fala com /artists/ingest, o que escapa
// de adblocker e mantém a CSP em 'self'. Inline porque o next.config não pode
// importar @agenda/core (o index puxa React). Sem a env, não há destino: sem rewrite.
const POSTHOG_INGEST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '').replace(/\/+$/, '');
const POSTHOG_ASSETS = POSTHOG_INGEST.replace('://us.i.', '://us-assets.i.').replace(
  '://eu.i.',
  '://eu-assets.i.',
);

// 'unsafe-inline'/'unsafe-eval' em script-src são exigidos pelo runtime do
// Next (bootstrap inline + hidratação); 'unsafe-eval' só no dev (Fast Refresh).
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} ${POSTHOG_ORIGINS}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN} https://*.supabase.co https:`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS} https://*.supabase.co wss://*.supabase.co ${POSTHOG_ORIGINS}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .join('; ')
  .replace(/\s+/g, ' ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const config: NextConfig = {
  basePath: '/artists',
  skipTrailingSlashRedirect: true,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    if (!POSTHOG_INGEST) return [];
    return [
      { source: '/ingest/static/:path*', destination: `${POSTHOG_ASSETS}/static/:path*` },
      { source: '/ingest/:path*', destination: `${POSTHOG_INGEST}/:path*` },
    ];
  },
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  // O repo já tem AGENTS.md/CLAUDE.md próprios na raiz — evita duplicata genérica.
  agentRules: false,
  // Alias PT para a rota EN, mesmo padrao dos demais apps (issue #68).
  async redirects() {
    return [{ source: '/privacidade', destination: '/privacy', permanent: true }];
  },
};

// O wrapper do PostHog exige personalApiKey/projectId quando ativo; por isso só
// entra no build de produção da Vercel com as duas envs (server-only, nunca NEXT_PUBLIC_).
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const UPLOAD_SOURCEMAPS =
  process.env.VERCEL_ENV === 'production' && POSTHOG_API_KEY && POSTHOG_PROJECT_ID;

export default UPLOAD_SOURCEMAPS
  ? withPostHogConfig(config, {
      personalApiKey: POSTHOG_API_KEY,
      projectId: POSTHOG_PROJECT_ID,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      sourcemaps: {
        enabled: true,
        releaseName: '@agenda/web-artists',
        releaseVersion: process.env.VERCEL_GIT_COMMIT_SHA,
        deleteAfterUpload: true,
      },
    })
  : config;
