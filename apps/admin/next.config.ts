import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/admin',
  transpilePackages: ['@agenda/core'],
};

export default config;
