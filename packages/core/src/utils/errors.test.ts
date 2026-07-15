import { AuthError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

import {
  getFriendlyErrorMessage,
  handleServiceError,
  logErrorToTerminal,
} from './errors';

describe('errors utility', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    consoleErrorSpy.mockRestore();
  });

  describe('logErrorToTerminal', () => {
    it('does not log when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      logErrorToTerminal(new Error('test'), { method: 'testMethod' });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('logs regular Error details in dev mode', () => {
      const err = new Error('ordinary error');
      logErrorToTerminal(err, { method: 'testMethod', args: { foo: 'bar' } });
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Method: testMethod');
      expect(call).toContain('Error Type: Error');
      expect(call).toContain('Message: ordinary error');
    });

    it('logs ZodValidationError details', () => {
      const err = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['name'],
          received: 'number',
          message: 'Expected string, received number',
        },
      ]);
      logErrorToTerminal(err, { method: 'zodMethod' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Error Type: ZodValidationError');
      expect(call).toContain('Expected string, received number');
    });

    it('logs PostgrestDatabaseError details', () => {
      const err = {
        message: 'column does not exist',
        details: 'some details',
        hint: 'try checking columns',
        code: '42703',
      };
      logErrorToTerminal(err, { method: 'dbMethod' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Error Type: PostgrestDatabaseError');
      expect(call).toContain('Code: 42703');
    });

    it('logs SupabaseAuthError details', () => {
      const err = new AuthError('invalid otp token', 400);
      logErrorToTerminal(err, { method: 'authMethod' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Error Type: SupabaseAuthError');
    });
  });

  describe('getFriendlyErrorMessage', () => {
    it('returns friendly message for NetworkError', () => {
      const err = new TypeError('Network request failed');
      expect(getFriendlyErrorMessage(err)).toContain('Servidor fora do ar');
    });

    it('returns friendly message for invalid credentials', () => {
      const err = new AuthError('Invalid credentials', 400);
      expect(getFriendlyErrorMessage(err)).toContain('Código de acesso ou e-mail incorreto');
    });

    it('returns friendly message for invalid grant (incorrect OTP)', () => {
      const err = new AuthError('Invalid OTP', 400);
      (err as unknown as { code: string }).code = 'invalid_grant';
      expect(getFriendlyErrorMessage(err)).toContain('Código de acesso ou e-mail incorreto');
    });

    it('returns friendly message for invalid otp message', () => {
      const err = new AuthError('invalid otp', 400);
      expect(getFriendlyErrorMessage(err)).toContain('Código de acesso ou e-mail incorreto');
    });

    it('returns friendly message for validation failed', () => {
      const err = new AuthError('validation failed', 400);
      (err as unknown as { code: string }).code = 'validation_failed';
      expect(getFriendlyErrorMessage(err)).toContain('O e-mail digitado parece inválido');
    });

    it('returns friendly message for expired OTP', () => {
      const err = new AuthError('OTP expired', 400);
      (err as unknown as { code: string }).code = 'otp_expired';
      expect(getFriendlyErrorMessage(err)).toContain('O código de acesso expirou');
    });

    it('returns friendly message for rate limits', () => {
      const err = new AuthError('Too many requests', 429);
      expect(getFriendlyErrorMessage(err)).toContain('Muitas tentativas');
    });

    it('returns friendly message for PostgrestError', () => {
      const err = {
        message: 'column does not exist',
        details: 'some details',
        hint: 'try checking columns',
        code: '42703',
      };
      expect(getFriendlyErrorMessage(err)).toContain('Não foi possível carregar as informações');
    });

    it('returns friendly message for ZodValidationError', () => {
      const err = new ZodError([]);
      expect(getFriendlyErrorMessage(err)).toContain('Erro interno ao processar dados');
    });

    it('returns friendly message for unknown errors', () => {
      expect(getFriendlyErrorMessage('random')).toContain('Ocorreu um erro inesperado');
    });
  });

  describe('handleServiceError', () => {
    it('logs error and rethrows original', () => {
      const err = new Error('boom');
      expect(() => handleServiceError(err, { method: 'test' })).toThrow('boom');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

});
