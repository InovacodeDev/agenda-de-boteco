import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/admin',
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  // Recomendação da doc do Phosphor: sem isto o Next transpila os 9k+ módulos
  // do pacote a cada build do dev server.
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  async redirects() {
    return [
      { source: '/avisos', destination: '/notices', permanent: true },
      { source: '/estabelecimentos', destination: '/establishments', permanent: true },
      { source: '/eventos', destination: '/events', permanent: true },
    ];
  },
};

export default config;
