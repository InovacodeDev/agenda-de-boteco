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
};

export default config;
