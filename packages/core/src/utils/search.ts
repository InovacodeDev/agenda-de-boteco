import { normalizeText } from './filters';

/** Teto do termo de busca enviado ao servidor: limita o custo do ILIKE e o tamanho da URL. */
export const MAX_SEARCH_LENGTH = 64;

/**
 * Letras que ganham variante acentuada em português (ã, é, ç, ñ...). O banco
 * compara `name` com ILIKE, que não ignora acento; trocá-las por `_` faz o
 * servidor devolver um superset (busca "ze" acha "Zé"). O filtro client-side de
 * `applyEstablishmentFilters` (normalizeText) estreita o resultado depois.
 */
const ACCENTABLE_LETTERS = /[aeiouycn]/g;

/**
 * Monta o padrão ILIKE de `.ilike('name', padrão)` para um termo digitado.
 * Devolve null quando não sobra nada pesquisável (o caller não filtra).
 *
 * Escapa `\`, `%` e `_` (curingas do LIKE) para o texto do usuário valer como
 * literal. `*` é removido: o PostgREST o converte em `%` nos operadores
 * like/ilike e não há escape para ele. `,`, `(` e `)` não precisam de tratamento
 * porque o valor vai num filtro próprio (`.ilike`), não dentro de `.or()`.
 */
export function buildNameSearchPattern(term: string): string | null {
  const normalized = normalizeText(term.trim().slice(0, MAX_SEARCH_LENGTH))
    .replace(/\*/g, '')
    .trim();
  if (!normalized) {
    return null;
  }
  const escaped = normalized.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped.replace(ACCENTABLE_LETTERS, '_')}%`;
}
