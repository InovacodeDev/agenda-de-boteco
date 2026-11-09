import { identifyAnalyticsUser, resetAnalytics } from './analytics';
import { onAuthUserChange } from './auth';
import { getCurrentUserExternalId } from './establishment-owner';

/**
 * Identifica por `external_id` (nunca `auth.uid()`), o mesmo distinct_id do
 * mobile-client: o dono vira uma pessoa só no PostHog. Também identifica na
 * assinatura quando já há usuário persistido, porque o primeiro evento de auth
 * com o mesmo id não dispararia identificação. Falha é engolida: analytics não
 * pode quebrar a sessão. O lookup assíncrono só identifica se o usuário que o
 * pediu ainda é o atual e a assinatura segue ativa — senão um logout no meio do
 * caminho re-identificaria a sessão anônima seguinte.
 */
export function subscribeAnalyticsIdentity(initialUserId: string | null): () => void {
  let lastUserId = initialUserId;
  let active = true;

  const identify = (requestedUserId: string): void => {
    void getCurrentUserExternalId()
      .then((externalId) => {
        if (externalId && active && lastUserId === requestedUserId) {
          identifyAnalyticsUser(externalId);
        }
      })
      .catch(() => undefined);
  };

  if (initialUserId !== null) {
    identify(initialUserId);
  }

  const unsubscribe = onAuthUserChange((user) => {
    const nextUserId = user?.id ?? null;
    const previousUserId = lastUserId;
    lastUserId = nextUserId;
    if (nextUserId !== null && nextUserId !== previousUserId) {
      identify(nextUserId);
    } else if (nextUserId === null && previousUserId !== null) {
      resetAnalytics();
    }
  });

  return () => {
    active = false;
    unsubscribe();
  };
}
