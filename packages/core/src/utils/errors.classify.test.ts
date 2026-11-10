import { AuthUnavailableError } from '../services/auth';
import { UnsupportedFileTypeError } from '../services/storage';
import { getFriendlyErrorMessage, logErrorToTerminal } from './errors';

describe('Regra de negócio: mensagens amigáveis dos novos tipos de erro', () => {
  it('TypeError "Failed to fetch" usa a mensagem de rede', () => {
    expect(getFriendlyErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Servidor fora do ar ou sem conexão com a internet. Verifique sua conexão e tente novamente.',
    );
  });

  it('UnsupportedFileTypeError lista os formatos aceitos', () => {
    expect(getFriendlyErrorMessage(new UnsupportedFileTypeError())).toBe(
      'Formato de arquivo não suportado. Use JPG, PNG, WEBP ou PDF.',
    );
  });

  it('AuthUnavailableError avisa que o login está indisponível', () => {
    expect(getFriendlyErrorMessage(new AuthUnavailableError())).toBe(
      'Login indisponível no momento. Tente novamente mais tarde.',
    );
  });

  it('erro de Storage pede nova tentativa de envio', () => {
    expect(
      getFriendlyErrorMessage({ __isStorageError: true, message: 'bucket x', status: 400 }),
    ).toBe('Não foi possível enviar o arquivo. Tente novamente.');
  });
});

describe('Tratamento de erro: log de terminal sem código mantém o formato', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('imprime Code: None quando o erro não tem código', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    logErrorToTerminal(new Error('x'), { method: 'm' });
    process.env.NODE_ENV = original;

    const output = String(consoleErrorSpy.mock.calls[0]?.[0]);
    expect(output).toContain('Code: None');
    expect(output).toContain('Code: "None"');
  });

  it('mensagem de Storage não vaza o texto original', () => {
    expect(
      getFriendlyErrorMessage({ __isStorageError: true, message: 'bucket secreto', status: 500 }),
    ).not.toContain('secreto');
  });
});
