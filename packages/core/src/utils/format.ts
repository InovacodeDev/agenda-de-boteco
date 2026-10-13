/**
 * Formata o couvert no padrão dos cards do protótipo:
 * 0 → 'Free' · inteiro → 'R$ 20' · decimal → 'R$ 22,50' (vírgula, 2 casas).
 */
export function formatPrice(value: number): string {
  if (value === 0) return 'Free';
  if (Number.isInteger(value)) return `R$ ${value}`;
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Linha "ambiente · faixa" do perfil do bar. Os dois campos são opcionais para
 * o dono (faixa "Não definido", ambiente vazio), então o separador só aparece
 * entre valores presentes.
 */
export function formatAmbianceAndPrice(establishment: {
  ambiance: string;
  price_range: string | null;
}): string {
  return [establishment.ambiance.trim(), establishment.price_range ?? '']
    .filter(Boolean)
    .join(' · ');
}

/** Avaliação no formato '4.7 (312)' — média com 1 casa decimal. */
export function formatRating(avg: number, count: number): string {
  return `${avg.toFixed(1)} (${count})`;
}
