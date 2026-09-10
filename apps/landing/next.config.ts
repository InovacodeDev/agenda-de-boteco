import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  // O repo já tem AGENTS.md/CLAUDE.md próprios na raiz — evita duplicata genérica.
  agentRules: false,
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
