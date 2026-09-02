import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
};

export default config;
