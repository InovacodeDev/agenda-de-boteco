import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/artists',
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
};

export default config;
