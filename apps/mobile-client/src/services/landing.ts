import {
  type AuthStatus,
  getOwnedEstablishmentId,
  isCurrentUserEstablishmentOwner,
} from '@agenda/core';

export type LandingTargetRoute = '/(painel)' | '/login' | '/onboarding';

const TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Auth check timed out')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}


export async function resolveLandingTargetRoute(status: AuthStatus): Promise<LandingTargetRoute> {
  if (status !== 'signedIn') {
    return '/login';
  }

  try {
    const isOwner = await withTimeout(isCurrentUserEstablishmentOwner(), TIMEOUT_MS);
    if (!isOwner) {
      return '/login';
    }

    const establishmentId = await withTimeout(getOwnedEstablishmentId(), TIMEOUT_MS);
    if (establishmentId) {
      return '/(painel)';
    }

    return '/onboarding';
  } catch {
    return '/login';
  }
}

