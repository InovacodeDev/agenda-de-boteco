# Paginação com Infinite Scroll nas Listagens do Catálogo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paginar as listagens de catálogo por cursor, com infinite scroll disparando a 80% do scroll, e criar o índice ausente em `events.establishment_id`.

**Architecture:** Cursor composto (`starts_at`/`created_at` + `id`) na query layer, replicando o padrão já existente em `listMusicianLeads`. A fachada de service repassa o cursor e mantém o fallback de mock. Hooks migram de `useQuery` para `useInfiniteQuery`. No mobile, `FlashList` já suporta `onEndReached`; na web, um `IntersectionObserver` num elemento sentinela.

**Tech Stack:** TanStack Query v5.101 (`useInfiniteQuery`), Supabase JS 2.106 (query builder PostgREST), `@shopify/flash-list` 2.0.2, Jest 29.7 + ts-jest.

---

## Contexto que o implementador precisa saber

**O repo já tem o padrão a copiar.** `packages/core/src/services/musician-leads.ts` implementa paginação por cursor composto e `apps/web-client/hooks/use-musician-leads.ts` a consome com `useInfiniteQuery`. Leia os dois antes de começar. A diferença: lá o cursor vai para uma RPC; aqui vai para o query builder do PostgREST.

**Por que cursor e não `OFFSET`:** com `OFFSET`, se uma linha for inserida entre a página 1 e a 2, uma linha é pulada ou duplicada. O cursor `(starts_at, id)` é estável sob inserção concorrente.

**Armadilha 1 — `listEstablishments` não tem `.order()`.** Todas as outras listagens ordenam; essa não. Cursor exige ordenação estável e determinística, então a Task 4 **adiciona** `.order('name')` + `.order('id')`. Isso muda a ordem em que os bares aparecem hoje (que era indefinida, ordem de retorno do Postgres) — é uma mudança de comportamento intencional e desejável.

**Armadilha 2 — o builder fake dos testes não tem `.range()`/`.gt()`/`.or()`.** `packages/core/src/services/catalog.test.ts` tem um `createQueryBuilder` fake que implementa só `select`/`eq`/`order`/`maybeSingle`/`then`. A Task 1 estende esse fake ANTES de qualquer outra coisa, senão todos os testes de paginação falham por motivo errado.

**Armadilha 3 — `eventsFrom(client)` existe por um motivo.** `packages/core/src/queries/catalog.ts` usa `function eventsFrom(client)` que faz `(client as SupabaseClient).from('events')` sem generic, porque `database.types.ts` está atrás do banco. Mantenha esse helper ao adicionar paginação nas queries de `events` — não troque por `client.from('events')`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `packages/core/src/queries/catalog.ts` (modificar) | Query crua com cursor; retorna `CatalogPage<T>` |
| `packages/core/src/services/catalog.ts` (modificar) | Fachada: repassa cursor, pagina o mock |
| `packages/core/src/services/queryKeys.ts` (modificar) | Key nova `events.list` |
| `packages/core/src/services/cachePolicy.ts` (modificar) | `CACHE_BUSTER` v2 → v3 |
| `packages/core/src/hooks/queries.ts` (modificar) | Hooks migram para `useInfiniteQuery` |
| `packages/core/src/utils/pagination.ts` (criar) | `flattenPages`, `DEFAULT_PAGE_SIZE`, cursor |
| `packages/core/src/hooks/useInfiniteScrollSentinel.ts` (criar) | Hook web do `IntersectionObserver` |
| `supabase/migrations/20260903120000_events_pagination_indexes.sql` (criar) | Índices ausentes |
| `packages/core/src/utils/pagination.test.ts` (criar) | Teste dos utilitários |
| `packages/core/src/services/catalog.test.ts` (modificar) | Builder fake estendido + casos de paginação |

---

### Task 1: Estender o builder fake dos testes

Sem isto, nenhum teste de paginação consegue rodar. Task isolada e primeira de propósito.

**Files:**
- Modify: `packages/core/src/services/catalog.test.ts`

- [ ] **Step 1: Localizar o builder fake atual**

Abra `packages/core/src/services/catalog.test.ts` e localize a função `createQueryBuilder` (por volta da linha 306). Ela hoje implementa `select`, `eq`, `order`, `maybeSingle` e `then`.

- [ ] **Step 2: Substituir `createQueryBuilder` pela versão estendida**

Mantém tudo que já existia e acrescenta `gt`, `lt`, `or` e `limit`:

