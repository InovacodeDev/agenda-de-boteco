import { ZodError } from 'zod';

import { reportException } from '../services/analytics';

/** Teto de $exception por chamada: um feed inteiro corrompido não pode estourar a quota. */
export const MAX_DRIFT_REPORTS_PER_CALL = 3;

interface MapRowsLenientOptions<Row> {
  table: string;
  idOf: (row: Row) => string | undefined;
}

/**
 * Índice numérico vira `*` para o agrupamento no PostHog não depender da
 * posição do item no array; nunca entra valor de campo.
 */
function driftIssuePath(error: ZodError): string {
  const path = error.issues[0]?.path ?? [];
  return path.length === 0
    ? 'root'
    : path.map((segment) => (typeof segment === 'number' ? '*' : String(segment))).join('.');
}

/**
 * Descarta só a linha que quebra o schema e reporta o drift. Só `ZodError` é
 * drift: qualquer outro erro (ex.: TypeError por campo null) é bug de código e
 * propaga para o catch do service.
 */
export function mapRowsLenient<Row, Item>(
  rows: readonly Row[],
  map: (row: Row) => Item,
  options: MapRowsLenientOptions<Row>,
): Item[] {
  const items: Item[] = [];
  let reported = 0;
  for (const row of rows) {
    try {
      items.push(map(row));
    } catch (error) {
      if (!(error instanceof ZodError)) {
        throw error;
      }
      if (reported < MAX_DRIFT_REPORTS_PER_CALL) {
        reported += 1;
        reportException(error, {
          fingerprint: ['zod-schema-drift', options.table, driftIssuePath(error)],
          recordId: options.idOf(row),
        });
      }
    }
  }
  return items;
}
