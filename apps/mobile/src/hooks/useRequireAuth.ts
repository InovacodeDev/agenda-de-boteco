import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAuthStore } from '@/store/useAuthStore';

/**
 * Gate de ações que exigem conta (favoritar, avaliar): executa a ação
 * quando logado; caso contrário redireciona para o login.
 */
export function useRequireAuth(): (action: () => void) => void {
  const status = useAuthStore((state) => state.status);
  const router = useRouter();

  return useCallback(
    (action: () => void) => {
      if (status === 'signedIn') {
        action();
        return;
      }
      router.push('/login');
    },
    [status, router],
  );
}