```ts
function createQueryBuilder(rows: Row[], injectedError: FakeError | null = null) {
  let current = [...rows];

  const builder = {
    select() {
      return builder;
    },
    eq(column: string, value: unknown) {
      current = current.filter((row) => row[column] === value);
      return builder;
    },
    gt(column: string, value: unknown) {
      current = current.filter((row) => String(row[column]) > String(value));
      return builder;
    },
    lt(column: string, value: unknown) {
      current = current.filter((row) => String(row[column]) < String(value));
      return builder;
    },
    /**
     * Suporte mínimo ao `.or()` do PostgREST no formato que a paginação por
     * cursor usa: `col.gt.valor,and(col.eq.valor,id.gt.valor)`. Só o
     * suficiente para o teste — não é um parser geral de filtro.
     */
    or(expression: string) {
      const match = /^(\w+)\.(gt|lt)\.([^,]+),and\(\1\.eq\.([^,]+),id\.(?:gt|lt)\.([^)]+)\)$/.exec(
        expression,
      );
      if (!match) {
        throw new Error(`fake builder: expressao .or() nao suportada: ${expression}`);
      }
      const [, column, operator, primary, tie, tieId] = match;
      current = current.filter((row) => {
        const value = String(row[column]);
        const beyond = operator === 'gt' ? value > primary : value < primary;
        if (beyond) return true;
        const tieBreak =
          operator === 'gt' ? String(row.id) > tieId : String(row.id) < tieId;
        return value === tie && tieBreak;
      });
      return builder;
    },
    limit(count: number) {
      current = current.slice(0, count);
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      const ascending = options?.ascending ?? true;
      current = [...current].sort((a, b) => {
        const rawLeft = a[column];
        const rawRight = b[column];
        const left = Date.parse(String(rawLeft));
        const right = Date.parse(String(rawRight));
        // Colunas nao-data (name, id) caem no comparador de string.
        if (Number.isNaN(left) || Number.isNaN(right)) {
          const cmp = String(rawLeft).localeCompare(String(rawRight));
          return ascending ? cmp : -cmp;
        }
        return ascending ? left - right : right - left;
      });
      return builder;
    },
    async maybeSingle() {
      if (injectedError) {
        return { data: null, error: injectedError };
      }
      return { data: current[0] ?? null, error: null };
    },
    then<TResult>(
      onFulfilled: (value: { data: Row[] | null; error: FakeError | null }) => TResult,
    ): Promise<TResult> {
      if (injectedError) {
        return Promise.resolve(onFulfilled({ data: null, error: injectedError }));
      }
      return Promise.resolve(onFulfilled({ data: current, error: null }));
    },
  };

  return builder;
}
```

- [ ] **Step 3: Rodar a suíte existente para garantir que nada quebrou**

Run: `pnpm --filter @agenda/core test -- catalog.test.ts`
Expected: PASS — todos os testes que já existiam continuam passando. O builder ganhou métodos novos mas os antigos não mudaram de comportamento.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/services/catalog.test.ts
git commit -m "Extend fake PostgREST builder for pagination tests"
```

---

### Task 2: Utilitários de paginação no core

**Files:**
- Create: `packages/core/src/utils/pagination.ts`
- Test: `packages/core/src/utils/pagination.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `packages/core/src/utils/pagination.test.ts`:

```ts
import {
  type CatalogPage,
  DEFAULT_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  flattenPages,
} from './pagination';

describe('flattenPages', () => {
  it('devolve array vazio quando nao ha paginas', () => {
    expect(flattenPages(undefined)).toEqual([]);
  });

  it('concatena os itens de todas as paginas na ordem', () => {
    const pages: CatalogPage<{ id: string }>[] = [
      { items: [{ id: 'a' }, { id: 'b' }], nextCursor: 'cursor-1' },
      { items: [{ id: 'c' }], nextCursor: null },
    ];

    expect(flattenPages({ pages, pageParams: [null, 'cursor-1'] })).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ]);
  });

  it('ignora paginas vazias sem quebrar', () => {
    const pages: CatalogPage<{ id: string }>[] = [{ items: [], nextCursor: null }];

    expect(flattenPages({ pages, pageParams: [null] })).toEqual([]);
  });
});

describe('cursor', () => {
  it('expoe 20 como tamanho de pagina padrao', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('faz round-trip de valor e id', () => {
    const encoded = encodeCursor({ value: '2026-09-03T20:00:00Z', id: 'evt-1' });

    expect(decodeCursor(encoded)).toEqual({ value: '2026-09-03T20:00:00Z', id: 'evt-1' });
  });

  it('decodifica null quando o cursor e nulo', () => {
    expect(decodeCursor(null)).toBeNull();
  });

  it('preserva o separador quando ele aparece dentro do valor', () => {
    const encoded = encodeCursor({ value: 'Bar do Ze | Centro', id: 'est-9' });

    expect(decodeCursor(encoded)).toEqual({ value: 'Bar do Ze | Centro', id: 'est-9' });
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `pnpm --filter @agenda/core test -- pagination.test.ts`
Expected: FAIL com "Cannot find module './pagination'"

- [ ] **Step 3: Implementar o utilitário**

Crie `packages/core/src/utils/pagination.ts`:

```ts
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
  return {
    value: cursor.slice(0, separatorIndex),
    id: cursor.slice(separatorIndex + 1),
  };
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
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run: `pnpm --filter @agenda/core test -- pagination.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Exportar na fachada pública do core**

Em `packages/core/src/index.ts`, o bloco de utils é alfabético. Adicione entre `export * from './utils/moderation';` e `export * from './utils/platform';`:

```ts
export * from './utils/pagination';
```

- [ ] **Step 6: Rodar typecheck**

Run: `pnpm --filter @agenda/core typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/utils/pagination.ts packages/core/src/utils/pagination.test.ts packages/core/src/index.ts
git commit -m "Add cursor pagination utilities to core"
```

---

### Task 3: Paginar `listEvents` na query layer

**Files:**
- Modify: `packages/core/src/queries/catalog.ts`

- [ ] **Step 1: Adicionar o import do utilitário**

No topo de `packages/core/src/queries/catalog.ts`, após `import { slugify } from '../utils/slug';`:

```ts
import {
  type CatalogPage,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
} from '../utils/pagination';
```

- [ ] **Step 2: Substituir `listEvents` pela versão paginada**

```ts
/**
 * Pagina de eventos ordenada por starts_at asc, com id como desempate para o
 * cursor ser deterministico quando dois eventos comecam no mesmo horario.
 *
 * NAO adicione .eq('status','published') aqui: o filtro e da RLS (a policy
 * select_events de 20260813120000 ja esconde rascunho de quem nao e dono nem
 * admin). Filtrar de novo na query esconderia o rascunho do proprio dono no
 * painel, que e justamente quem precisa ve-lo.
 *
 * Invariante: esta ordenacao (starts_at asc) deve casar com o fallback mock
 * em packages/core/src/services/catalog.ts (sortByStartsAtAsc).
 */
