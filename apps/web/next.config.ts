import type { NextConfig } from 'next';

// A origem do Supabase entra na CSP a partir da env pública. Sem ela, o
// connect-src sairia sem o banco e a CSP bloquearia as chamadas em silêncio —
// por isso o build de deploy falha alto em vez de publicar um site quebrado.
// Dev e CI (que buildam sem env, com o app degradando para mock) só avisam.
const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

if (!SUPABASE_ORIGIN) {
  const message =
    'NEXT_PUBLIC_SUPABASE_URL ausente: a CSP sairá sem a origem do Supabase e ' +
    'todas as chamadas ao banco serão bloqueadas pelo navegador.';
  if (process.env.VERCEL) {
    throw new Error(message);
  }
  console.warn(`[@agenda/web] ${message} Seguindo com dados de exemplo.`);
}

const SUPABASE_WS = SUPABASE_ORIGIN.replace(/^https:/, 'wss:');

// 'unsafe-inline'/'unsafe-eval' em script-src são exigidos pelo runtime do
// Next (bootstrap inline + hidratação); 'unsafe-eval' só no dev (Fast Refresh).
// Tiles do OpenStreetMap são carregados pelo Leaflet em img-src.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS} https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
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
  // geolocation=(self): o feed de proximidade depende dela.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const config: NextConfig = {
  basePath: '/app',
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  transpilePackages: ['@agenda/core'],
  // Recomendação da doc do Phosphor: sem isto o Next transpila os 9k+ módulos
  // do pacote a cada build do dev server.
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
};

export default config;
