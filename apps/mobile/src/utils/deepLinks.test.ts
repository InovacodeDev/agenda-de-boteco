import { mapWebPathToRoute } from './deepLinks';

describe('mapWebPathToRoute', () => {
  describe('reescrita de paths web slug-based', () => {
    it('mapeia /eventos/{cidade}/{slug} → /event/{slug}', () => {
      expect(mapWebPathToRoute('/eventos/floripa/samba-na-varanda')).toBe(
        '/event/samba-na-varanda',
      );
    });

    it('mapeia /bares/{cidade}/{slug} → /establishment/{slug}', () => {
      expect(mapWebPathToRoute('/bares/floripa/boteco-do-ze')).toBe(
        '/establishment/boteco-do-ze',
      );
    });

    it('mapeia /eventos/{slug} (sem cidade) → /event/{slug}', () => {
      expect(mapWebPathToRoute('/eventos/samba-na-varanda')).toBe(
        '/event/samba-na-varanda',
      );
    });

    it('mapeia /bares/{slug} (sem cidade) → /establishment/{slug}', () => {
      expect(mapWebPathToRoute('/bares/boteco-do-ze')).toBe(
        '/establishment/boteco-do-ze',
      );
    });

    it('mapeia /events/{cidade}/{slug} (path novo) → /event/{slug}', () => {
      expect(mapWebPathToRoute('/events/floripa/samba-na-varanda')).toBe(
        '/event/samba-na-varanda',
      );
    });

    it('mapeia /establishments/{cidade}/{slug} (path novo) → /establishment/{slug}', () => {
      expect(mapWebPathToRoute('/establishments/floripa/boteco-do-ze')).toBe(
        '/establishment/boteco-do-ze',
      );
    });

    it('mapeia /events/{slug} (path novo, sem cidade) → /event/{slug}', () => {
      expect(mapWebPathToRoute('/events/samba-na-varanda')).toBe(
        '/event/samba-na-varanda',
      );
    });

    it('mapeia /establishments/{slug} (path novo, sem cidade) → /establishment/{slug}', () => {
      expect(mapWebPathToRoute('/establishments/boteco-do-ze')).toBe(
        '/establishment/boteco-do-ze',
      );
    });
  });

  describe('paths que já são rotas internas conhecidas passam intactos', () => {
    it('preserva /event/e1 (deep link de scheme já casa com a rota)', () => {
      expect(mapWebPathToRoute('/event/e1')).toBe('/event/e1');
    });

    it('preserva /establishment/e1', () => {
      expect(mapWebPathToRoute('/establishment/e1')).toBe('/establishment/e1');
    });

    it('preserva a home /', () => {
      expect(mapWebPathToRoute('/')).toBe('/');
    });

    it('preserva /city', () => {
      expect(mapWebPathToRoute('/city')).toBe('/city');
    });

    it('preserva demais rotas de nível superior', () => {
      for (const route of [
        '/login',
        '/onboarding',
        '/favorites',
        '/notifications',
        '/map',
        '/profile',
      ]) {
        expect(mapWebPathToRoute(route)).toBe(route);
      }
    });

    it('preserva /privacy e /delete-account (rotas novas)', () => {
      expect(mapWebPathToRoute('/privacy')).toBe('/privacy');
      expect(mapWebPathToRoute('/delete-account')).toBe('/delete-account');
    });

    it('preserva /privacidade e /excluir-conta (alias das rotas antigas)', () => {
      expect(mapWebPathToRoute('/privacidade')).toBe('/privacidade');
      expect(mapWebPathToRoute('/excluir-conta')).toBe('/excluir-conta');
    });
  });

  describe('URLs de auth passam intactas', () => {
    it('preserva URL com access_token (não interceptar fluxo de auth)', () => {
      const url = 'agenda-de-boteco://login#access_token=abc&refresh_token=xyz';
      expect(mapWebPathToRoute(url)).toBe(url);
    });

    it('preserva URL com refresh_token na query', () => {
      const url = '/auth/callback?refresh_token=xyz';
      expect(mapWebPathToRoute(url)).toBe(url);
    });

    it('preserva URL OAuth com code', () => {
      const url = '/auth/callback?code=123abc';
      expect(mapWebPathToRoute(url)).toBe(url);
    });

    it('não reescreve /eventos quando há tokens de auth na URL', () => {
      const url = '/eventos/floripa/samba?access_token=abc';
      expect(mapWebPathToRoute(url)).toBe(url);
    });
  });

  describe('query strings preservadas em rotas internas', () => {
    it('preserva a query string de um path interno conhecido', () => {
      expect(mapWebPathToRoute('/city?cidade=floripa')).toBe('/city?cidade=floripa');
    });

    it('preserva a query string de /event/{id}', () => {
      expect(mapWebPathToRoute('/event/e1?from=share')).toBe('/event/e1?from=share');
    });
  });

  describe('paths desconhecidos → home', () => {
    it('mapeia path desconhecido para /', () => {
      expect(mapWebPathToRoute('/qualquer/coisa')).toBe('/');
    });

    it('mapeia segmento único desconhecido para /', () => {
      expect(mapWebPathToRoute('/desconhecido')).toBe('/');
    });

    // /filters deixou de ser rota (virou componente no feed) — cai na home.
    it('mapeia /filters para / (não é mais rota)', () => {
      expect(mapWebPathToRoute('/filters')).toBe('/');
    });
  });

  describe('robustez de barras e segmentos', () => {
    it('trata barra final em path web slug-based', () => {
      expect(mapWebPathToRoute('/eventos/floripa/samba/')).toBe('/event/samba');
    });

    it('trata barras duplicadas em path web slug-based', () => {
      expect(mapWebPathToRoute('/eventos//floripa//boteco')).toBe('/event/boteco');
    });

    it('trata path sem barra inicial', () => {
      expect(mapWebPathToRoute('eventos/floripa/samba')).toBe('/event/samba');
    });
  });
});
