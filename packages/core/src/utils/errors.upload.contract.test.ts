import { FileTooLargeError, UnsupportedFileTypeError } from '../services/storage';
import { getFriendlyErrorMessage } from './errors';

describe('Regra de negócio: mensagens amigáveis de upload', () => {
  it('exibe limite de 8 MB para FileTooLargeError', () => {
    expect(getFriendlyErrorMessage(new FileTooLargeError())).toBe(
      'Arquivo muito grande. O limite é 8 MB.',
    );
  });

  it('exibe formatos aceitos para UnsupportedFileTypeError', () => {
    expect(getFriendlyErrorMessage(new UnsupportedFileTypeError())).toBe(
      'Formato de arquivo não suportado. Use JPG, PNG, WEBP ou PDF.',
    );
  });
});

describe('Tratamento de erro: erros de upload desconhecidos continuam genéricos', () => {
  it('não expõe mensagem interna de Error comum', () => {
    expect(getFriendlyErrorMessage(new Error('bucket internal path /secret'))).toBe(
      'Ocorreu um erro inesperado. Por favor, tente novamente.',
    );
  });
});
