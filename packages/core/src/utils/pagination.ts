/**
 * Contrato de paginacao por cursor do catalogo. O cursor e opaco para quem
 * consome: a query layer sabe monta-lo e le-lo, a UI so o repassa. Cursor em
 * vez de OFFSET porque OFFSET pula ou duplica linha quando ha insercao
 * concorrente entre uma pagina e a seguinte.
 */
export interface CatalogPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** Cursor composto: valor da coluna de ordenacao + id como desempate. */
export interface CatalogCursor {
  value: string;
  id: string;
}

/** Tamanho de lote de todas as listagens paginadas. Nao e ajustavel pelo usuario. */
export const DEFAULT_PAGE_SIZE = 20;

const CURSOR_SEPARATOR = '|';

export function encodeCursor(cursor: CatalogCursor): string {
  return `${cursor.value}${CURSOR_SEPARATOR}${cursor.id}`;
}

/**
 * lastIndexOf, nao indexOf: nome de estabelecimento pode conter o separador, e
 * o id (ultimo campo) nunca contem.
 */
export function decodeCursor(cursor: string | null): CatalogCursor | null {
  if (!cursor) {
    return null;
  }
  const separatorIndex = cursor.lastIndexOf(CURSOR_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }
  const value = cursor.slice(0, separatorIndex);
  const id = cursor.slice(separatorIndex + 1);
  // cursor e input externo (pageParam do useInfiniteQuery); value/id vao sem
  // escaping para o .or() do PostgREST na query layer — rejeitar caracteres
  // que quebrariam a sintaxe do filtro em vez de confiar so no formato de
  // quem gerou o cursor.
  if (/[,()]/.test(value) || /[,()]/.test(id)) {
    return null;
  }
  return { value, id };
}

/**
 * Achata o `{ pages }` do useInfiniteQuery numa lista simples para a UI. Evita
 * que cada tela repita o mesmo flatMap.
 */
export function flattenPages<T>(
  data: { pages: CatalogPage<T>[]; pageParams: unknown[] } | undefined,
): T[] {
  if (!data) {
    return [];
  }
  return data.pages.flatMap((page) => page.items);
}
