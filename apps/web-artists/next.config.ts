import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/artists',
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  // O repo já tem AGENTS.md/CLAUDE.md próprios na raiz — evita duplicata genérica.
  agentRules: false,
  // Alias PT para a rota EN, mesmo padrao dos demais apps (issue #68).
  async redirects() {
    return [{ source: '/privacidade', destination: '/privacy', permanent: true }];
  },
};

export default config;