export async function listEvents(
  client: SupabaseClient<Database>,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  let query = eventsFrom(client)
    .select(EVENT_COLUMNS)
    .order('starts_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);

  const decoded = decodeCursor(cursor);
  if (decoded) {
    query = query.or(
      `starts_at.gt.${decoded.value},and(starts_at.eq.${decoded.value},id.gt.${decoded.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const items = ((data ?? []) as EventRow[]).map(mapEvent);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.starts_at, id: last.id });
  return { items, nextCursor };
}
```

- [ ] **Step 3: Rodar typecheck e confirmar que a fachada quebrou**

Run: `pnpm --filter @agenda/core typecheck`
Expected: FAIL — `packages/core/src/services/catalog.ts` reclama que `Promise<CatalogPage<Event>>` não é `Promise<Event[]>`. Isso é esperado; a Task 6 conserta a fachada. **Não conserte agora.**

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/queries/catalog.ts
git commit -m "Paginate listEvents query with composite cursor"
```

---

### Task 4: Paginar `listEstablishments` na query layer

Esta é a única listagem sem `.order()` hoje. Adicionar ordenação é obrigatório para o cursor funcionar.

**Files:**
- Modify: `packages/core/src/queries/catalog.ts`

- [ ] **Step 1: Substituir `listEstablishments`**

```ts
/**
 * Pagina de estabelecimentos ordenada por nome. A ordenacao e nova: antes a
 * query nao tinha .order() e a ordem vinha indefinida do Postgres. Cursor
 * exige ordem deterministica, e nome e a ordem que faz sentido para o usuario.
 */
export async function listEstablishments(
  client: SupabaseClient<Database>,
  cityId?: string,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Establishment>> {
  let query = client
    .from('establishments')
    .select(ESTABLISHMENT_COLUMNS)
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);

  if (cityId) {
    query = query.eq('city_id', cityId);
  }

  const decoded = decodeCursor(cursor);
  if (decoded) {
    query = query.or(`name.gt.${decoded.value},and(name.eq.${decoded.value},id.gt.${decoded.id})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const items = (data ?? []).map(mapEstablishment);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.name, id: last.id });
  return { items, nextCursor };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/queries/catalog.ts
git commit -m "Paginate listEstablishments and add deterministic ordering"
```

---

### Task 5: Paginar as três listagens restantes

**Files:**
- Modify: `packages/core/src/queries/catalog.ts`

- [ ] **Step 1: Substituir `listEventsByEstablishment` e `listOwnedEvents`**

```ts
/**
 * Eventos de um bar. `order` 'asc' e a agenda publica (proximos primeiro);
 * 'desc' e o painel do dono (mais recentes primeiro). O cursor inverte a
 * comparacao junto com a ordenacao.
 *
 * Invariante: a ordenacao default (starts_at asc) deve casar com o fallback
 * mock em packages/core/src/services/catalog.ts (sortByStartsAtAsc).
 */
export async function listEventsByEstablishment(
  client: SupabaseClient<Database>,
  establishmentId: string,
  /** 'asc' (publico, proximos primeiro) | 'desc' (painel do dono). */
  order: 'asc' | 'desc' = 'asc',
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  const ascending = order === 'asc';
  let query = eventsFrom(client)
    .select(EVENT_COLUMNS)
    .eq('establishment_id', establishmentId)
    .order('starts_at', { ascending })
    .order('id', { ascending })
    .limit(limit);

  const decoded = decodeCursor(cursor);
  if (decoded) {
    const comparison = ascending ? 'gt' : 'lt';
    query = query.or(
      `starts_at.${comparison}.${decoded.value},and(starts_at.eq.${decoded.value},id.${comparison}.${decoded.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const items = ((data ?? []) as EventRow[]).map(mapEvent);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.starts_at, id: last.id });
  return { items, nextCursor };
}

// Agenda do dono: mesma query da publica, so a ordem muda — dai o parametro em
// listEventsByEstablishment em vez de uma segunda funcao com o select duplicado.
// Rascunho vem junto porque a RLS mostra os proprios ao dono.
export async function listOwnedEvents(
  client: SupabaseClient<Database>,
  establishmentId: string,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  return listEventsByEstablishment(client, establishmentId, 'desc', cursor, limit);
}
```

- [ ] **Step 2: Substituir `listNotifications`**

```ts
/**
 * Avisos mais recentes primeiro. Cursor desce junto com a ordenacao.
 *
 * Invariante: esta ordenacao (created_at desc) deve casar com o fallback mock
 * em packages/core/src/services/catalog.ts (mockListNotifications).
 */
export async function listNotifications(
  client: SupabaseClient<Database>,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<AppNotification>> {
  let query = client
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  const decoded = decodeCursor(cursor);
  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.value},and(created_at.eq.${decoded.value},id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const items = (data ?? []).map(mapNotification);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.created_at, id: last.id });
  return { items, nextCursor };
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/queries/catalog.ts
git commit -m "Paginate remaining catalog list queries"
```

---

### Task 6: Atualizar a fachada de service

A fachada precisa paginar o mock também, senão o app sem Supabase configurado quebra.

**Files:**
- Modify: `packages/core/src/services/catalog.ts`

- [ ] **Step 1: Adicionar imports**

No topo, junto dos outros imports relativos:

```ts
import {
  type CatalogPage,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
} from '../utils/pagination';
```

- [ ] **Step 2: Adicionar o helper de paginação do mock**

Logo após a função `sortByStartsAtAsc`:

```ts
/**
 * Fatiamento do mock equivalente ao cursor da query real, para o app continuar
 * navegavel sem Supabase configurado. `keyOf` extrai o valor da coluna de
 * ordenacao de cada item.
 */
function paginateMock<T extends { id: string }>(
  items: T[],
  cursor: string | null,
  limit: number,
  keyOf: (item: T) => string,
): CatalogPage<T> {
  const decoded = decodeCursor(cursor);
  const startIndex = decoded
    ? items.findIndex((item) => keyOf(item) === decoded.value && item.id === decoded.id) + 1
    : 0;
  const page = items.slice(startIndex, startIndex + limit);
  const last = page.at(-1);
  const hasMore = startIndex + limit < items.length;
  return {
    items: page,
    nextCursor: hasMore && last ? encodeCursor({ value: keyOf(last), id: last.id }) : null,
  };
}
```

- [ ] **Step 3: Substituir as 5 fachadas**

```ts
export async function listEvents(
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return paginateMock(mockListEvents(), cursor, limit, (event) => event.starts_at);
  }
  try {
    return await coreQueries.listEvents(client, cursor, limit);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listEvents' });
  }
}

export async function listEstablishments(
  cityId?: string,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Establishment>> {
  const client = getConfiguredSupabase();
  if (client === null) {
    const sorted = [...mockListEstablishments(cityId)].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
    return paginateMock(sorted, cursor, limit, (establishment) => establishment.name);
  }
  try {
    return await coreQueries.listEstablishments(client, cityId, cursor, limit);
  } catch (error) {
    return handleServiceError(error, {
      method: 'catalog.listEstablishments',
      args: { cityId },
    });
  }
}

export async function listEventsByEstablishment(
  establishmentId: string,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return paginateMock(
      mockListEventsByEstablishment(establishmentId),
      cursor,
      limit,
      (event) => event.starts_at,
    );
  }
  try {
    return await coreQueries.listEventsByEstablishment(
      client,
      establishmentId,
      'asc',
      cursor,
      limit,
    );
  } catch (error) {
    return handleServiceError(error, {
      method: 'catalog.listEventsByEstablishment',
      args: { establishmentId },
    });
  }
}

/** Agenda de gestao do dono: mais recente primeiro, rascunhos incluidos. */
export async function listOwnedEvents(
  establishmentId: string,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return paginateMock(
      mockListOwnedEvents(establishmentId),
      cursor,
      limit,
      (event) => event.starts_at,
    );
  }
  try {
    return await coreQueries.listOwnedEvents(client, establishmentId, cursor, limit);
  } catch (error) {
    return handleServiceError(error, {
      method: 'catalog.listOwnedEvents',
      args: { establishmentId },
    });
  }
}

export async function listNotifications(
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<AppNotification>> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return paginateMock(
      mockListNotifications(),
      cursor,
      limit,
      (notification) => notification.created_at,
    );
  }
  try {
    return await coreQueries.listNotifications(client, cursor, limit);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listNotifications' });
  }
}
```

- [ ] **Step 4: Rodar typecheck do core**

Run: `pnpm --filter @agenda/core typecheck`
Expected: sem erros no core. Os apps ainda vão quebrar — Tasks 11 e 12 cuidam disso.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/services/catalog.ts
git commit -m "Paginate catalog service facade with mock slicing"
```

---

### Task 7: Atualizar os testes de catalog para o novo contrato

**Files:**
- Modify: `packages/core/src/services/catalog.test.ts`

- [ ] **Step 1: Rodar a suíte para ver o que quebrou**

Run: `pnpm --filter @agenda/core test -- catalog.test.ts`
Expected: FAIL — os testes esperam array e agora recebem `{ items, nextCursor }`.

- [ ] **Step 2: Ajustar os asserts existentes**

Em cada teste que chama uma das 5 funções paginadas, troque o acesso direto ao array por `.items`. O padrão:

```ts
// antes
const events = await listEvents();
expect(events).toHaveLength(EVENTS.length);

// depois
const page = await listEvents();
expect(page.items).toHaveLength(Math.min(EVENTS.length, 20));
```

Aplique em `listEvents`, `listEstablishments`, `listEventsByEstablishment` e `listNotifications`, **nos dois blocos** (mock e client fake). `isSortedAscByStartsAt(...)` passa a receber `page.items`.

- [ ] **Step 3: Adicionar testes de paginação**

Acrescente ao final do arquivo:

```ts
describe('paginacao por cursor', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(createFakeClient());
  });

  it('respeita o limite pedido na primeira pagina', async () => {
    const page = await listEvents(null, 2);

    expect(page.items).toHaveLength(2);
  });

  it('devolve nextCursor quando ainda ha itens', async () => {
    const page = await listEvents(null, 2);

    expect(page.nextCursor).not.toBeNull();
  });

  it('devolve nextCursor null quando a pagina nao enche', async () => {
    const page = await listEvents(null, 999);

    expect(page.nextCursor).toBeNull();
  });

  it('a segunda pagina nao repete itens da primeira', async () => {
    const first = await listEvents(null, 2);
    const second = await listEvents(first.nextCursor, 2);

    const firstIds = first.items.map((item) => item.id);
    const secondIds = second.items.map((item) => item.id);

    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it('pagina o mock quando nao ha client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);

    const first = await listEvents(null, 1);
    const second = await listEvents(first.nextCursor, 1);

    expect(first.items).toHaveLength(1);
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });
});
```

- [ ] **Step 4: Rodar os testes**

Run: `pnpm --filter @agenda/core test -- catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/services/catalog.test.ts
git commit -m "Update catalog tests for paginated contract"
```

---

### Task 8: Query key, cache buster e hooks

**Files:**
- Modify: `packages/core/src/services/queryKeys.ts`
- Modify: `packages/core/src/services/cachePolicy.ts`
- Modify: `packages/core/src/hooks/queries.ts`

- [ ] **Step 1: Adicionar a key `events.list`**

Em `packages/core/src/services/queryKeys.ts`, dentro do objeto `events`, logo após a linha do `root`:

```ts
    // Feed paginado. Primeiro segmento 'events' de proposito: a invalidacao
    // por prefixo do realtime precisa alcancar esta key tambem.
    list: ['events', 'list'] as const,
```

- [ ] **Step 2: Incrementar o CACHE_BUSTER**

Em `packages/core/src/services/cachePolicy.ts`, altere o valor e acrescente a linha final do docblock:

```ts
/**
 * Versão do schema das queries persistidas. INCREMENTE este valor a cada
 * mudança na forma dos dados persistidos (queryKeys, shape de dados em cache):
 * o `buster` do PersistQueryClientProvider descarta caches antigos quando o
 * valor muda, evitando reidratar dados incompatíveis.
 *
 * Campo novo em `establishmentSchema`/`eventSchema` conta como mudança de shape:
 * a rehidratação NÃO passa pelo Zod, então o `.default([])` não preenche o campo
 * ausente e o cache antigo chega à UI incompleto. v1 -> v2: `attributes`.
 * v2 -> v3: listagens viraram infinite query ({ pages, pageParams }).
 */
export const CACHE_BUSTER = 'v3';
```

- [ ] **Step 3: Migrar os hooks**

Em `packages/core/src/hooks/queries.ts`, troque a linha de import do TanStack:

```ts
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
```

E substitua as quatro funções de listagem, acrescentando a quinta:

```ts
export function useEventsQuery() {
  return useInfiniteQuery({
    queryKey: catalogKeys.events.list,
    queryFn: ({ pageParam }) => catalog.listEvents(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useEstablishmentsQuery(cityId?: string) {
  return useInfiniteQuery({
    queryKey: catalogKeys.establishments.list(cityId),
    queryFn: ({ pageParam }) => catalog.listEstablishments(cityId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useEventsByEstablishmentQuery(establishmentId: string) {
  return useInfiniteQuery({
    queryKey: catalogKeys.events.byEstablishment(establishmentId),
    queryFn: ({ pageParam }) => catalog.listEventsByEstablishment(establishmentId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!establishmentId,
  });
}

export function useNotificationsQuery() {
  return useInfiniteQuery({
    queryKey: catalogKeys.notifications,
    queryFn: ({ pageParam }) => catalog.listNotifications(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

```

`useEventQuery`, `useEstablishmentQuery`, `useMusicStylesQuery`, `useCitiesQuery` e `useEventAttractionsQuery` **não mudam**.

**Não crie um `useOwnedEventsQuery` aqui.** A agenda do dono já tem hook próprio em `apps/web-client/hooks/use-owned-events.ts`, que resolve o `establishmentId` a partir do vínculo do usuário. Um segundo hook no core ficaria sem consumidor — código órfão, exatamente o que a limpeza de knip existe para evitar. A Task 13 migra o hook do web-client.

- [ ] **Step 4: Rodar typecheck e testes do core**

Run: `pnpm --filter @agenda/core typecheck && pnpm --filter @agenda/core test`
Expected: sem erros. Se `cachePolicy.test.ts` ou `queryKeys.test.ts` assertarem `'v2'`, atualize o assert para `'v3'` e rode de novo.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/services/queryKeys.ts packages/core/src/services/cachePolicy.ts packages/core/src/hooks/queries.ts
git commit -m "Migrate catalog list hooks to useInfiniteQuery and bump cache buster"
```

---

### Task 9: Hook de sentinela para infinite scroll na web

**Files:**
- Create: `packages/core/src/hooks/useInfiniteScrollSentinel.ts`
- Test: `packages/core/src/hooks/useInfiniteScrollSentinel.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Escrever o teste que falha**

O docblock `@jest-environment jsdom` é obrigatório: o `testEnvironment` global do core é `node`. O arquivo é `.ts` (não `.tsx`) porque o `testMatch` do core é `**/*.test.ts`. Padrão idêntico ao de `packages/core/src/hooks/useFeatureFlag.test.ts`.

Crie `packages/core/src/hooks/useInfiniteScrollSentinel.test.ts`:

```ts
/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';

import { useInfiniteScrollSentinel } from './useInfiniteScrollSentinel';

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

let lastCallback: ObserverCallback | null = null;
const observe = jest.fn();
const disconnect = jest.fn();

beforeEach(() => {
  lastCallback = null;
  observe.mockClear();
  disconnect.mockClear();

  class FakeIntersectionObserver {
    constructor(callback: ObserverCallback) {
      lastCallback = callback;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = jest.fn();
    takeRecords = jest.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  }

  global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe('useInfiniteScrollSentinel', () => {
  it('nao chama fetchNextPage quando a sentinela nao esta visivel', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );

    lastCallback?.([{ isIntersecting: false }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('chama fetchNextPage quando a sentinela entra na viewport', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );

    lastCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('nao busca quando nao ha proxima pagina', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: false, isFetchingNextPage: false }),
    );

    lastCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('nao busca enquanto uma busca ja esta em curso', () => {
    const fetchNextPage = jest.fn();
    renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: true }),
    );

    lastCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('desconecta o observer ao desmontar', () => {
    const fetchNextPage = jest.fn();
    const { unmount } = renderHook(() =>
      useInfiniteScrollSentinel({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
    );

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `pnpm --filter @agenda/core test -- useInfiniteScrollSentinel.test.ts`
Expected: FAIL com "Cannot find module './useInfiniteScrollSentinel'"

- [ ] **Step 3: Implementar o hook**

Crie `packages/core/src/hooks/useInfiniteScrollSentinel.ts`:

```ts
import { useEffect, useRef } from 'react';

export interface InfiniteScrollSentinelOptions {
  fetchNextPage: () => unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /**
   * Antecipacao da busca, como fracao da viewport. 0.2 dispara quando falta
   * 20% para o fim — o equivalente web do onEndReachedThreshold do FlashList.
   */
  threshold?: number;
}

/**
 * Dispara a proxima pagina quando o elemento sentinela se aproxima da
 * viewport. Retorna o ref a ser colado num elemento no fim da lista.
 */
export function useInfiniteScrollSentinel({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  threshold = 0.2,
}: InfiniteScrollSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    const element = sentinelRef.current;
    const rootMargin = `0px 0px ${Math.round(threshold * 100)}% 0px`;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPage();
        }
      },
      { rootMargin },
    );
    if (element) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, threshold]);

  return sentinelRef;
}
```

- [ ] **Step 4: Rodar o teste**

Run: `pnpm --filter @agenda/core test -- useInfiniteScrollSentinel.test.ts`
Expected: PASS — 5 testes.

- [ ] **Step 5: Exportar no index**

Em `packages/core/src/index.ts`, no bloco de hooks, entre `export * from './hooks/useGuardedPress';` e `export * from './hooks/useNearbyEstablishments';`:

```ts
export * from './hooks/useInfiniteScrollSentinel';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/hooks/useInfiniteScrollSentinel.ts packages/core/src/hooks/useInfiniteScrollSentinel.test.ts packages/core/src/index.ts
git commit -m "Add IntersectionObserver sentinel hook for web infinite scroll"
```

---

### Task 10: Migração dos índices ausentes

**Files:**
- Create: `supabase/migrations/20260903120000_events_pagination_indexes.sql`

- [ ] **Step 1: Criar a migração**

```sql
-- events.establishment_id e filtrado em toda listagem por bar
-- (listEventsByEstablishment, listOwnedEvents) e nao tinha indice: o Postgres
-- fazia seq scan. Com paginacao por cursor a query passa a rodar mais vezes,
-- em lotes menores, o que torna o indice mais relevante ainda.
CREATE INDEX IF NOT EXISTS events_establishment_id_idx
  ON public.events (establishment_id);

