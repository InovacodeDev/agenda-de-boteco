import { parseAuthTokensFromUrl } from './auth';

describe('parseAuthTokensFromUrl', () => {
  it('extrai tokens do fragmento da URL (fluxo implícito do Supabase)', () => {
    const url =
      'agenda-de-boteco://login#access_token=abc123&refresh_token=def456&token_type=bearer';
    expect(parseAuthTokensFromUrl(url)).toEqual({
      access_token: 'abc123',
      refresh_token: 'def456',
    });
  });

  it('extrai tokens da query string', () => {
    const url = 'agenda-de-boteco://login?access_token=abc&refresh_token=def';
    expect(parseAuthTokensFromUrl(url)).toEqual({
      access_token: 'abc',
      refresh_token: 'def',
    });
  });

  it('prioriza o fragmento quando ambos existem', () => {
    const url =
      'https://app.exemplo/login?access_token=daquery&refresh_token=daquery#access_token=dofrag&refresh_token=dofrag';
    expect(parseAuthTokensFromUrl(url)).toEqual({
      access_token: 'dofrag',
      refresh_token: 'dofrag',
    });
  });

  it('retorna null quando falta um dos tokens', () => {
    expect(
      parseAuthTokensFromUrl('agenda-de-boteco://login#access_token=abc'),
    ).toBeNull();
    expect(
      parseAuthTokensFromUrl('agenda-de-boteco://login#refresh_token=def'),
    ).toBeNull();
    expect(parseAuthTokensFromUrl('agenda-de-boteco://login')).toBeNull();
  });
});
