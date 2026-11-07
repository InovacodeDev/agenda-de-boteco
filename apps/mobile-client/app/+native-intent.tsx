import { mapIncomingPathToRoute } from '@/utils/deepLinks';

/**
 * Reescreve o path do deep link antes do roteamento. Lançar aqui trava o cold
 * start (doc do expo-router), por isso qualquer falha cai em `'/'`.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return mapIncomingPathToRoute(path);
  } catch {
    return '/';
  }
}
