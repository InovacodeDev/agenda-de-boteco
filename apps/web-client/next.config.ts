import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/client',
  transpilePackages: ['@agenda/core'],
  // Recomendação da doc do Phosphor: sem isto o Next transpila os 9k+ módulos
  // do pacote a cada build do dev server.
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
};

export default config;
