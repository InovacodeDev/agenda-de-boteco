import { redirectSystemPath } from '../../app/+native-intent';
import { mapIncomingPathToRoute } from './deepLinks';

describe('mapIncomingPathToRoute', () => {
  it('mantém URLs de auth intactas para o handler de sessão', () => {
    const recovery = '/#access_token=at&refresh_token=rt&type=recovery';
    expect(mapIncomingPathToRoute(recovery)).toBe(recovery);
    expect(mapIncomingPathToRoute('/?code=abc')).toBe('/?code=abc');
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
