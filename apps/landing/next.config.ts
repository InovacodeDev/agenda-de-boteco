import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  async redirects() {
    return [
      {
        source: '/suporte',
        destination: '/support',
        permanent: true,
      },
    ];
  },
};

export default config;
