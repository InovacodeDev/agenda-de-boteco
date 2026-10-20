/** Formato de UUID (v1–v5) usado por `external_id`, independente de versão exata. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * true quando `value` tem forma de UUID. Usado para decidir se um id recebido
 * (rota, deep link) é o `external_id` opaco ou o id interno legado (slug),
 * já que os dois convivem no mesmo parâmetro durante a transição.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Lista de ids sem repetição e em ordem estável: a mesma seleção produz a mesma
 * query key (cache hit) e o mesmo `.in()`, independente da ordem de chegada.
 */
export function uniqueSortedIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}
