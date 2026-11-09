import { establishmentSchema, eventSchema } from './catalog';

const UUID = '6f1c2b8e-3b1a-4c7d-9e2f-0a1b2c3d4e5f';

const ESTABLISHMENT = {
  id: 'bar-1',
  external_id: UUID,
  name: 'Bar do Zé',
  description: 'Boteco raiz',
  logo_url: '',
  cover_url: 'https://cdn.example/cover.png',
  address: 'Rua A, 1',
  neighborhood: 'Centro',
  city_id: 'florianopolis',
  lat: -27.59,
  lng: -48.55,
  whatsapp: '48999990000',
  opening_hours: '18h-02h',
  price_range: '$$',
  ambiance: 'Descontraído',
  rating_avg: 4.2,
  rating_count: 10,
};

const EVENT = {
  id: 'evt-1',
  external_id: UUID,
  name: 'Sexta do Sertanejo',
  attraction: 'Duo',
  description: 'Show',
  banner_url: '',
  music_style_ids: ['sertanejo'],
  establishment_id: 'bar-1',
  starts_at: '2026-11-07T22:00:00-03:00',
  ends_at: '2026-11-08T02:00:00-03:00',
  cover_charge: 0,
};

describe('Regra de negócio: URLs http/https nos schemas do catálogo', () => {
  it('aceita URLs http e https válidas em todos os campos de mídia', () => {
    const parsedEst = establishmentSchema.parse({
      ...ESTABLISHMENT,
      logo_url: 'https://cdn.example/logo.png',
      cover_url: 'http://cdn.example/cover.png',
      menu_pdf_url: 'https://cdn.example/menu.pdf',
      menu_photo_urls: ['https://cdn.example/p1.png'],
    });
    const parsedEvt = eventSchema.parse({
      ...EVENT,
      banner_url: 'https://cdn.example/banner.png',
      photo_urls: ['https://cdn.example/e1.png'],
      instagram_post_url: 'https://instagram.com/p/abc',
    });

    expect(parsedEst.menu_pdf_url).toBe('https://cdn.example/menu.pdf');
    expect(parsedEvt.instagram_post_url).toBe('https://instagram.com/p/abc');
  });
});

describe('Tratamento de erro: bloqueio de esquemas perigosos (anti-XSS)', () => {
  it.each([
    ['logo_url', 'javascript:alert(1)'],
    ['cover_url', 'javascript:alert(1)'],
    ['menu_pdf_url', 'javascript:alert(1)'],
    ['logo_url', 'data:text/html,<script>alert(1)</script>'],
  ])('rejeita %s com URI não-http (%s)', (field, value) => {
    expect(establishmentSchema.safeParse({ ...ESTABLISHMENT, [field]: value }).success).toBe(false);
  });

  it('rejeita menu_photo_urls com URI javascript:', () => {
    expect(
      establishmentSchema.safeParse({
        ...ESTABLISHMENT,
        menu_photo_urls: ['javascript:alert(1)'],
      }).success,
    ).toBe(false);
  });

  it('rejeita banner_url e photo_urls com URI javascript: e descarta instagram_post_url malicioso', () => {
    expect(eventSchema.safeParse({ ...EVENT, banner_url: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(
      eventSchema.safeParse({ ...EVENT, photo_urls: ['javascript:alert(1)'] }).success,
    ).toBe(false);
    expect(
      eventSchema.parse({ ...EVENT, instagram_post_url: 'javascript:alert(1)' }).instagram_post_url,
    ).toBeUndefined();
  });
});
