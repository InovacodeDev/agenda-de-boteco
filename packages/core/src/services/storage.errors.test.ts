import * as errors from '../utils/errors';
import {
  deleteImage,
  FileTooLargeError,
  MAX_IMAGE_BYTES,
  UnsupportedFileTypeError,
  uploadImage,
} from './storage';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

const postgrest42501 = {
  message: 'new row violates row-level security policy',
  details: '',
  hint: '',
  code: '42501',
};

function makeClient(error: unknown) {
  const upload = jest.fn(() => Promise.resolve({ data: null, error }));
  const remove = jest.fn(() => Promise.resolve({ data: null, error }));
  const getPublicUrl = jest.fn(() => ({ data: { publicUrl: 'https://x.test/p.png' } }));
  const client = { storage: { from: jest.fn(() => ({ upload, remove, getPublicUrl })) } };
  return { client, upload, remove };
}

const png = new Blob(['x'], { type: 'image/png' });
const PUBLIC_URL = 'https://x.test/storage/v1/object/public/catalog-images/events/a.png';

let handleSpy: jest.SpyInstance;

beforeEach(() => {
  mockGetSupabase.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  handleSpy = jest.spyOn(errors, 'handleServiceError');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Regra de negócio: uploadImage e deleteImage reportam falha do storage', () => {
  it('uploadImage rejeita com o mesmo erro e reporta storage.uploadImage com o prefixo', async () => {
    mockGetSupabase.mockReturnValue(makeClient(postgrest42501).client);

    await expect(uploadImage(png, { pathPrefix: 'events' })).rejects.toBe(postgrest42501);

    expect(handleSpy).toHaveBeenCalledWith(postgrest42501, {
      method: 'storage.uploadImage',
      args: { pathPrefix: 'events' },
    });
  });

  it('deleteImage rejeita com o mesmo erro e reporta storage.deleteImage sem a URL', async () => {
    mockGetSupabase.mockReturnValue(makeClient(postgrest42501).client);

    await expect(deleteImage(PUBLIC_URL)).rejects.toBe(postgrest42501);

    expect(handleSpy).toHaveBeenCalledWith(postgrest42501, { method: 'storage.deleteImage' });
  });

  it('uploadImage bem-sucedido devolve a URL pública sem reportar', async () => {
    mockGetSupabase.mockReturnValue(makeClient(null).client);

    await expect(uploadImage(png, { pathPrefix: 'events' })).resolves.toBe(
      'https://x.test/p.png',
    );
    expect(handleSpy).not.toHaveBeenCalled();
  });
});

describe('Tratamento de erro: erro de uso não vira exceção reportada', () => {
  it('arquivo grande demais rejeita FileTooLargeError sem chamar handleServiceError', async () => {
    mockGetSupabase.mockReturnValue(makeClient(null).client);
    const big = { size: MAX_IMAGE_BYTES + 1, type: 'image/png' } as Blob;

    await expect(uploadImage(big, { pathPrefix: 'events' })).rejects.toBeInstanceOf(
      FileTooLargeError,
    );
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('MIME fora da allowlist rejeita UnsupportedFileTypeError sem reportar', async () => {
    mockGetSupabase.mockReturnValue(makeClient(null).client);
    const exe = new Blob(['x'], { type: 'application/x-msdownload' });

    await expect(uploadImage(exe, { pathPrefix: 'events' })).rejects.toBeInstanceOf(
      UnsupportedFileTypeError,
    );
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('client ausente rejeita sem reportar e URL externa em deleteImage é no-op', async () => {
    mockGetSupabase.mockReturnValue(null);

    await expect(uploadImage(png, { pathPrefix: 'events' })).rejects.toThrow(
      /Supabase não configurado/,
    );
    await expect(deleteImage('https://outro.site/foto.png')).resolves.toBeUndefined();
    expect(handleSpy).not.toHaveBeenCalled();
  });
});
