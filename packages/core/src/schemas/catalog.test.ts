import {
  citySchema,
  establishmentSchema,
  establishmentWriteSchema,
  eventSchema,
  eventStatusSchema,
  eventWriteSchema,
  notificationSchema,
  priceRangeSchema,
} from './catalog';

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

describe('Regra de negócio: schemas do catálogo', () => {
  it('preenche defaults do estabelecimento', () => {
    const parsed = establishmentSchema.parse(ESTABLISHMENT);

    expect(parsed.menu_items).toEqual([]);
    expect(parsed.attributes).toEqual([]);
    expect(parsed.menu_photo_urls).toEqual([]);
  });

  it('evento sem status é lido como publicado', () => {
    expect(eventSchema.parse(EVENT).status).toBe('published');
  });

  it.each(['draft', 'published'])('aceita status %s', (status) => {
    expect(eventStatusSchema.parse(status)).toBe(status);
  });

  it.each(['$', '$$', '$$$', '$$$$'])('aceita faixa de preço %s', (range) => {
    expect(priceRangeSchema.parse(range)).toBe(range);
  });

  it('descarta instagram_post_url inválido em vez de quebrar a leitura', () => {
    expect(eventSchema.parse({ ...EVENT, instagram_post_url: 'nao-e-url' }).instagram_post_url).toBeUndefined();
  });

  it('escrita de estabelecimento dispensa id e descarta campos derivados ou estranhos', () => {
    const { id: _id, ...withoutId } = ESTABLISHMENT;
    const parsed = establishmentWriteSchema.parse({ ...withoutId, is_admin: true, owner_id: 'x' });

    expect(parsed).not.toHaveProperty('rating_avg');
    expect(parsed).not.toHaveProperty('rating_count');
    expect(parsed).not.toHaveProperty('external_id');
    expect(parsed).not.toHaveProperty('is_admin');
    expect(parsed).not.toHaveProperty('owner_id');
  });

  it('escrita de evento dispensa id e external_id', () => {
    const { id: _id, external_id: _external, ...writable } = EVENT;

    expect(eventWriteSchema.safeParse(writable).success).toBe(true);
  });
});

describe('Tratamento de erro: dados inválidos do catálogo', () => {
  it.each([
    ['logo_url', 'not a url'],
    ['cover_url', '/caminho/relativo.png'],
  ])('rejeita %s fora do formato URL', (field, value) => {
    const result = establishmentSchema.safeParse({ ...ESTABLISHMENT, [field]: value });

    expect(result.success).toBe(false);
  });

  it('rejeita banner_url que não é URL', () => {
    expect(eventSchema.safeParse({ ...EVENT, banner_url: 'banner.png' }).success).toBe(false);
  });

  it('rejeita data sem fuso', () => {
    expect(eventSchema.safeParse({ ...EVENT, starts_at: '2026-11-07 22:00' }).success).toBe(false);
  });

  it('rejeita entrada negativa', () => {
    expect(eventSchema.safeParse({ ...EVENT, cover_charge: -1 }).success).toBe(false);
  });

  it('rejeita status fora do enum', () => {
    expect(eventStatusSchema.safeParse('archived').success).toBe(false);
  });

  it('rejeita UF com tamanho diferente de 2', () => {
    const result = citySchema.safeParse({ id: 'x', name: 'X', uf: 'SCC', lat: 0, lng: 0 });

    expect(result.success).toBe(false);
  });

  it('rejeita estabelecimento sem nome', () => {
    const { name: _name, ...withoutName } = ESTABLISHMENT;
    const result = establishmentSchema.safeParse(withoutName);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
    }
  });

  it('rejeita notificação com tipo desconhecido', () => {
    const result = notificationSchema.safeParse({
      id: 'n1',
      title: 't',
      body: 'b',
      type: 'spam',
      created_at: '2026-11-07T10:00:00Z',
      read: false,
    });

    expect(result.success).toBe(false);
  });
});
