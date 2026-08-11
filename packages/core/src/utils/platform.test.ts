import { detectPlatform } from './platform';

describe('detectPlatform', () => {
  it('retorna união de 3 literais', () => {
    const r = detectPlatform('');
    expect(['android', 'ios', 'other']).toContain(r);
  });

  it('detecta Android', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';
    expect(detectPlatform(ua)).toBe('android');
  });

  it('detecta iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(detectPlatform(ua)).toBe('ios');
  });

  it('detecta iPad', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(detectPlatform(ua)).toBe('ios');
  });

  it('detecta iPod', () => {
    expect(detectPlatform('Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
  });

  it('desktop → other', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
    expect(detectPlatform(ua)).toBe('other');
  });

  it('string vazia → other', () => {
    expect(detectPlatform('')).toBe('other');
  });

  it('android tem prioridade sobre iphone se ambos aparecerem', () => {
    expect(detectPlatform('android iphone')).toBe('android');
  });
});
