/**
 * Formata o couvert no padrão dos cards do protótipo:
 * 0 → 'Free' · inteiro → 'R$ 20' · decimal → 'R$ 22,50' (vírgula, 2 casas).
 */
export function formatPrice(value: number): string {
  if (value === 0) return 'Free';
  if (Number.isInteger(value)) return `R$ ${value}`;
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/** Avaliação no formato '4.7 (312)' — média com 1 casa decimal. */
export function formatRating(avg: number, count: number): string {
  return `${avg.toFixed(1)} (${count})`;
}
