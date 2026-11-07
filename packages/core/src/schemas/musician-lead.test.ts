import { musicianLeadRowSchema, musicianLeadSchema } from './musician-lead';

const VALID = {
  name: '  Duo Violeiros  ',
  phone: '(48) 99999-0000',
  region: 'Grande Florianópolis',
  musicStyleIds: ['sertanejo'],
  instagram: '@@duo.violeiros',
  priceRange: '',
};

describe('Regra de negócio: cadastro de músico', () => {
  it('normaliza nome, instagram sem @ e faixa de preço vazia', () => {
    const parsed = musicianLeadSchema.parse(VALID);

    expect(parsed).toEqual({
      name: 'Duo Violeiros',
      phone: '(48) 99999-0000',
      region: 'Grande Florianópolis',
      musicStyleIds: ['sertanejo'],
      instagram: 'duo.violeiros',
      priceRange: undefined,
    });
  });

  it('aceita telefone de 10 dígitos sem máscara', () => {
    expect(musicianLeadSchema.safeParse({ ...VALID, phone: '4833334444' }).success).toBe(true);
  });

  it('descarta campos não declarados (mass assignment)', () => {
    const parsed = musicianLeadSchema.parse({ ...VALID, is_admin: true, owner_id: 'x' });

    expect(parsed).not.toHaveProperty('is_admin');
    expect(parsed).not.toHaveProperty('owner_id');
  });

  it('lê a linha crua da RPC com price_range nulo', () => {
    const row = {
      id: 'lead-1',
      name: 'Duo',
      phone: '48999990000',
      region: 'Floripa',
      music_style_ids: ['sertanejo'],
      instagram: 'duo',
      price_range: null,
      created_at: '2026-11-07T10:00:00Z',
    };

    expect(musicianLeadRowSchema.parse(row)).toEqual(row);
  });
});

describe('Tratamento de erro: cadastro de músico inválido', () => {
  it.each([
    ['nome vazio', { name: '   ' }, 'name'],
    ['nome acima de 120', { name: 'a'.repeat(121) }, 'name'],
    ['telefone sem DDD', { phone: '99999-0000' }, 'phone'],
    ['telefone longo demais', { phone: '489999900001' }, 'phone'],
    ['região vazia', { region: '' }, 'region'],
    ['nenhum estilo', { musicStyleIds: [] }, 'musicStyleIds'],
    ['mais de 10 estilos', { musicStyleIds: Array.from({ length: 11 }, (_v, i) => `s${i}`) }, 'musicStyleIds'],
    ['instagram com espaço', { instagram: 'duo violeiros' }, 'instagram'],
    ['faixa de preço acima de 60', { priceRange: 'x'.repeat(61) }, 'priceRange'],
  ])('rejeita %s', (_label, override, field) => {
    const result = musicianLeadSchema.safeParse({ ...VALID, ...override });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toContain(field);
    }
  });
});
