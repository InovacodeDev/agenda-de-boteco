import { mapWebPathToRoute } from '@/utils/deepLinks';

/**
 * Hook do expo-router para reescrever paths recebidos por deep link / intent
 * antes do roteamento. Delegamos ao util puro `mapWebPathToRoute`.
 *
 * Importante: lançar exceção aqui trava o cold start (recomendação da doc do
 * expo-router) — por isso qualquer erro cai no fallback `'/'`.
 *
 * Este arquivo NÃO é uma rota visível.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    return mapWebPathToRoute(path);
  } catch {
    return '/';
  }
}