-- O cursor de eventos ordena por (starts_at, id): indice composto cobre a
-- ordenacao e o filtro de continuacao numa unica varredura.
CREATE INDEX IF NOT EXISTS events_starts_at_id_idx
  ON public.events (starts_at, id);

-- Cursor de estabelecimentos ordena por (name, id).
CREATE INDEX IF NOT EXISTS establishments_name_id_idx
  ON public.establishments (name, id);

-- Cursor de avisos ordena por (created_at desc, id desc).
CREATE INDEX IF NOT EXISTS notifications_created_at_id_idx
  ON public.notifications (created_at DESC, id DESC);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260903120000_events_pagination_indexes.sql
git commit -m "Add indexes supporting cursor pagination"
```

---

### Task 11: Consumo no mobile (FlashList)

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/notifications.tsx`
- Modify: `apps/mobile/app/(tabs)/favorites.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Adaptar a leitura de dados na home**

Em `apps/mobile/app/(tabs)/index.tsx`, adicione `flattenPages` ao import de `@agenda/core` e troque a leitura das queries. Onde hoje existem chamadas diretas aos hooks, passe a guardar a query inteira:

```tsx
const eventsQuery = useEventsQuery();
const establishmentsQuery = useEstablishmentsQuery();
const events = flattenPages(eventsQuery.data);
const establishments = flattenPages(establishmentsQuery.data);
```

Todo lugar que antes lia `data` das listagens agora usa `events` / `establishments`. `applyEventFilters` e `applyEstablishmentFilters` continuam recebendo array plano, sem mudança de assinatura.

- [ ] **Step 2: Ligar o infinite scroll nas duas FlashList**

Substitua o bloco das listas (por volta da linha 283):

```tsx
      {activeTab === 0 ? (
        <FlashList
          data={filteredEvents}
          keyExtractor={(event) => event.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={eventsListHeader}
          renderItem={renderEvent}
          onEndReachedThreshold={0.2}
          onEndReached={() => {
            if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
              void eventsQuery.fetchNextPage();
            }
          }}
        />
      ) : (
        <FlashList
          data={cityEstablishments}
          keyExtractor={(e) => e.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={barsListHeader}
          renderItem={({ item }) => <EstablishmentCard establishment={item} />}
          onEndReachedThreshold={0.2}
          onEndReached={() => {
            if (establishmentsQuery.hasNextPage && !establishmentsQuery.isFetchingNextPage) {
              void establishmentsQuery.fetchNextPage();
            }
          }}
        />
      )}
```

- [ ] **Step 3: Adaptar notifications**

Em `apps/mobile/app/(tabs)/notifications.tsx`, aplique o mesmo padrão: guardar a query, achatar com `flattenPages`, e acrescentar à FlashList:

```tsx
          onEndReachedThreshold={0.2}
          onEndReached={() => {
            if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
              void notificationsQuery.fetchNextPage();
            }
          }}
