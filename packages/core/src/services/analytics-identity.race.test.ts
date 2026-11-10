import { type AnalyticsAdapter, configureAnalytics } from './analytics';
import { subscribeAnalyticsIdentity } from './analytics-identity';

let authCallback: ((user: { id: string } | null) => void) | undefined;
const mockUnsubscribe = jest.fn();
let resolveExternalId: ((value: string | null) => void) | undefined;

jest.mock('./auth', () => ({
  onAuthUserChange: (callback: (user: { id: string } | null) => void) => {
    authCallback = callback;
    return mockUnsubscribe;
  },
}));

jest.mock('./establishment-owner', () => ({
  getCurrentUserExternalId: () =>
    new Promise<string | null>((resolve) => {
      resolveExternalId = resolve;
    }),
}));

function makeAdapter(): jest.Mocked<AnalyticsAdapter> {
  return {
    capturePageview: jest.fn(),
    captureEvent: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn().mockReturnValue(false),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Regra de negócio: lookup de identidade obsoleto não identifica', () => {
  it('logout antes do lookup resolver não re-identifica a sessão anônima', async () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);
    subscribeAnalyticsIdentity('u1');

    authCallback?.(null);
    resolveExternalId?.('ext-1');
    await flush();

    expect(adapter.reset).toHaveBeenCalledTimes(1);
    expect(adapter.identify).not.toHaveBeenCalled();
  });

  it('troca de conta antes do lookup resolver ignora o resultado antigo', async () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);
    subscribeAnalyticsIdentity('u1');
    const staleResolve = resolveExternalId;

    authCallback?.({ id: 'u2' });
    staleResolve?.('ext-1');
    resolveExternalId?.('ext-2');
    await flush();

    expect(adapter.identify).toHaveBeenCalledTimes(1);
    expect(adapter.identify).toHaveBeenCalledWith('ext-2');
  });
});

describe('Tratamento de erro: assinatura encerrada', () => {
  it('lookup que resolve depois do unsubscribe não identifica', async () => {
    const adapter = makeAdapter();
    configureAnalytics(adapter);
    const stop = subscribeAnalyticsIdentity('u1');

    stop();
    resolveExternalId?.('ext-1');
    await flush();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(adapter.identify).not.toHaveBeenCalled();
  });
});
