import type { ZodError } from 'zod';

// Mapeia issues do zod para { campoTopo: mensagem }, usado pelos Fields.
// Só o primeiro nível do path importa (os forms são flat).
export function issuesToErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
