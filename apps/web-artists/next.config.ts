import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/artists',
  transpilePackages: ['@agenda/core'],
};

export default config;