```

- [ ] **Step 4: Adaptar favorites e o badge de contagem**

Em `apps/mobile/app/(tabs)/favorites.tsx`, apenas troque a leitura para `flattenPages(query.data)`. **Não** adicione `onEndReached` — favoritos é uma lista filtrada localmente, não uma listagem paginável.

Em `apps/mobile/app/(tabs)/_layout.tsx`, que usa `useNotificationsQuery()` só para o badge, a contagem passa a ser:

```tsx
const notificationsQuery = useNotificationsQuery();
const unreadCount = flattenPages(notificationsQuery.data).filter((item) => !item.read).length;
```

- [ ] **Step 5: Verificar typecheck e testes do mobile**

Run: `pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile test`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app
git commit -m "Wire infinite scroll into mobile FlashLists"
```

---

### Task 12: Consumo nos apps web e admin

**Files:**
- Modify: `apps/web/app/(app)/page.tsx`
- Modify: `apps/web/app/(app)/notices/page.tsx`
- Modify: `apps/web/app/(app)/favorites/page.tsx`
- Modify: `apps/web/app/(app)/map/page.tsx`
- Modify: `apps/web/app/(app)/establishment/[id]/page.tsx`
- Modify: `apps/web/hooks/useUnreadCount.ts`
- Modify: `apps/admin/app/(admin)/page.tsx`
- Modify: `apps/admin/app/(admin)/events/page.tsx`
- Modify: `apps/admin/app/(admin)/establishments/page.tsx`
- Modify: `apps/admin/app/(admin)/notices/page.tsx`

