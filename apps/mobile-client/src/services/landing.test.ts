import {
  getOwnedEstablishmentId,
  isCurrentUserEstablishmentOwner,
} from '@agenda/core';

import { resolveLandingTargetRoute } from './landing';

jest.mock('@agenda/core', () => ({
  isCurrentUserEstablishmentOwner: jest.fn(),
  getOwnedEstablishmentId: jest.fn(),
}));

const mockIsOwner = isCurrentUserEstablishmentOwner as jest.MockedFunction<
  typeof isCurrentUserEstablishmentOwner
>;
const mockGetOwnedEstablishmentId = getOwnedEstablishmentId as jest.MockedFunction<
  typeof getOwnedEstablishmentId
>;

describe('resolveLandingTargetRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redireciona para /login quando o usuário está deslogado', async () => {
    const route = await resolveLandingTargetRoute('signedOut');
    expect(route).toBe('/login');
    expect(mockIsOwner).not.toHaveBeenCalled();
  });

  it('redireciona para /login quando a autenticação está indisponível', async () => {
    const route = await resolveLandingTargetRoute('unavailable');
    expect(route).toBe('/login');
    expect(mockIsOwner).not.toHaveBeenCalled();
  });

  it('redireciona para /login quando o usuário está autenticado mas não é dono de bar', async () => {
    mockIsOwner.mockResolvedValueOnce(false);

    const route = await resolveLandingTargetRoute('signedIn');
    expect(route).toBe('/login');
    expect(mockIsOwner).toHaveBeenCalledTimes(1);
    expect(mockGetOwnedEstablishmentId).not.toHaveBeenCalled();
  });

  it('redireciona para /(painel) quando o usuário é dono e já possui bar vinculado', async () => {
    mockIsOwner.mockResolvedValueOnce(true);
    mockGetOwnedEstablishmentId.mockResolvedValueOnce('bar-123');

    const route = await resolveLandingTargetRoute('signedIn');
    expect(route).toBe('/(painel)');
    expect(mockIsOwner).toHaveBeenCalledTimes(1);
    expect(mockGetOwnedEstablishmentId).toHaveBeenCalledTimes(1);
  });

  it('redireciona para /onboarding quando o usuário é dono mas ainda não cadastrou seu bar', async () => {
    mockIsOwner.mockResolvedValueOnce(true);
    mockGetOwnedEstablishmentId.mockResolvedValueOnce(null);

    const route = await resolveLandingTargetRoute('signedIn');
    expect(route).toBe('/onboarding');
    expect(mockIsOwner).toHaveBeenCalledTimes(1);
    expect(mockGetOwnedEstablishmentId).toHaveBeenCalledTimes(1);
  });

  it('redireciona para /login caso ocorra erro na checagem de perfil', async () => {
    mockIsOwner.mockRejectedValueOnce(new Error('Network error'));

    const route = await resolveLandingTargetRoute('signedIn');
    expect(route).toBe('/login');
  });

  it('redireciona para /login quando a checagem excede o tempo limite', async () => {
    jest.useFakeTimers();
    let mockTimer: ReturnType<typeof setTimeout> | undefined;
    mockIsOwner.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          mockTimer = setTimeout(() => resolve(true), 5000);
        }),
    );

    const routePromise = resolveLandingTargetRoute('signedIn');
    jest.advanceTimersByTime(3100);
    const route = await routePromise;

    if (mockTimer) {
      clearTimeout(mockTimer);
    }
    expect(route).toBe('/login');
    jest.useRealTimers();
  });
});

