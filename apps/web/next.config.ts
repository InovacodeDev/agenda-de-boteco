import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/app',
  transpilePackages: ['@agenda/core'],
};

export default config;