- [ ] **Step 1: Adaptar a leitura de dados em todos os consumidores**

Em cada arquivo, onde hoje há desestruturação direta do `data`, passe a guardar a query e achatar:

```tsx
const eventsQuery = useEventsQuery();
const events = flattenPages(eventsQuery.data);
```

Importe `flattenPages` de `@agenda/core`. O mesmo para `useEstablishmentsQuery` e `useNotificationsQuery`. Onde o código usava `isPending` da query, continue usando `eventsQuery.isPending` (o `useInfiniteQuery` expõe o mesmo campo).

Em `map/page.tsx` e `establishment/[id]/page.tsx` **só** troque a leitura — essas telas usam os dados para marcadores e para o top-5 de próximos eventos, não são listagens roláveis. Não adicione sentinela nelas.

- [ ] **Step 2: Adicionar a sentinela no feed do web**

Em `apps/web/app/(app)/page.tsx`, após declarar `eventsQuery`:

```tsx
const sentinelRef = useInfiniteScrollSentinel({
  fetchNextPage: eventsQuery.fetchNextPage,
  hasNextPage: eventsQuery.hasNextPage,
  isFetchingNextPage: eventsQuery.isFetchingNextPage,
});
```

E no JSX, imediatamente depois do `.map()` que renderiza os cards:

