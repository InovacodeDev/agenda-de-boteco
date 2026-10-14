import type { NextConfig } from 'next';

// posthog-js fala com o api_host e baixa extensões (surveys, replay) de
// *.posthog.com; o host da env cobre um reverse proxy próprio.
const POSTHOG_ORIGINS = `${process.env.NEXT_PUBLIC_POSTHOG_HOST ?? ''} https://*.posthog.com`;

// Landing é estática: sem Supabase e sem mapa; só o PostHog sai para fora.
// 'unsafe-inline'/'unsafe-eval' em script-src são exigidos pelo runtime do
// Next (bootstrap inline + hidratação); 'unsafe-eval' só no dev (Fast Refresh).
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} ${POSTHOG_ORIGINS}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${POSTHOG_ORIGINS}`,
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
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // O repo já tem AGENTS.md/CLAUDE.md próprios na raiz — evita duplicata genérica.
  agentRules: false,
  async redirects() {
    return [
      {
        source: '/suporte',
        destination: '/support',
        permanent: true,
      },
    ];
  },
};

export default config;
