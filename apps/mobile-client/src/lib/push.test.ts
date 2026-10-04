const mockSignOut = jest.fn();
jest.mock('@agenda/core', () => ({
  ...jest.requireActual('@agenda/core'),
  signOut: () => mockSignOut(),
  logErrorToTerminal: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

import { internalPathFromData, signOutAndUnregister } from './push';

describe('internalPathFromData', () => {
  it.each([
    [{ url: '/events/abc' }, '/events/abc'],
    [{ url: '/' }, '/'],
  ])('aceita rota interna %p', (data, expected) => {
    expect(internalPathFromData(data)).toBe(expected);
  });

  it.each([
    [null],
    ['/events'],
    [{}],
    [{ url: 42 }],
    [{ url: 'https://evil.example/x' }],
    [{ url: '//evil.example/x' }],
    [{ url: '/\\evil.example' }],
    [{ url: '/redirect?to=https://evil.example' }],
    [{ url: 'events/abc' }],
  ])('recusa %p', (data) => {
    expect(internalPathFromData(data)).toBeNull();
  });
});

describe('signOutAndUnregister', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it('chama signOut mesmo quando disablePush falha', async () => {
    jest
      .spyOn(
        jest.requireMock('expo-notifications') as { getPermissionsAsync: jest.Mock },
        'getPermissionsAsync',
      )
      .mockRejectedValueOnce(new Error('boom'));
    await signOutAndUnregister();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('chama signOut quando não há aparelho nativo', async () => {
    await signOutAndUnregister();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
