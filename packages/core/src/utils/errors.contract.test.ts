import { AuthError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

import { getFriendlyErrorMessage } from './errors';

const FRIENDLY_MESSAGES = [
  'Servidor fora do ar ou sem conexão com a internet. Verifique sua conexão e tente novamente.',
  'Código de acesso ou e-mail incorreto. Verifique os dados e tente novamente.',
  'O e-mail digitado parece inválido. Verifique se digitou corretamente.',
  'O código de acesso expirou. Por favor, solicite um novo.',
  'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.',
  'Erro ao tentar autenticar. Verifique seus dados e tente novamente.',
  'Não foi possível carregar as informações do servidor. Se o problema persistir, tente mais tarde.',
  'Erro interno ao processar dados. O aplicativo pode precisar ser atualizado.',
  'Ocorreu um erro inesperado. Por favor, tente novamente.',
];

const postgrestLeak = {
  message: 'relation "public.profiles" does not exist',
  details: 'Key (email)=(fulano@example.com) already exists.',
  hint: 'select * from profiles where email = fulano@example.com',
  code: '42P01',
};

const LEAKY_ERRORS: [string, unknown][] = [
  ['PostgrestError com tabela, e-mail e SQL', postgrestLeak],
  ['AuthError com e-mail na mensagem', new AuthError('user fulano@example.com not found', 400)],
  ['Error com SQL na mensagem', new Error('select * from profiles: 42P01 fulano@example.com')],
  ['ZodError', new ZodError([])],
  ['valor não-Error', 'select * from profiles'],
];

const FORBIDDEN_FRAGMENTS = ['profiles', '@', 'select', '42P01', 'fulano'];

describe('Regra de negócio: mensagem amigável ao usuário', () => {
  it.each(LEAKY_ERRORS)('%s vira uma das mensagens fixas', (_label, error) => {
    expect(FRIENDLY_MESSAGES).toContain(getFriendlyErrorMessage(error));
  });
});

describe('Tratamento de erro: nenhum vazamento de SQL ou PII', () => {
  it.each(LEAKY_ERRORS)('%s não expõe fragmentos sensíveis', (_label, error) => {
    const message = getFriendlyErrorMessage(error).toLowerCase();

    for (const fragment of FORBIDDEN_FRAGMENTS) {
      expect(message).not.toContain(fragment.toLowerCase());
    }
  });
});
