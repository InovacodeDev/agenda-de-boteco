import { redirectSystemPath } from '../../app/+native-intent';
import { mapIncomingPathToRoute } from './deepLinks';

describe('mapIncomingPathToRoute', () => {
  it('direciona URLs de recuperação para /new-password e normaliza paths de auth fora da allowlist', () => {
    const recovery = '/#access_token=at&refresh_token=rt&type=recovery';
    expect(mapIncomingPathToRoute(recovery)).toBe(
      '/new-password#access_token=at&refresh_token=rt&type=recovery',
    );
    expect(mapIncomingPathToRoute('/?code=abc')).toBe('/?code=abc');
    expect(mapIncomingPathToRoute('/login#access_token=at&refresh_token=rt')).toBe(
      '/login#access_token=at&refresh_token=rt',
    );
    expect(mapIncomingPathToRoute('/client/login#access_token=at&refresh_token=rt')).toBe(
      '/#access_token=at&refresh_token=rt',
    );
    expect(mapIncomingPathToRoute('/events/../../etc?code=1')).toBe('/?code=1');
  });

  it('preserva rotas conhecidas do painel e telas públicas', () => {
    expect(mapIncomingPathToRoute('/events')).toBe('/events');
    expect(mapIncomingPathToRoute('/events/new')).toBe('/events/new');
    expect(mapIncomingPathToRoute('/settings/')).toBe('/settings/');
    expect(mapIncomingPathToRoute('/new-password')).toBe('/new-password');
    expect(mapIncomingPathToRoute('/privacy?from=mail')).toBe('/privacy?from=mail');
  });

  it('aceita edição de evento só com id bem formado', () => {
    expect(mapIncomingPathToRoute('/events/2b1c-9f')).toBe('/events/2b1c-9f');
    expect(mapIncomingPathToRoute('/events/../../etc')).toBe('/');
    expect(mapIncomingPathToRoute('/events/a/b')).toBe('/');
  });

  it('manda paths desconhecidos para a home', () => {
    expect(mapIncomingPathToRoute('/admin')).toBe('/');
    expect(mapIncomingPathToRoute('/event/abc')).toBe('/');
  });
});

describe('redirectSystemPath', () => {
  it('delega ao mapeamento', () => {
    expect(redirectSystemPath({ path: '/metrics', initial: true })).toBe('/metrics');
    expect(redirectSystemPath({ path: '/nao-existe', initial: false })).toBe('/');
  });
});
