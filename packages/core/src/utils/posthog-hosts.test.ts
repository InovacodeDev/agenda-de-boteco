import { postHogUiHost } from './posthog-hosts';

describe('Regra de negócio: postHogUiHost', () => {
  it('mapeia o host de ingestão US para a UI US', () => {
    expect(postHogUiHost('https://us.i.posthog.com')).toBe('https://us.posthog.com');
  });

  it('mapeia o host de ingestão EU para a UI EU', () => {
    expect(postHogUiHost('https://eu.i.posthog.com')).toBe('https://eu.posthog.com');
  });

  it('ignora barra final e espaços', () => {
    expect(postHogUiHost(' https://us.i.posthog.com/ ')).toBe('https://us.posthog.com');
  });
});

describe('Tratamento de erro: postHogUiHost', () => {
  it('devolve undefined sem host', () => {
    expect(postHogUiHost(undefined)).toBeUndefined();
    expect(postHogUiHost('')).toBeUndefined();
  });

  it('devolve undefined para proxy próprio', () => {
    expect(postHogUiHost('https://ph.example.com')).toBeUndefined();
  });
});
