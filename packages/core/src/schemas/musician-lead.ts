import { z } from 'zod';

/**
 * Cadastro de músico vindo da landing (issue #59). Não é schema de catálogo: a
 * tabela `musician_leads` é caixa de entrada de contato, sem leitura pública.
 *
 * Os tetos aqui espelham os da RPC `create_musician_lead`
 * (20260901120000_musician_leads.sql). A validação real é a do SQL — esta
 * existe para o formulário apontar o campo errado antes do round-trip.
 */
export const musicianLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe seu nome')
    .max(120, 'Use no máximo 120 caracteres'),
  /** Aceita o valor mascarado por `maskPhoneBR`; a checagem é sobre os dígitos. */
  phone: z
    .string()
    .trim()
    .refine(
      (value) => /^\d{10,11}$/.test(value.replace(/\D/g, '')),
      'Informe DDD e telefone completo',
    ),
  region: z
    .string()
    .trim()
    .min(1, 'Informe a região que você atende')
    .max(120, 'Use no máximo 120 caracteres'),
  musicStyleIds: z
    .array(z.string().min(1))
    .min(1, 'Escolha ao menos um estilo musical')
    .max(10, 'Escolha no máximo 10 estilos'),
  /** Guardado sem o `@`, como `establishments.instagram`. */
  instagram: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@+/, ''))
    .pipe(
      z
        .string()
        .regex(/^[A-Za-z0-9._]{1,30}$/, 'Use apenas letras, números, ponto ou _'),
    ),
  /**
   * Opcional: texto livre ("R$ 500 a R$ 800 por show"). O campo vazio do
   * formulário chega como '' — normalizado para undefined aqui, senão o service
   * mandaria '' à RPC e a coluna anulável guardaria uma faixa fantasma.
   */
  priceRange: z
    .string()
    .trim()
    .max(60, 'Use no máximo 60 caracteres')
    .optional()
    .transform((value) => value || undefined),
});

export type MusicianLeadInput = z.infer<typeof musicianLeadSchema>;
