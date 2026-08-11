import { buildUnsplashUrl } from './images';

describe('buildUnsplashUrl', () => {
  it('monta a URL exata com defaults w=1200 h=700', () => {
    expect(buildUnsplashUrl('1546195643-70f48f9c5b87')).toBe(
      'https://images.unsplash.com/photo-1546195643-70f48f9c5b87?auto=format&fit=crop&w=1200&h=700&q=80',
    );
  });

  it('aceita largura e altura customizadas', () => {
    expect(buildUnsplashUrl('abc123', 200, 200)).toBe(
      'https://images.unsplash.com/photo-abc123?auto=format&fit=crop&w=200&h=200&q=80',
    );
  });

  it('permite sobrescrever apenas a largura', () => {
    expect(buildUnsplashUrl('abc123', 800)).toBe(
      'https://images.unsplash.com/photo-abc123?auto=format&fit=crop&w=800&h=700&q=80',
    );
  });
});
