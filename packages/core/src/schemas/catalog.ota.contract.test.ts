import {
  establishmentSchema,
  establishmentWriteSchema,
  eventSchema,
  eventWriteSchema,
  notificationReadSchema,
  notificationWriteSchema,
} from './catalog';

const baseEstablishment = {
  id: 'est-1',
  external_id: '11111111-2222-4333-8444-555555555555',
  name: 'Bar do Zé',
  description: 'Boteco tradicional',
  logo_url: '',
  cover_url: '',
  address: 'Rua A, 10',
  neighborhood: 'Centro',
  city_id: 'fln',
  lat: -27.59,
  lng: -48.54,
  whatsapp: '48999999999',
  opening_hours: 'Seg-Sex 18h-00h',
  menu_items: [],
  price_range: '$$',
  ambiance: 'Descontraído',
  rating_avg: 4.5,
  rating_count: 10,
  attributes: ['pet-friendly'],
};

const baseEvent = {
  id: 'ev-1',
  external_id: '22222222-3333-4444-8555-666666666666',
  name: 'Samba na Calçada',
  attraction: 'Grupo Raiz',
  description: 'Roda de samba',
  banner_url: '',
  photo_urls: [],
  music_style_ids: ['samba'],
  establishment_id: 'est-1',
  starts_at: '2026-11-07T20:00:00.000Z',
  ends_at: '2026-11-07T23:59:00.000Z',
  cover_charge: 0,
};

const baseNotification = {
  id: 'not-1',
  title: 'Novo evento',
  body: 'Confira a agenda de hoje',
  type: 'promo',
  created_at: '2026-11-07T12:00:00.000Z',
  read: false,
};

describe('Regra de negócio: tolerância de leitura de enums para compatibilidade OTA', () => {
  it('filters unknown attributes while preserving known ones in establishmentSchema', () => {
    const parsed = establishmentSchema.parse({
      ...baseEstablishment,
      attributes: ['pet-friendly', 'rooftop-new'],
    });
    expect(parsed.attributes).toEqual(['pet-friendly']);
  });

  it('falls back unknown price_range to null in establishmentSchema', () => {
    const parsed = establishmentSchema.parse({
      ...baseEstablishment,
      price_range: '$$$$$',
    });
    expect(parsed.price_range).toBeNull();
  });

  it('falls back unknown event status to draft while missing status defaults to published', () => {
    const unknownStatus = eventSchema.parse({
      ...baseEvent,
      status: 'archived',
    });
    expect(unknownStatus.status).toBe('draft');

    const missingStatus = eventSchema.parse(baseEvent);
    expect(missingStatus.status).toBe('published');
  });

  it('falls back unknown notification type to promo on read', () => {
    const parsed = notificationReadSchema.parse({
      ...baseNotification,
      type: 'artist',
    });
    expect(parsed.type).toBe('promo');
  });

  it('keeps establishmentWriteSchema accepting known attributes', () => {
    const parsed = establishmentWriteSchema.parse({
      ...baseEstablishment,
      attributes: ['pet-friendly', 'live-music'],
    });
    expect(parsed.attributes).toEqual(['pet-friendly', 'live-music']);
  });
});

describe('Tratamento de erro: schemas de escrita permanecem estritos', () => {
  it('rejects unknown enum values on write', () => {
    expect(
      establishmentWriteSchema.safeParse({
        ...baseEstablishment,
        attributes: ['rooftop-new'],
      }).success,
    ).toBe(false);
    expect(
      establishmentWriteSchema.safeParse({
        ...baseEstablishment,
        price_range: '$$$$$',
      }).success,
    ).toBe(false);
    expect(
      eventWriteSchema.safeParse({
        ...baseEvent,
        status: 'archived',
      }).success,
    ).toBe(false);
    expect(
      notificationWriteSchema.safeParse({
        ...baseNotification,
        type: 'artist',
      }).success,
    ).toBe(false);
  });
});
