import { AuthError } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  buildSafeErrorMetadata,
  EXPECTED_AUTH_CODES,
  isExpectedError,
  redactMessage,
  sanitizeCaptureEvent,
  sanitizeUrl,
  toReportableError,
  URL_PROPERTY_KEYS,
} from './error-reporting';

const postgrestLeak = {
  message: 'duplicate key value violates unique constraint (email)=(a@b.com)',
  details: 'Key (email)=(a@b.com) already exists.',
  hint: '',
  code: '23505',
};

describe('Regra de negócio: erro reportável sem PII', () => {
  it('ZodError de enum não carrega o valor recebido', () => {
    const result = z.object({ status: z.enum(['draft', 'published']) }).safeParse({
      status: 'segredo@x.com',
    });
    expect(result.success).toBe(false);
    const error = result.success ? new Error('inesperado') : result.error;

    const reportable = toReportableError(error);

    expect(reportable.name).toBe('ZodValidationError');
    expect(reportable.message).toBe('status:invalid_enum_value');
    expect(`${reportable.message}${reportable.stack}`).not.toContain('segredo@x.com');
  });

  it('ZodError troca índice numérico por * e limita a 5 issues', () => {
    const error = new z.ZodError(
      Array.from({ length: 7 }, (_, i) => ({
        code: 'custom' as const,
        path: [i, 'phone'],
        message: `invalido ${i}`,
      })),
    );

    const parts = toReportableError(error).message.split('; ');

    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('*.phone:custom');
  });

  it('Postgrest vira "Postgrest <code>" sem message, details nem hint', () => {
    const reportable = toReportableError(postgrestLeak);

    expect(reportable.name).toBe('PostgrestError');
    expect(reportable.message).toBe('Postgrest 23505');
    expect(reportable.stack).not.toContain('a@b.com');
  });

  it('AuthError usa o code, depois o status', () => {
    expect(toReportableError(new AuthError('x@y.com falhou', 400, 'otp_expired')).message).toBe(
      'Auth otp_expired',
    );
    expect(toReportableError(new AuthError('x@y.com falhou', 429)).message).toBe('Auth 429');
    expect(toReportableError(new AuthError('x@y.com falhou')).message).toBe('Auth unknown');
    expect(toReportableError(new AuthError('x', 400, 'otp_expired')).name).toBe(
      'SupabaseAuthError',
    );
  });

  it('Storage usa só o status', () => {
    const reportable = toReportableError({
      __isStorageError: true,
      message: 'bucket x',
      status: 413,
    });

    expect(reportable.name).toBe('SupabaseStorageError');
    expect(reportable.message).toBe('Storage 413');
    expect(toReportableError({ __isStorageError: true, message: 'b' }).message).toBe(
      'Storage unknown',
    );
  });

  it('Error comum preserva o name, redige a mensagem e reescreve a primeira linha do stack', () => {
    const original = new Error('falhou para joao@x.com');

    const reportable = toReportableError(original);

    expect(original.stack).toContain('joao@x.com');
    expect(reportable.message).toBe('falhou para [email]');
    expect(reportable.stack?.split('\n')[0]).toBe('Error: falhou para [email]');
    expect(reportable.stack).not.toContain('joao@x.com');
  });

  it('mensagem com várias linhas não deixa PII no stack', () => {
    const reportable = toReportableError(new Error('linha1 a@b.com\nlinha2 c@d.com'));

    expect(reportable.stack).not.toContain('a@b.com');
    expect(reportable.stack).not.toContain('c@d.com');
  });

  it('subclasse de Error mantém o name', () => {
    class CustomError extends Error {
      override name = 'CustomError';
    }
    expect(toReportableError(new CustomError('x')).name).toBe('CustomError');
  });

  it('valor que não é Error vira UnknownError', () => {
    const reportable = toReportableError('texto com a@b.com');

    expect(reportable.name).toBe('UnknownError');
    expect(reportable.message).toBe('UnknownError');
  });
});

describe('Regra de negócio: redação de texto livre', () => {
  it('remove CPF, telefone e JWT', () => {
    const output = redactMessage('cpf 123.456.789-09 tel 11987654321 jwt eyJa.eyJb.c');

    expect(output).not.toContain('123.456.789-09');
    expect(output).not.toContain('11987654321');
    expect(output).not.toContain('eyJa.eyJb.c');
    expect(output).toContain('[number]');
    expect(output).toContain('[token]');
  });

  it('mantém números curtos', () => {
    expect(redactMessage('status 500 em 3 tentativas')).toBe('status 500 em 3 tentativas');
  });
});

