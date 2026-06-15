import { redirectSystemPath } from '../../app/+native-intent';

describe('redirectSystemPath', () => {
  it('delega ao mapeamento para paths válidos', () => {
    expect(redirectSystemPath({ path: '/eventos/floripa/show', initial: true })).toBe(
      '/event/show',
    );
    expect(redirectSystemPath({ path: '/bares/floripa/boteco', initial: false })).toBe(
      '/establishment/boteco',
    );
  });

  it('preserva rotas internas conhecidas', () => {
    expect(redirectSystemPath({ path: '/profile', initial: false })).toBe('/profile');
  });

  it('cai no fallback "/" para paths desconhecidos', () => {
    expect(redirectSystemPath({ path: '/algo/que/nao/existe', initial: false })).toBe('/');
  });
});