```tsx
<div ref={sentinelRef} aria-hidden className="h-px" />
{eventsQuery.isFetchingNextPage ? (
  <p className="text-muted-foreground py-4 text-center text-[13px]">Carregando mais…</p>
) : null}
```

Importe `useInfiniteScrollSentinel` de `@agenda/core`.

- [ ] **Step 3: Adicionar a sentinela nas listagens longas do admin**

Aplique o mesmo padrão do Step 2 em `apps/admin/app/(admin)/events/page.tsx` e `apps/admin/app/(admin)/establishments/page.tsx`. As páginas de dashboard e `notices` do admin só consomem para resumo/contagem — nelas, apenas o Step 1.

- [ ] **Step 4: Verificar typecheck e lint do monorepo**

Run: `pnpm typecheck && pnpm lint`
Expected: sem erros em nenhum workspace.

- [ ] **Step 5: Commit**

```bash
git add apps/web apps/admin
git commit -m "Wire infinite scroll sentinel into web and admin listings"
```

---

### Task 13: Consumo no `apps/web-client` (agenda do dono)

O `web-client` tem hooks próprios que chamam `listOwnedEvents` diretamente, fora de `packages/core/src/hooks/queries.ts`. Eles quebram com a mudança de contrato e não são alcançados pelas tasks anteriores.

**Files:**
- Modify: `apps/web-client/hooks/use-owned-events.ts`
- Modify: `apps/web-client/hooks/use-owned-metrics.ts`
- Modify: `apps/web-client/app/(painel)/events/page.tsx`
- Modify: `apps/web-client/app/(painel)/metrics/page.tsx`

- [ ] **Step 1: Migrar `useOwnedEvents` para infinite query**

Em `apps/web-client/hooks/use-owned-events.ts`, troque o import e a função. `useQuery` continua importado se outro hook do arquivo o usar — aqui só `useMutation` e `useQueryClient` seguem necessários:

```tsx
import {
  catalogKeys,
  deleteOwnedEvent,
  deleteOwnedEventGroup,
  listOwnedEvents,
} from '@agenda/core';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useOwnedEstablishmentId } from './use-owned-establishment';

/**
 * Agenda completa do bar do dono, rascunhos incluídos. Só dispara depois de
 * haver vínculo — sem id a query ficaria pendurada num `''`.
 *
 * Sem `signal`: listOwnedEvents(establishmentId) não recebe AbortSignal (o
 * supabase-js do core não expõe cancelamento nessa camada).
 */
export function useOwnedEvents() {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useInfiniteQuery({
    queryKey: catalogKeys.events.owned(establishmentId ?? ''),
    queryFn: ({ pageParam }) => listOwnedEvents(establishmentId ?? '', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(establishmentId),
  });
}
```

