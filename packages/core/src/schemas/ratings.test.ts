import {
  establishmentRatingSchema,
  establishmentRatingsSummarySchema,
  ratingValueSchema,
  upsertEstablishmentRatingSchema,
} from './ratings';

const RATING = {
  id: '6f1c2b8e-3b1a-4c7d-9e2f-0a1b2c3d4e5f',
  establishment_id: 'bar-1',
  user_id: null,
  rating: 4,
  created_at: '2026-11-07T10:00:00Z',
  updated_at: '2026-11-07T10:00:00Z',
};

describe('Regra de negócio: avaliações de estabelecimento', () => {
  it.each([1, 2, 3, 4, 5])('aceita nota inteira %i', (value) => {
    expect(ratingValueSchema.parse(value)).toBe(value);
  });

  it('aceita avaliação anônima (user_id nulo)', () => {
    expect(establishmentRatingSchema.parse(RATING)).toEqual(RATING);
  });

  it('aceita resumo com média e distribuição', () => {
    const summary = { avg: 4.5, count: 2, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } };

    expect(establishmentRatingsSummarySchema.parse(summary)).toEqual(summary);
  });

  it('descarta user_id enviado no upsert (a sessão define o autor)', () => {
    const parsed = upsertEstablishmentRatingSchema.parse({
      establishmentId: 'bar-1',
      rating: 5,
      user_id: 'outra-pessoa',
    });

    expect(parsed).toEqual({ establishmentId: 'bar-1', rating: 5 });
  });
});

describe('Tratamento de erro: avaliações inválidas', () => {
  it.each([0, 6, 3.5, -1, Number.NaN])('rejeita nota %p', (value) => {
    expect(ratingValueSchema.safeParse(value).success).toBe(false);
  });

  it('rejeita upsert sem estabelecimento', () => {
    const result = upsertEstablishmentRatingSchema.safeParse({ establishmentId: '', rating: 5 });

    expect(result.success).toBe(false);
  });

  it('rejeita id de avaliação que não é UUID', () => {
    expect(establishmentRatingSchema.safeParse({ ...RATING, id: 'abc' }).success).toBe(false);
  });

  it.each([
    ['média acima de 5', { avg: 5.1, count: 1 }],
    ['contagem negativa', { avg: 4, count: -1 }],
  ])('rejeita resumo com %s', (_label, override) => {
    const summary = { distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 }, ...override };

    expect(establishmentRatingsSummarySchema.safeParse(summary).success).toBe(false);
  });
});
