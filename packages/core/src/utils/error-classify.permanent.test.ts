import { isPermanentWriteError } from './error-classify';

function postgrest(code: string) {
  return { message: 'm', details: '', hint: '', code };
}

describe('Regra de negócio: isPermanentWriteError', () => {
  it.each(['42501', '23503', '23505', '23514', '22P02'])(
    'trata o código Postgrest %s como permanente',
    (code) => {
      expect(isPermanentWriteError(postgrest(code))).toBe(true);
    },
  );

  it.each(['40001', '57014', '08006', 'PGRST000', 'PGRST301'])(
    'trata o código transitório %s como não permanente',
    (code) => {
      expect(isPermanentWriteError(postgrest(code))).toBe(false);
    },
  );
});

describe('Tratamento de erro: isPermanentWriteError com entradas que não são Postgrest', () => {
  it('erro de rede (TypeError) não é permanente', () => {
    expect(isPermanentWriteError(new TypeError('Network request failed'))).toBe(false);
  });

  it('objeto com code mas sem os demais campos de Postgrest não é permanente', () => {
    expect(isPermanentWriteError({ code: '42501' })).toBe(false);
  });

  it.each([null, undefined, '42501', 42])('valor %p não é permanente', (value) => {
    expect(isPermanentWriteError(value)).toBe(false);
  });
});
