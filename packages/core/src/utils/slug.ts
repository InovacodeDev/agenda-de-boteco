/**
 * Slug agnóstico de plataforma: minúsculas, sem acentos, não-alfanuméricos
 * viram hífen, hífens colapsados e aparados nas pontas.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Gera um id-slug a partir de `name`. Se colidir com `existingIds`, sufixa
 * `-2`, `-3`, ... até achar um livre.
 */
export function generateId(name: string, existingIds: string[] = []): string {
  const base = slugify(name);
  if (!existingIds.includes(base)) {
    return base;
  }
  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
