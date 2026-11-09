import { type AnalyticsAdapter, configureAnalytics } from './analytics';
import { subscribeAnalyticsIdentity } from './analytics-identity';

type AuthCallback = (user: { id: string } | null) => void;

let authCallback: AuthCallback | null = null;
const mockUnsubscribe = jest.fn();
const mockGetExternalId = jest.fn();

jest.mock('./auth', () => ({
  onAuthUserChange: (callback: AuthCallback) => {
    authCallback = callback;
    return mockUnsubscribe;
  },
}));

jest.mock('./establishment-owner', () => ({
  getCurrentUserExternalId: () => mockGetExternalId(),
}));

const identify = jest.fn();
const reset = jest.fn();

function emit(user: { id: string } | null): void {
  if (!authCallback) {
    throw new Error('onAuthUserChange não foi assinado');
  }
  authCallback(user);
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  authCallback = null;
  jest.clearAllMocks();
  mockGetExternalId.mockResolvedValue('ext-1');
  const adapter: AnalyticsAdapter = {
    capturePageview: jest.fn(),
    captureEvent: jest.fn(),
    identify,
    reset,
    isFeatureEnabled: () => false,
    onFeatureFlags: () => () => undefined,
  };
  configureAnalytics(adapter);
});

afterAll(() => {
  configureAnalytics(null);
});

describe('Regra de negócio: identidade de analytics por external_id', () => {
  it('identifica uma vez na assinatura quando já há usuário persistido', async () => {
    subscribeAnalyticsIdentity('u1');
    await flush();
    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith('ext-1');
  });

  it('não identifica na assinatura sem usuário', async () => {
    subscribeAnalyticsIdentity(null);
    await flush();
    expect(identify).not.toHaveBeenCalled();
  });

  it('identifica de novo ao trocar para outro id', async () => {
    subscribeAnalyticsIdentity('u1');
    await flush();
    mockGetExternalId.mockResolvedValue('ext-2');
    emit({ id: 'u2' });
    await flush();
    expect(identify).toHaveBeenLastCalledWith('ext-2');
    expect(identify).toHaveBeenCalledTimes(2);
  });

  it('não reidentifica quando o evento traz o mesmo id', async () => {
    subscribeAnalyticsIdentity('u1');
    await flush();
    emit({ id: 'u1' });
    await flush();
    expect(identify).toHaveBeenCalledTimes(1);
  });

  it('reseta uma vez no logout e não duplica o reset', () => {
    subscribeAnalyticsIdentity('u1');
    emit(null);
    emit(null);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('o retorno chama o unsubscribe de onAuthUserChange', () => {
    const unsubscribe = subscribeAnalyticsIdentity(null);
    unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('Tratamento de erro: falha ao resolver o external_id', () => {
  it('engole a rejeição sem lançar e sem identificar', async () => {
    mockGetExternalId.mockRejectedValue(new Error('rede'));
    expect(() => subscribeAnalyticsIdentity('u1')).not.toThrow();
    await flush();
    expect(identify).not.toHaveBeenCalled();
  });

  it('não identifica quando o external_id é null', async () => {
    mockGetExternalId.mockResolvedValue(null);
    subscribeAnalyticsIdentity('u1');
    await flush();
    expect(identify).not.toHaveBeenCalled();
  });
});
