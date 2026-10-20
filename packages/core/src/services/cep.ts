import { z } from 'zod';

import { handleServiceError } from '../utils/errors';

export interface CepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  uf: string;
}

const VIACEP_BASE_URL = 'https://viacep.com.br/ws';

const viaCepSchema = z.union([
  z.object({ erro: z.union([z.boolean(), z.string()]) }),
  z.object({
    cep: z.string(),
    logradouro: z.string().default(''),
    bairro: z.string().default(''),
    localidade: z.string(),
    uf: z.string(),
  }),
]);

/**
 * Consulta pública (ViaCEP, sem credencial). O host é constante e só dígitos
 * entram na URL: o CEP vem do usuário e nunca pode alterar destino ou path.
 * CEP inexistente devolve `null`; falha de rede/HTTP é erro de verdade.
 */
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) {
    return null;
  }
  try {
    const response = await fetch(`${VIACEP_BASE_URL}/${digits}/json/`, { signal });
    if (!response.ok) {
      throw new Error(`ViaCEP respondeu HTTP ${response.status}`);
    }
    const parsed = viaCepSchema.parse(await response.json());
    if ('erro' in parsed) {
      return null;
    }
    return {
      cep: parsed.cep,
      street: parsed.logradouro,
      neighborhood: parsed.bairro,
      city: parsed.localidade,
      uf: parsed.uf,
    };
  } catch (error) {
    return handleServiceError(error, { method: 'cep.lookupCep' });
  }
}
