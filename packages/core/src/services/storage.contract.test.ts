import { FileTooLargeError, MAX_IMAGE_BYTES, UnsupportedFileTypeError, uploadImage } from './storage';

const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

const PUBLIC_URL =
  'https://example.supabase.co/storage/v1/object/public/catalog-images/events/fixed-uuid.png';

function fakeBlob(size: number, type: string): Blob {
  return { size, type } as Blob;
}

function makeBucketClient() {
  const upload = jest.fn(() => Promise.resolve({ data: {}, error: null }));
  const getPublicUrl = jest.fn(() => ({ data: { publicUrl: PUBLIC_URL } }));
  const from = jest.fn(() => ({ upload, getPublicUrl }));
  return { client: { storage: { from } }, upload };
}

beforeEach(() => {
  mockGetSupabase.mockReset();
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => 'fixed-uuid' },
    configurable: true,
  });
});

describe('Regra de negócio: uploadImage respeita o teto de tamanho', () => {
  it('aceita arquivo com exatamente MAX_IMAGE_BYTES', async () => {
    const { client, upload } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);

    const url = await uploadImage(fakeBlob(MAX_IMAGE_BYTES, 'image/png'), { pathPrefix: 'events' });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(url).toBe(PUBLIC_URL);
  });

  it('aceita Blob sem tamanho informado (size 0, comum no RN)', async () => {
    const { client, upload } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);

    await uploadImage(fakeBlob(0, 'image/png'), { pathPrefix: 'events' });

    expect(upload).toHaveBeenCalledTimes(1);
  });
});

describe('Tratamento de erro: uploadImage acima do teto', () => {
  it('rejeita arquivo com um byte acima do teto sem chamar o storage', async () => {
    const { client, upload } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(
      uploadImage(fakeBlob(MAX_IMAGE_BYTES + 1, 'image/png'), { pathPrefix: 'events' }),
    ).rejects.toBeInstanceOf(FileTooLargeError);
    expect(upload).not.toHaveBeenCalled();
  });

  it('checa o tamanho antes do formato', async () => {
    const { client } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);

    const attempt = uploadImage(fakeBlob(MAX_IMAGE_BYTES + 1, 'text/html'), { pathPrefix: 'events' });

    await expect(attempt).rejects.toBeInstanceOf(FileTooLargeError);
    await expect(attempt).rejects.not.toBeInstanceOf(UnsupportedFileTypeError);
  });

  it('expõe mensagem pt-BR com o limite', () => {
    const error = new FileTooLargeError();

    expect(error.name).toBe('FileTooLargeError');
    expect(error.message).toBe('Arquivo muito grande. O limite é 8 MB.');
  });

  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);

    await expect(
      uploadImage(fakeBlob(10, 'image/png'), { pathPrefix: 'events' }),
    ).rejects.toThrow(/Supabase não configurado/);
  });
});