describe('Regra de negócio: URL e evento do PostHog sem token', () => {
  it('sanitizeUrl remove hash e parâmetros sensíveis e preserva o resto', () => {
    expect(
      sanitizeUrl(
        'https://x.com/client/login?next=%2Fevents&code=abc#access_token=t&refresh_token=r',
      ),
    ).toBe('https://x.com/client/login?next=%2Fevents');
  });

  it('sanitizeUrl remove a query inteira quando só há parâmetros sensíveis', () => {
    expect(sanitizeUrl('https://x.com/a?token=1&email=a%40b.com')).toBe('https://x.com/a');
    expect(sanitizeUrl('https://x.com/a?c%6Fde=1&Token=2')).toBe('https://x.com/a');
  });

  it('sanitizeUrl deixa path e texto que não é URL inalterados', () => {
    expect(sanitizeUrl('/app/event/1')).toBe('/app/event/1');
    expect(sanitizeUrl('/app/event/1?utm=a')).toBe('/app/event/1?utm=a');
    expect(sanitizeUrl('https://x.com/a?b=1')).toBe('https://x.com/a?b=1');
    expect(sanitizeUrl('texto?code=1#x')).toBe('texto?code=1#x');
  });

  it('sanitizeCaptureEvent limpa só as chaves de URL conhecidas', () => {
    const event = {
      event: '$pageview',
      properties: { $current_url: 'https://x.com/?token=1', foo: 'https://x.com/?token=1' },
    };

    const result = sanitizeCaptureEvent(event);

    expect(result?.properties).toEqual({
      $current_url: 'https://x.com/',
      foo: 'https://x.com/?token=1',
    });
    expect(event.properties.$current_url).toBe('https://x.com/?token=1');
  });

  it('sanitizeCaptureEvent cobre todas as chaves de URL e ignora valor não string', () => {
    const properties: Record<string, unknown> = Object.fromEntries(
      URL_PROPERTY_KEYS.map((key) => [key, 'https://x.com/p#access_token=t']),
    );
    properties.$referrer = 42;

    const result = sanitizeCaptureEvent({ properties });

    for (const key of URL_PROPERTY_KEYS) {
      expect(result?.properties?.[key]).toBe(key === '$referrer' ? 42 : 'https://x.com/p');
    }
  });
});

describe('Tratamento de erro: filtro de erro esperado e entradas vazias', () => {
  it('isExpectedError é true para AbortError e códigos de auth esperados', () => {
    expect(isExpectedError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    for (const code of EXPECTED_AUTH_CODES) {
      expect(isExpectedError(new AuthError('x', 400, code))).toBe(true);
    }
  });

  it('isExpectedError é false para Postgrest 42501, AuthError inesperado e Error comum', () => {
    expect(isExpectedError({ message: 'm', details: 'd', hint: 'h', code: '42501' })).toBe(false);
    expect(isExpectedError(new AuthError('x', 500, 'unexpected_failure'))).toBe(false);
    expect(isExpectedError(new Error('x'))).toBe(false);
  });

  it('buildSafeErrorMetadata devolve só metadado estrutural', () => {
    expect(
      buildSafeErrorMetadata(
        { message: 'm', details: 'd', hint: 'h', code: '42501' },
        'favorites.add',
      ),
    ).toEqual({ method: 'favorites.add', errorType: 'PostgrestDatabaseError', code: '42501' });
    expect(
      Object.keys(buildSafeErrorMetadata({ message: 'm', details: 'd', hint: 'h', code: '42501' })),
    ).not.toContain('status');
  });

  it('buildSafeErrorMetadata inclui status de AuthError', () => {
    expect(buildSafeErrorMetadata(new AuthError('x', 429, 'over_request_rate_limit'))).toEqual({
      errorType: 'SupabaseAuthError',
      code: 'over_request_rate_limit',
      status: 429,
    });
  });

  it('sanitizeCaptureEvent devolve null para null e o próprio evento sem properties', () => {
    expect(sanitizeCaptureEvent(null)).toBeNull();
    const event: { event: string; properties?: Record<string, unknown> } = { event: 'x' };
    expect(sanitizeCaptureEvent(event)).toBe(event);
  });
});
