/**
 * Leitura agnóstica de ambiente. Lê `NODE_ENV` via `globalThis` com um tipo
 * local, sem depender do global `process` (que exige @types/node) — assim
 * qualquer consumidor (mobile, web/Next, admin/Vite) typecheca sem configurar
 * os tipos do Node.
 */
const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env;

/** Verdadeiro quando rodando em produção (`NODE_ENV === 'production'`). */
export function isProduction(): boolean {
  return env?.NODE_ENV === 'production';
}
