import { buildDirectionsUrl, buildWhatsAppUrl } from './links';

describe('buildDirectionsUrl', () => {
  it('monta a URL universal do Google Maps com lat,lng', () => {
    expect(buildDirectionsUrl({ lat: -27.5915, lng: -48.5234 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-27.5915,-48.5234',
    );
  });

  it('ignora o label na URL (apenas informativo)', () => {
    expect(
      buildDirectionsUrl({ lat: -27.5915, lng: -48.5234, label: 'Boteco do Zé' }),
    ).toBe('https://www.google.com/maps/dir/?api=1&destination=-27.5915,-48.5234');
  });
});

describe('buildWhatsAppUrl', () => {
  it('monta o link wa.me sem texto', () => {
    expect(buildWhatsAppUrl('5548999990001')).toBe('https://wa.me/5548999990001');
  });

  it('anexa ?text= URL-encoded quando fornecido', () => {
    expect(buildWhatsAppUrl('5548999990001', 'Olá, quero reservar')).toBe(
      'https://wa.me/5548999990001?text=Ol%C3%A1%2C%20quero%20reservar',
    );
  });

  it('não anexa ?text= para string vazia', () => {
    expect(buildWhatsAppUrl('5548999990001', '')).toBe(
      'https://wa.me/5548999990001',
    );
  });
});
