import * as errors from '../utils/errors';
import {
  configureAuthRedirect,
  sendPasswordReset,
  signInWithEmailOtp,
  signInWithPassword,
  signUpWithPassword,
  verifyEmailOtp,
} from './auth';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

const EMAIL = 'tito@exemplo.com';
const OTP = '123456';
const failure = { error: new Error('boom') };

function makeFailingClient() {
  return {
    auth: {
      signInWithOtp: jest.fn().mockResolvedValue(failure),
      verifyOtp: jest.fn().mockResolvedValue(failure),
      signInWithPassword: jest.fn().mockResolvedValue(failure),
      signUp: jest.fn().mockResolvedValue(failure),
      resetPasswordForEmail: jest.fn().mockResolvedValue(failure),
    },
  };
}

const CASES: [string, string, () => Promise<void>][] = [
  ['auth.signInWithEmailOtp', 'signInWithEmailOtp', () => signInWithEmailOtp(EMAIL)],
  ['auth.verifyEmailOtp', 'verifyEmailOtp', () => verifyEmailOtp(EMAIL, OTP)],
  ['auth.signInWithPassword', 'signInWithPassword', () => signInWithPassword(EMAIL, 'senha')],
  ['auth.signUpWithPassword', 'signUpWithPassword', () => signUpWithPassword(EMAIL, 'senha')],
  ['auth.sendPasswordReset', 'sendPasswordReset', () => sendPasswordReset(EMAIL)],
];

describe('Regra de negócio: contexto de erro de auth só leva o method', () => {
  beforeEach(() => {
    configureAuthRedirect(() => 'agenda-de-boteco://');
  });

  it.each(CASES)(
    '%s não repassa e-mail nem token ao handleServiceError',
    async (method, _name, run) => {
      const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
        throw error;
      });
      mockGetSupabase.mockReturnValue(makeFailingClient());

      await expect(run()).rejects.toThrow('boom');

      expect(spy).toHaveBeenCalledWith(expect.any(Error), { method });
      spy.mockRestore();
    },
  );
});

describe('Tratamento de erro: nenhuma credencial ou PII em args', () => {
  it.each(CASES)('%s não serializa e-mail nem OTP no contexto', async (_method, _name, run) => {
    const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
      throw error;
    });
    mockGetSupabase.mockReturnValue(makeFailingClient());

    await expect(run()).rejects.toThrow('boom');

    const serialized = JSON.stringify(spy.mock.calls.map((call) => call[1]));
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain(OTP);
    spy.mockRestore();
  });
});
