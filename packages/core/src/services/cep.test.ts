import { lookupCep } from './cep';

const fetchMock = jest.fn();

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('lookupCep', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('retorna null sem chamar fetch quando não tem 8 dígitos', async () => {
    expect(await lookupCep('1234')).toBeNull();
    expect(await lookupCep('123456789')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna null quando o CEP não existe (erro boolean ou string)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ erro: true }));
    expect(await lookupCep('00000-000')).toBeNull();
    fetchMock.mockResolvedValueOnce(jsonResponse({ erro: 'true' }));
    expect(await lookupCep('00000000')).toBeNull();
  });

  it('mapeia a resposta e usa só dígitos na URL', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cep: '88015-200',
        logradouro: 'Rua Felipe Schmidt',
        bairro: 'Centro',
        localidade: 'Florianópolis',
        uf: 'SC',
      }),
    );

    const result = await lookupCep('88015-200');

    expect(result).toEqual({
      cep: '88015-200',
      street: 'Rua Felipe Schmidt',
      neighborhood: 'Centro',
      city: 'Florianópolis',
      uf: 'SC',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/88015200/json/', {
      signal: undefined,
    });
  });

  it('lança quando o HTTP não é ok', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));
    await expect(lookupCep('88015200')).rejects.toThrow();
  });
});
