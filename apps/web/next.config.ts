import type { NextConfig } from 'next';

import { BASE_PATH } from './lib/basePath';

const config: NextConfig = {
  basePath: BASE_PATH,
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  // Recomendação da doc do Phosphor: sem isto o Next transpila os 9k+ módulos
  // do pacote a cada build do dev server.
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  // Convivência das rotas migradas PT → EN (issue #68). basePath já é
  // aplicado pelo Next em source/destination — não duplicar aqui.
  async redirects() {
    return [
      { source: '/mapa', destination: '/map', permanent: true },
      { source: '/avisos', destination: '/notices', permanent: true },
      { source: '/favoritos', destination: '/favorites', permanent: true },
      { source: '/cidade', destination: '/city', permanent: true },
      { source: '/perfil', destination: '/profile', permanent: true },
    ];
  },
};

export default config;
