import {
  CATALOG_IMAGES_BUCKET,
  deleteImage,
  pathFromPublicUrl,
  uploadImage,
} from './storage';

const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

beforeEach(() => {
  mockGetSupabase.mockReset();
  // randomUUID determinístico para asserção do path gerado.
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => 'fixed-uuid' },
    configurable: true,
  });
});

function makeBucketClient() {
  const upload = jest.fn(() => Promise.resolve({ data: {}, error: null }));
  const getPublicUrl = jest.fn(() => ({
    data: { publicUrl: 'https://x.supabase.co/storage/v1/object/public/catalog-images/events/fixed-uuid.png' },
  }));
  const remove = jest.fn(() => Promise.resolve({ data: {}, error: null }));
  const from = jest.fn(() => ({ upload, getPublicUrl, remove }));
  const client = { storage: { from } };
  return { client, from, upload, getPublicUrl, remove };
}

describe('uploadImage', () => {
  it('lança quando não há client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(
      uploadImage(new Blob([''], { type: 'image/png' }), { pathPrefix: 'events' }),
    ).rejects.toThrow('upload indisponível');
  });

  it('sobe no bucket com path uuid+ext derivada do mime e devolve a URL pública', async () => {
    const { client, from, upload, getPublicUrl } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);

    const file = new Blob(['data'], { type: 'image/png' });
    const url = await uploadImage(file, { pathPrefix: 'events' });

    expect(from).toHaveBeenCalledWith(CATALOG_IMAGES_BUCKET);
    expect(upload).toHaveBeenCalledWith('events/fixed-uuid.png', file, {
      contentType: 'image/png',
      upsert: false,
    });
    expect(getPublicUrl).toHaveBeenCalledWith('events/fixed-uuid.png');
    expect(url).toBe(
      'https://x.supabase.co/storage/v1/object/public/catalog-images/events/fixed-uuid.png',
    );
  });

  it('mapeia jpeg para extensão jpg', async () => {
    const { client, upload } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);
    await uploadImage(new Blob(['d'], { type: 'image/jpeg' }), { pathPrefix: 'establishments' });
    expect(upload).toHaveBeenCalledWith(
      'establishments/fixed-uuid.jpg',
      expect.anything(),
      expect.objectContaining({ contentType: 'image/jpeg' }),
    );
  });

  it('propaga erro do upload', async () => {
    const error = new Error('upload failed');
    const upload = jest.fn(() => Promise.resolve({ data: null, error }));
    const from = jest.fn(() => ({ upload, getPublicUrl: jest.fn(), remove: jest.fn() }));
    mockGetSupabase.mockReturnValue({ storage: { from } });
    await expect(
      uploadImage(new Blob(['d'], { type: 'image/png' }), { pathPrefix: 'events' }),
    ).rejects.toBe(error);
  });
});

describe('pathFromPublicUrl', () => {
  it('extrai o path interno de uma URL do bucket', () => {
    expect(
      pathFromPublicUrl(
        'https://x.supabase.co/storage/v1/object/public/catalog-images/events/abc.png',
      ),
    ).toBe('events/abc.png');
  });

  it('retorna null para URL externa (fora do bucket)', () => {
    expect(pathFromPublicUrl('https://images.unsplash.com/photo-123')).toBeNull();
  });
});

describe('deleteImage', () => {
  it('remove o path derivado da URL pública do bucket', async () => {
    const { client, remove } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);
    await deleteImage(
      'https://x.supabase.co/storage/v1/object/public/catalog-images/events/abc.png',
    );
    expect(remove).toHaveBeenCalledWith(['events/abc.png']);
  });

  it('é no-op para URL externa (não pertence ao bucket)', async () => {
    const { client, remove } = makeBucketClient();
    mockGetSupabase.mockReturnValue(client);
    await deleteImage('https://images.unsplash.com/photo-123');
    expect(remove).not.toHaveBeenCalled();
  });
});
