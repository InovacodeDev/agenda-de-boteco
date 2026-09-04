import { ZodError, type ZodIssue } from 'zod';

import { issuesToErrors } from './formErrors';

function makeZodError(issues: ZodIssue[]): ZodError {
  return new ZodError(issues);
}

describe('issuesToErrors', () => {
  it('retorna objeto vazio quando não há issues', () => {
    const error = makeZodError([]);
    expect(issuesToErrors(error)).toEqual({});
  });

  it('mapeia issue única para o campo correspondente', () => {
    const error = makeZodError([
      {
        code: 'custom',
        path: ['name'],
        message: 'Nome é obrigatório',
      },
    ]);
    expect(issuesToErrors(error)).toEqual({
      name: 'Nome é obrigatório',
    });
  });

  it('mapeia múltiplas issues em campos diferentes', () => {
    const error = makeZodError([
      {
        code: 'custom',
        path: ['title'],
        message: 'Título obrigatório',
      },
      {
        code: 'custom',
        path: ['cityId'],
        message: 'Cidade obrigatória',
      },
    ]);
    expect(issuesToErrors(error)).toEqual({
      title: 'Título obrigatório',
      cityId: 'Cidade obrigatória',
    });
  });

  it('mantém a primeira mensagem quando há múltiplos erros no mesmo campo', () => {
    const error = makeZodError([
      {
        code: 'custom',
        path: ['email'],
        message: 'E-mail obrigatório',
      },
      {
        code: 'custom',
        path: ['email'],
        message: 'Formato de e-mail inválido',
      },
    ]);
    expect(issuesToErrors(error)).toEqual({
      email: 'E-mail obrigatório',
    });
  });

  it('usa "_" quando path é vazio', () => {
    const error = makeZodError([
      {
        code: 'custom',
        path: [],
        message: 'Erro geral no formulário',
      },
    ]);
    expect(issuesToErrors(error)).toEqual({
      _: 'Erro geral no formulário',
    });
  });

  it('converte índices numéricos de path para string', () => {
    const error = makeZodError([
      {
        code: 'custom',
        path: [0],
        message: 'Item inválido',
      },
    ]);
    expect(issuesToErrors(error)).toEqual({
      '0': 'Item inválido',
    });
  });
});
