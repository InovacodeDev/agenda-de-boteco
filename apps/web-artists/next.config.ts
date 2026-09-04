import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/artists',
  transpilePackages: ['@agenda/core', '@agenda/shared-ui'],
  // O repo já tem AGENTS.md/CLAUDE.md próprios na raiz — evita duplicata genérica.
  agentRules: false,
};

export default config;