As três funções abaixo no arquivo (`useInvalidateEvents`, `useDeleteOwnedEvent`, `useDeleteOwnedEventGroup`) **não mudam** — invalidar por `catalogKeys.events.root` continua alcançando a key paginada, porque o primeiro segmento continua sendo `'events'`.

- [ ] **Step 2: Corrigir `useOwnedFavoritesCount`**

Em `apps/web-client/hooks/use-owned-metrics.ts`, a função lê `data` como array. Adicione `flattenPages` ao import de `@agenda/core` e ajuste:

```tsx
/** Contagem de favoritos por evento do bar do dono. */
export function useOwnedFavoritesCount() {
  const eventsQuery = useOwnedEvents();
  const eventIds = flattenPages(eventsQuery.data).map((event) => event.id);
```

Atenção ao docblock de `metricsKeys.favoritesCount`: ele explica que os ids entram ordenados na key para não invalidar o cache à toa. Isso continua valendo e não muda — mas agora a lista de ids cresce conforme o dono rola a agenda, então a key muda a cada página carregada. Se isso se mostrar custoso na prática, a correção é buscar a contagem por período em vez de por lista de ids — fora do escopo desta task.

- [ ] **Step 3: Adaptar a página de eventos**

Em `apps/web-client/app/(painel)/events/page.tsx`, troque a desestruturação:

```tsx
  const eventsQuery = useOwnedEvents();
  const events = flattenPages(eventsQuery.data);
  const isPending = eventsQuery.isPending;
```

Importe `flattenPages` e `useInfiniteScrollSentinel` de `@agenda/core`, e adicione a sentinela ao final da lista renderizada:

```tsx
const sentinelRef = useInfiniteScrollSentinel({
  fetchNextPage: eventsQuery.fetchNextPage,
  hasNextPage: eventsQuery.hasNextPage,
  isFetchingNextPage: eventsQuery.isFetchingNextPage,
});
```

```tsx
<div ref={sentinelRef} aria-hidden className="h-px" />
{eventsQuery.isFetchingNextPage ? (
  <p className="text-muted-foreground py-4 text-center text-[13px]">Carregando mais…</p>
) : null}
```

- [ ] **Step 4: Adaptar a página de métricas**

Em `apps/web-client/app/(painel)/metrics/page.tsx`, a linha 33 desestrutura `data` e `isPending`. Troque por:

```tsx
  const eventsQuery = useOwnedEvents();
  const events = flattenPages(eventsQuery.data);
  const eventsPending = eventsQuery.isPending;
```

Importe `flattenPages` de `@agenda/core`. **Não** adicione sentinela aqui — a tela de métricas agrega os eventos, não os lista para rolagem.

Ressalva conhecida: as métricas passam a considerar apenas os eventos já carregados. Para a maioria dos bares (dezenas de eventos) isso é invisível, mas com uma agenda muito longa o número exibido pode ficar parcial até o dono rolar. A correção definitiva é agregar no banco por RPC em vez de contar no cliente — registre como débito se aparecer na revisão.

- [ ] **Step 5: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web-client typecheck && pnpm --filter @agenda/web-client lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/web-client
git commit -m "Migrate owner agenda hooks to paginated contract"
```

---

### Task 14: CHANGELOGs e verificação final

Todo commit que altera código exige CHANGELOG (AGENTS_RULES.md Seção 6). Esta task consolida os do trabalho inteiro.

**Files:**
- Create/Modify: `apps/mobile/CHANGELOG-alfa-v<próxima>.md`
- Create/Modify: `apps/web/CHANGELOG-alfa-v<próxima>.md`
- Create/Modify: `apps/admin/CHANGELOG-alfa-v<próxima>.md`
- Create/Modify: `packages/core/CHANGELOG-alfa-v<próxima>.md`

- [ ] **Step 1: Descobrir a versão de cada projeto**

Run: `node -e "['apps/mobile','apps/web','apps/admin','apps/web-client','packages/core'].forEach(p=>console.log(p, require('./'+p+'/package.json').version))"`
Expected: imprime a versão atual de cada um. O CHANGELOG é sempre da versão **seguinte** (patch +1). Use os nomes de arquivo com esse valor.

- [ ] **Step 2: Escrever os bullets (acrescentando, nunca sobrescrevendo)**

Em `apps/web-client`:

```markdown
- Agenda de eventos do painel carrega aos poucos conforme você rola
```

Nos CHANGELOGs de `apps/mobile`, `apps/web` e `apps/admin`:

```markdown
- Listas de eventos e bares carregam aos poucos conforme você rola, em vez de trazer tudo de uma vez
- Bares passam a aparecer em ordem alfabética
```

Em `packages/core`:

```markdown
- Listagens do catálogo passam a paginar por cursor, com utilitários compartilhados de paginação
- Índices novos aceleram a busca de eventos por estabelecimento
```

- [ ] **Step 3: Rodar a verificação completa**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: os três passam. Relate o resultado real — se algo falhar, corrija antes de encerrar.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/CHANGELOG-alfa-*.md apps/web/CHANGELOG-alfa-*.md apps/admin/CHANGELOG-alfa-*.md apps/web-client/CHANGELOG-alfa-*.md packages/core/CHANGELOG-alfa-*.md
git commit -m "Add changelog entries for catalog pagination"
```

---

## Verificação manual (só sob pedido explícito)

`supabase start` não roda sem autorização do usuário (AGENTS_RULES.md). Se autorizado:

1. `supabase start && supabase db reset`
2. `pnpm dev:web` — abrir o feed, rolar até o fim, confirmar carregamento incremental.
3. `pnpm dev:mobile` — mesma verificação nas duas abas da home.
