import { AuthError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

import { AuthUnavailableError } from '../services/auth';
import { UnsupportedFileTypeError } from '../services/storage';
import { getErrorCode, getErrorStatus, getErrorType } from './error-classify';

const NETWORK_MESSAGES = [
  'Network request failed',
  'Failed to fetch',
  'Load failed',
  'NetworkError when attempting to fetch resource.',
];

describe('Regra de negócio: classificação de tipo de erro', () => {
  it.each(NETWORK_MESSAGES)('TypeError "%s" vira NetworkError', (message) => {
    expect(getErrorType(new TypeError(message))).toBe('NetworkError');
  });

  it('TypeError sem mensagem de rede não vira NetworkError', () => {
    expect(getErrorType(new TypeError('x is not a function'))).toBe('TypeError');
  });

  it('erro de Storage vira SupabaseStorageError e expõe status', () => {
    const error = { __isStorageError: true, message: 'x', status: 400 };
    expect(getErrorType(error)).toBe('SupabaseStorageError');
    expect(getErrorStatus(error)).toBe(400);
  });

  it('AbortError por name', () => {
    expect(getErrorType(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe('AbortError');
  });

  it('UnsupportedFileTypeError e AuthUnavailableError por name', () => {
    expect(getErrorType(new UnsupportedFileTypeError())).toBe('UnsupportedFileTypeError');
    expect(getErrorType(new AuthUnavailableError())).toBe('AuthUnavailableError');
  });

  it('Zod, Postgrest e Auth mantêm seus tipos', () => {
    expect(getErrorType(new ZodError([]))).toBe('ZodValidationError');
    expect(getErrorType({ message: 'm', details: 'd', hint: 'h', code: '42501' })).toBe(
      'PostgrestDatabaseError',
    );
    expect(getErrorType(new AuthError('m', 400, 'otp_expired'))).toBe('SupabaseAuthError');
  });
});

describe('Tratamento de erro: código e status ausentes ou inesperados', () => {
  it('valor que não é Error vira UnknownError', () => {
    expect(getErrorType('texto')).toBe('UnknownError');
    expect(getErrorType(null)).toBe('UnknownError');
  });

  it('getErrorCode devolve undefined quando não há código', () => {
    expect(getErrorCode(new Error('x'))).toBeUndefined();
    expect(getErrorCode(new AuthError('m', 400))).toBeUndefined();
  });

  it('getErrorCode devolve o código de Postgrest e de Auth', () => {
    expect(getErrorCode({ message: 'm', details: 'd', hint: 'h', code: '23505' })).toBe('23505');
    expect(getErrorCode(new AuthError('m', 400, 'otp_expired'))).toBe('otp_expired');
  });

  it('getErrorStatus ignora status não numérico e erro comum', () => {
    expect(getErrorStatus(new Error('x'))).toBeUndefined();
    expect(getErrorStatus({ __isStorageError: true, status: 'x' })).toBeUndefined();
    expect(getErrorStatus(new AuthError('m', 429))).toBe(429);
  });
});
