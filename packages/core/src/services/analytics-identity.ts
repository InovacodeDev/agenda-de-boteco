import { identifyAnalyticsUser, resetAnalytics } from './analytics';
import { onAuthUserChange } from './auth';
import { getCurrentUserExternalId } from './establishment-owner';

/**
 * Identifica por `external_id` (nunca `auth.uid()`), o mesmo distinct_id do
 * mobile-client: o dono vira uma pessoa só no PostHog. Também identifica na
 * assinatura quando já há usuário persistido, porque o primeiro evento de auth
 * com o mesmo id não dispararia identificação. Falha é engolida: analytics não
 * pode quebrar a sessão.
 */
export function subscribeAnalyticsIdentity(initialUserId: string | null): () => void {
  let lastUserId = initialUserId;

  const identify = (): void => {
    void getCurrentUserExternalId()
      .then((externalId) => {
        if (externalId) {
          identifyAnalyticsUser(externalId);
        }
      })
      .catch(() => undefined);
  };

  if (initialUserId !== null) {
    identify();
  }

  return onAuthUserChange((user) => {
    const nextUserId = user?.id ?? null;
    if (nextUserId !== null && nextUserId !== lastUserId) {
      identify();
    } else if (nextUserId === null && lastUserId !== null) {
      resetAnalytics();
    }
    lastUserId = nextUserId;
  });
}
