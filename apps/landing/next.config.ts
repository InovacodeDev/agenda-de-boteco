import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@agenda/core'],
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
