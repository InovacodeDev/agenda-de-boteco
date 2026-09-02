import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/client',
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
      { source: '/avaliacoes', destination: '/reviews', permanent: true },
      { source: '/artistas', destination: '/artists', permanent: true },
      { source: '/configuracoes', destination: '/settings', permanent: true },
      { source: '/nova-senha', destination: '/new-password', permanent: true },
    ];
  },
};

export default config;
