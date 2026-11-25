const mockRemove = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => ({
    storage: { from: () => ({ remove: mockRemove }) },
  }),
  isSupabaseConfigured: () => true,
}));

import { deleteStaleUploads, staleUploadedUrls } from './storage';

const OURS_A = 'https://x.supabase.co/storage/v1/object/public/catalog-images/events/a.jpg';
const OURS_B = 'https://x.supabase.co/storage/v1/object/public/catalog-images/events/b.jpg';
const EXTERNAL = 'https://example.com/menu.pdf';

describe('Regra de negócio: limpeza de uploads substituídos', () => {
  beforeEach(() => mockRemove.mockReset());

  it('lista só URLs do bucket que saíram do estado gravado', () => {
    expect(staleUploadedUrls([OURS_A, OURS_B, EXTERNAL], [OURS_B, ''])).toEqual([OURS_A]);
  });

  it('não lista URL que continua em uso, vazia ou duplicada', () => {
    expect(staleUploadedUrls([OURS_A, OURS_A, '', null], [OURS_A])).toEqual([]);
    expect(staleUploadedUrls([OURS_A, OURS_A], [])).toEqual([OURS_A]);
  });

  it('remove do storage cada arquivo antigo', async () => {
    mockRemove.mockResolvedValue({ error: null });
    deleteStaleUploads([OURS_A], [OURS_B]);
    await Promise.resolve();
    expect(mockRemove).toHaveBeenCalledWith(['events/a.jpg']);
  });
});

describe('Tratamento de erro: limpeza de uploads substituídos', () => {
  beforeEach(() => mockRemove.mockReset());

  it('ignora link externo e valores nulos', () => {
    expect(staleUploadedUrls([EXTERNAL, undefined, null], [])).toEqual([]);
  });

  it('falha ao remover não lança nem rejeita', async () => {
    mockRemove.mockResolvedValue({ error: new Error('falha') });
    expect(() => deleteStaleUploads([OURS_A], [])).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
