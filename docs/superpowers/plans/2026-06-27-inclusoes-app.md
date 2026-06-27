# Inclusões no app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 6 inclusões ao app mobile — filtro de calendário por intervalo, ordenação configurável, fotos do evento em carrossel, horário "de x até y", atrações secundárias e prévia de eventos na tela do estabelecimento (com aba Bares no feed) — de forma aditiva, sem regredir feed/card/busca atuais.

**Architecture:** Camada de dados primeiro (migration aditiva + schemas Zod + queries do core), que desbloqueia as features de UI. `attraction` e `banner_url` permanecem como fonte de verdade do headliner/destaque; `photo_urls` (array) e `event_attractions` (tabela) são puramente aditivos. Lógica de filtro/ordenação concentrada na função pura `applyEventFilters` (testada como contrato). Telas reusam componentes existentes (`SegmentedTabs`, `EstablishmentCard`, `EventCard`, `useEventsByEstablishmentQuery`).

**Tech Stack:** Expo SDK 56 (Expo Router), Nativewind, TypeScript strict, Zod, TanStack Query, Supabase (Postgres + PostGIS), Jest + jest-expo, `@react-native-community/datetimepicker`.

**Fora de escopo:** Cadastro de fotos extras e atrações secundárias no `apps/admin` — o admin é hoje só um esqueleto (sem CRUD de eventos). É dependência externa citada na spec; o app mobile consome os campos via mocks/dados existentes e está pronto para o admin quando ele existir.

**Spec:** `docs/superpowers/specs/2026-06-27-inclusoes-app-design.md`

---

## Convenções deste plano

- Testes rodam de `apps/mobile`: `pnpm --filter @agenda/mobile test` ou, dentro do dir, `pnpm jest <arquivo>`.
- Core roda de `packages/core`: `pnpm --filter @agenda/core test` (se houver) ou `pnpm jest`.
- TypeScript: `pnpm --filter @agenda/mobile exec tsc --noEmit`.
- **Nunca rodar `git commit`** — preferência do dono do repo. Os passos "Commit" abaixo significam: deixar tudo **staged** (`git add ...`) com a mensagem sugerida documentada; o dono commita. Onde se lê "Commit", execute apenas o `git add`.
- AGENTS.md: todo `services`/`utils` novo ou alterado exige teste de contrato. Refactor preserva valor de retorno exato.

---

## Bloco A — Camada de dados (desbloqueia tudo)

### Task A1: Migration aditiva (photo_urls + event_attractions)

**Files:**
- Create: `supabase/migrations/20260627120000_event_photos_and_attractions.sql`

- [ ] **Step 1: Criar a migration**

```sql
-- #4 fotos: banner_url segue sendo o destaque (feed); photo_urls = fotos extras do carrossel
ALTER TABLE public.events
  ADD COLUMN photo_urls TEXT[] NOT NULL DEFAULT '{}'::text[];

-- #6 atrações secundárias: attraction (string) segue como headliner; tabela SÓ p/ secundárias
CREATE TABLE public.event_attractions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX event_attractions_event_idx ON public.event_attractions(event_id);

ALTER TABLE public.event_attractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_event_attractions
  ON public.event_attractions FOR SELECT USING (true);
```

- [ ] **Step 2: Validar sintaxe localmente (se Supabase CLI disponível)**

Run: `supabase db reset --local` (ou `supabase migration up` se aplicável)
Expected: aplica sem erro. Se o CLI não estiver disponível no ambiente, revisar o SQL manualmente — a migration é aditiva e não altera dados existentes.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260627120000_event_photos_and_attractions.sql
# msg: "feat(db): add event photo_urls column and event_attractions table"
```

---

### Task A2: Schema Zod — photo_urls em Event + EventAttraction

**Files:**
- Modify: `packages/core/src/schemas/catalog.ts`

- [ ] **Step 1: Adicionar `photo_urls` ao `eventSchema`**

Em `eventSchema`, após `banner_url`, adicionar:

```ts
  banner_url: z.string().url(),
  photo_urls: z.array(z.string().url()).default([]),
```

- [ ] **Step 2: Adicionar `eventAttractionSchema` e tipo (após `eventSchema`)**

```ts
export const eventAttractionSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  name: z.string(),
  position: z.number().int().nonnegative().default(0),
});
```

E na seção de tipos (junto aos demais `export type ... = z.infer<...>`):

```ts
export type EventAttraction = z.infer<typeof eventAttractionSchema>;
```

- [ ] **Step 3: Re-exportar no mobile** (`apps/mobile/src/data/schemas.ts`)

Adicionar ao bloco de re-export de `@agenda/core`:

```ts
  type EventAttraction,
  eventAttractionSchema,
```

- [ ] **Step 4: Verificar tipos**

Run: `pnpm --filter @agenda/core exec tsc --noEmit && pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/schemas/catalog.ts apps/mobile/src/data/schemas.ts
# msg: "feat(core): add photo_urls to Event and EventAttraction schema"
```

---

### Task A3: Core query — listEventAttractions + EVENT_COLUMNS

**Files:**
- Modify: `packages/core/src/queries/catalog.ts`

- [ ] **Step 1: Incluir `photo_urls` em `EVENT_COLUMNS` e no `mapEvent`**

`EVENT_COLUMNS` passa a:

```ts
const EVENT_COLUMNS =
  'id,name,attraction,description,banner_url,photo_urls,music_style_ids,establishment_id,starts_at,ends_at,cover_charge,courtesy,promo,slug';
```

Em `mapEvent`, após `banner_url: row.banner_url,` adicionar:

```ts
    photo_urls: row.photo_urls ?? [],
```

> Nota: `row.photo_urls` virá tipado quando `database.types.ts` for regenerado em CI. Até lá, o `?? []` cobre `null`/ausência. Se o tipo gerado ainda não tiver a coluna, use `(row as { photo_urls?: string[] }).photo_urls ?? []` para não usar `any`.

- [ ] **Step 2: Adicionar query `listEventAttractions`**

Após `listEventsByEstablishment`, adicionar (seguindo o padrão das demais funções do arquivo):

```ts
const EVENT_ATTRACTION_COLUMNS = 'id,event_id,name,position';

export async function listEventAttractions(
  client: SupabaseClient,
  eventId: string,
): Promise<EventAttraction[]> {
  const { data, error } = await client
    .from('event_attractions')
    .select(EVENT_ATTRACTION_COLUMNS)
    .eq('event_id', eventId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) =>
    eventAttractionSchema.parse({
      id: row.id,
      event_id: row.event_id,
      name: row.name,
      position: row.position,
    }),
  );
}
```

Adicionar ao import de schemas no topo: `eventAttractionSchema, type EventAttraction`.

- [ ] **Step 3: Verificar tipos**

Run: `pnpm --filter @agenda/core exec tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/queries/catalog.ts
# msg: "feat(core): query event_attractions and select photo_urls"
```

---

### Task A4: Service mobile + hook — listEventAttractions

**Files:**
- Modify: `apps/mobile/src/services/catalog.ts`
- Modify: `apps/mobile/src/services/queryKeys.ts`
- Modify: `apps/mobile/src/hooks/queries.ts`
- Modify: `apps/mobile/src/data/mock.ts` (adicionar mock de atrações)
- Test: `apps/mobile/src/services/catalog.test.ts`

- [ ] **Step 1: Adicionar mock de atrações** em `apps/mobile/src/data/mock.ts`

No final do arquivo, exportar (use ids de eventos que já existam no mock, ex. `ev1`):

```ts
export const EVENT_ATTRACTIONS = [
  { id: 'att1', event_id: 'ev1', name: 'DJ Convidado', position: 0 },
  { id: 'att2', event_id: 'ev1', name: 'Banda Abertura', position: 1 },
];
```

- [ ] **Step 2: Adicionar a query key** em `apps/mobile/src/services/queryKeys.ts`

Dentro de `events`, adicionar:

```ts
    attractions: (eventId: string) =>
      ['events', 'attractions', eventId] as const,
```

- [ ] **Step 3: Escrever o teste de contrato** em `apps/mobile/src/services/catalog.test.ts`

Adicionar (seguindo o padrão dos testes do arquivo — fallback de mock quando sem client):

```ts
describe('listEventAttractions', () => {
  it('retorna atrações do evento ordenadas por position', async () => {
    const result = await listEventAttractions('ev1');
    expect(result.map((a) => a.id)).toEqual(['att1', 'att2']);
    expect(result.every((a) => a.event_id === 'ev1')).toBe(true);
  });

  it('retorna [] para evento sem atrações', async () => {
    const result = await listEventAttractions('inexistente');
    expect(result).toEqual([]);
  });
});
```

Importar `listEventAttractions` no topo do teste.

- [ ] **Step 4: Rodar o teste e ver falhar**

Run: `pnpm --filter @agenda/mobile exec jest src/services/catalog.test.ts -t "listEventAttractions"`
Expected: FAIL — `listEventAttractions is not a function`.

- [ ] **Step 5: Implementar no service** `apps/mobile/src/services/catalog.ts`

Imports: adicionar `EVENT_ATTRACTIONS` ao import de `../data/mock`; adicionar `type EventAttraction, eventAttractionSchema` ao import de `../data/schemas`.

Adicionar helper de mock + função pública:

```ts
const eventAttractionListSchema = z.array(eventAttractionSchema);

function mockListEventAttractions(eventId: string): EventAttraction[] {
  const items = EVENT_ATTRACTIONS.filter((a) => a.event_id === eventId).sort(
    (a, b) => a.position - b.position,
  );
  return eventAttractionListSchema.parse(items);
}

export async function listEventAttractions(
  eventId: string,
): Promise<EventAttraction[]> {
  const client = getSupabase();
  if (client === null) {
    return mockListEventAttractions(eventId);
  }
  try {
    return await coreQueries.listEventAttractions(client, eventId);
  } catch (error) {
    return handleServiceError(error, {
      method: 'catalog.listEventAttractions',
      args: { eventId },
    });
  }
}
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `pnpm --filter @agenda/mobile exec jest src/services/catalog.test.ts -t "listEventAttractions"`
Expected: PASS.

- [ ] **Step 7: Adicionar o hook** em `apps/mobile/src/hooks/queries.ts`

```ts
export function useEventAttractionsQuery(eventId: string) {
  return useQuery({
    queryKey: catalogKeys.events.attractions(eventId),
    queryFn: () => catalog.listEventAttractions(eventId),
    enabled: !!eventId,
  });
}
```

- [ ] **Step 8: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/src/services/catalog.ts apps/mobile/src/services/catalog.test.ts apps/mobile/src/services/queryKeys.ts apps/mobile/src/hooks/queries.ts apps/mobile/src/data/mock.ts
# msg: "feat(mobile): listEventAttractions service + useEventAttractionsQuery hook"
```

---

## Bloco B — Filtros (#1 calendário, #2 ordenar)

### Task B1: Tipos e defaults de filtro (dateRange + sortBy)

**Files:**
- Modify: `apps/mobile/src/utils/filters.ts`

- [ ] **Step 1: Estender `EventFilters` e o default**

Adicionar o tipo `SortBy` no topo (após `DateBucket`):

```ts
export type SortBy = 'date' | 'distance' | 'rating' | 'price';
```

Em `EventFilters`, adicionar:

```ts
  /** intervalo de datas (ISO yyyy-mm-dd local); null = sem intervalo. Precede dateBucket. */
  dateRange: { start: string; end: string } | null;
  sortBy: SortBy;
```

Em `DEFAULT_EVENT_FILTERS`, adicionar:

```ts
  dateRange: null,
  sortBy: 'date',
```

- [ ] **Step 2: Verificar tipos** (vai quebrar onde `EventFilters` é construído sem os campos — esperado, corrigido no store na Task B3)

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: erros apenas em locais que montam `EventFilters` literal (store). Seguir.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/utils/filters.ts
# msg: "feat(mobile): add dateRange and sortBy to EventFilters"
```

---

### Task B2: Lógica de filtro por intervalo + ordenação (TDD)

**Files:**
- Modify: `apps/mobile/src/utils/filters.ts`
- Test: `apps/mobile/src/utils/filters.test.ts`

- [ ] **Step 1: Escrever os testes (falhando)** em `filters.test.ts`

Adicionar um describe novo. (As datas dos eventos do mock são relativas a `NOW`; ajuste os ids esperados conforme o mock real ao implementar — a asserção estrutural abaixo independe disso.)

```ts
describe('dateRange (precede dateBucket)', () => {
  it('filtra eventos cujo starts_at cai dentro do intervalo, inclusivo', () => {
    const start = '2026-06-12';
    const end = '2026-06-12';
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ dateRange: { start, end } }),
      makeContext(),
    );
    for (const ev of result) {
      const d = new Date(ev.starts_at);
      expect(d >= new Date('2026-06-12T00:00:00')).toBe(true);
      expect(d <= new Date('2026-06-12T23:59:59.999')).toBe(true);
    }
  });

  it('quando dateRange está setado, dateBucket é ignorado', () => {
    const withBucket = applyEventFilters(
      EVENTS,
      makeFilters({ dateBucket: 'today', dateRange: { start: '2026-06-12', end: '2026-06-30' } }),
      makeContext(),
    );
    const onlyRange = applyEventFilters(
      EVENTS,
      makeFilters({ dateBucket: 'any', dateRange: { start: '2026-06-12', end: '2026-06-30' } }),
      makeContext(),
    );
    expect(ids(withBucket)).toEqual(ids(onlyRange));
  });
});

describe('sortBy', () => {
  it("'date' (default) ordena por starts_at asc — regressão preservada", () => {
    const result = applyEventFilters(EVENTS, makeFilters({ sortBy: 'date' }), makeContext());
    const times = result.map((e) => new Date(e.starts_at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("'price' ordena por cover_charge asc, desempate por starts_at asc", () => {
    const result = applyEventFilters(EVENTS, makeFilters({ sortBy: 'price' }), makeContext());
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      const cur = result[i];
      expect(prev.cover_charge <= cur.cover_charge).toBe(true);
      if (prev.cover_charge === cur.cover_charge) {
        expect(new Date(prev.starts_at).getTime() <= new Date(cur.starts_at).getTime()).toBe(true);
      }
    }
  });

  it("'rating' ordena por rating_avg do estabelecimento desc", () => {
    const ctx = makeContext();
    const result = applyEventFilters(EVENTS, makeFilters({ sortBy: 'rating' }), ctx);
    for (let i = 1; i < result.length; i++) {
      const prev = ctx.establishmentsById[result[i - 1].establishment_id].rating_avg;
      const cur = ctx.establishmentsById[result[i].establishment_id].rating_avg;
      expect(prev >= cur).toBe(true);
    }
  });

  it("'distance' sem userLocation/nearby cai para ordenação por data", () => {
    const byDate = applyEventFilters(EVENTS, makeFilters({ sortBy: 'date' }), makeContext());
    const byDist = applyEventFilters(EVENTS, makeFilters({ sortBy: 'distance' }), makeContext());
    expect(ids(byDist)).toEqual(ids(byDate));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @agenda/mobile exec jest src/utils/filters.test.ts`
Expected: FAIL nos novos casos (dateRange e sortBy ainda não implementados).

- [ ] **Step 3: Implementar a lógica** em `filters.ts`

3a. Adicionar helper de intervalo (próximo a `isSameLocalDay`):

```ts
function isWithinDateRange(
  iso: string,
  range: { start: string; end: string },
): boolean {
  const day = new Date(iso);
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T23:59:59.999`);
  return day >= start && day <= end;
}
```

3b. No corpo de `applyEventFilters`, **substituir** a checagem de data atual:

```ts
      if (!matchesDateBucket(event, filters.dateBucket, ctx.now)) return false;
```

por (dateRange precede dateBucket):

```ts
      if (filters.dateRange) {
        if (!isWithinDateRange(event.starts_at, filters.dateRange)) return false;
      } else if (!matchesDateBucket(event, filters.dateBucket, ctx.now)) {
        return false;
      }
```

3c. Substituir o `.sort(...)` final por ordenação parametrizada. Trocar:

```ts
    .sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
```

por uma chamada a um comparador novo:

```ts
    .sort(makeComparator(filters, ctx));
```

E adicionar a função (fora de `applyEventFilters`):

```ts
function startsAtAsc(a: Event, b: Event): number {
  return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
}

function makeComparator(
  filters: EventFilters,
  ctx: EventFilterContext,
): (a: Event, b: Event) => number {
  // 'distance' só é viável com origem conhecida; senão cai para 'date'.
  const canDistance = filters.sortBy === 'distance' && !!ctx.userLocation;

  return (a, b) => {
    let primary = 0;
    if (filters.sortBy === 'rating') {
      const ra = ctx.establishmentsById[a.establishment_id]?.rating_avg ?? 0;
      const rb = ctx.establishmentsById[b.establishment_id]?.rating_avg ?? 0;
      primary = rb - ra; // desc
    } else if (filters.sortBy === 'price') {
      primary = a.cover_charge - b.cover_charge; // asc
    } else if (canDistance && ctx.userLocation) {
      const ea = ctx.establishmentsById[a.establishment_id];
      const eb = ctx.establishmentsById[b.establishment_id];
      const da = ea ? haversineDistanceKm(ctx.userLocation, { lat: ea.lat, lng: ea.lng }) : Infinity;
      const db = eb ? haversineDistanceKm(ctx.userLocation, { lat: eb.lat, lng: eb.lng }) : Infinity;
      primary = da - db; // asc
    }
    return primary !== 0 ? primary : startsAtAsc(a, b); // desempate sempre por data
  };
}
```

- [ ] **Step 4: Rodar e ver passar** (incluindo os testes antigos — regressão)

Run: `pnpm --filter @agenda/mobile exec jest src/utils/filters.test.ts`
Expected: PASS em todos, inclusive os pré-existentes.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/filters.ts apps/mobile/src/utils/filters.test.ts
# msg: "feat(mobile): date range filter and configurable sort in applyEventFilters"
```

---

### Task B3: Store de filtros (setters dateRange + sortBy)

**Files:**
- Modify: `apps/mobile/src/store/useFiltersStore.ts`
- Test: `apps/mobile/src/store/useFiltersStore.test.ts`

- [ ] **Step 1: Escrever testes (falhando)** em `useFiltersStore.test.ts`

```ts
it('setDateRange seta o intervalo e zera o dateBucket (mutuamente exclusivos)', () => {
  const store = useFiltersStore.getState();
  store.setDateBucket('today');
  store.setDateRange({ start: '2026-06-12', end: '2026-06-15' });
  const f = useFiltersStore.getState().filters;
  expect(f.dateRange).toEqual({ start: '2026-06-12', end: '2026-06-15' });
  expect(f.dateBucket).toBe('any');
});

it('setDateBucket limpa o dateRange', () => {
  const store = useFiltersStore.getState();
  store.setDateRange({ start: '2026-06-12', end: '2026-06-15' });
  store.setDateBucket('weekend');
  const f = useFiltersStore.getState().filters;
  expect(f.dateRange).toBeNull();
  expect(f.dateBucket).toBe('weekend');
});

it('setSortBy atualiza o critério de ordenação', () => {
  useFiltersStore.getState().setSortBy('price');
  expect(useFiltersStore.getState().filters.sortBy).toBe('price');
});
```

> Se o teste compartilhar estado entre casos, resetar com `useFiltersStore.getState().resetFilters()` em `beforeEach` (seguir o padrão já usado no arquivo).

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @agenda/mobile exec jest src/store/useFiltersStore.test.ts`
Expected: FAIL — `setDateRange`/`setSortBy` não existem.

- [ ] **Step 3: Implementar no store**

Na interface `FiltersState`, adicionar:

```ts
  setDateRange: (range: { start: string; end: string } | null) => void;
  setSortBy: (sortBy: SortBy) => void;
```

Importar `SortBy` de `../utils/filters`.

Em `setDateBucket`, garantir limpeza do range:

```ts
    setDateBucket: (dateBucket) => patchFilters({ dateBucket, dateRange: null }),
```

Adicionar os setters:

```ts
    setDateRange: (dateRange) =>
      patchFilters({ dateRange, dateBucket: 'any' }),
    setSortBy: (sortBy) => patchFilters({ sortBy }),
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @agenda/mobile exec jest src/store/useFiltersStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar tipos (resolve o quebrado da B1) + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/src/store/useFiltersStore.ts apps/mobile/src/store/useFiltersStore.test.ts
# msg: "feat(mobile): dateRange/sortBy setters with mutual exclusion"
```

---

### Task B4: UI de filtros — Ordenar por + Escolher datas

**Files:**
- Modify: `apps/mobile/app/filters.tsx`
- Modify: `apps/mobile/package.json` (dependência)
- Create: `apps/mobile/src/components/filters/DateRangeField.tsx`

- [ ] **Step 1: Instalar a dependência**

Run: `pnpm --filter @agenda/mobile add @react-native-community/datetimepicker` (use a versão recomendada pelo Expo SDK 56 — checar `https://docs.expo.dev/versions/v56.0.0/`; se houver `npx expo install`, prefira-o para casar a versão).
Expected: pacote adicionado ao `package.json` do mobile.

- [ ] **Step 2: Criar `DateRangeField`** — dois campos de/até

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Text, View } from '@/tw';

interface DateRangeFieldProps {
  value: { start: string; end: string } | null;
  onChange: (range: { start: string; end: string } | null) => void;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateRangeField({ value, onChange }: DateRangeFieldProps) {
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const start = value?.start ?? '';
  const end = value?.end ?? '';

  const handlePicked = (which: 'start' | 'end', date?: Date) => {
    setPicking(null);
    if (!date) return;
    const iso = toISODate(date);
    const next = {
      start: which === 'start' ? iso : start || iso,
      end: which === 'end' ? iso : end || iso,
    };
    // mantém start <= end
    if (next.start > next.end) {
      onChange({ start: next.end, end: next.start });
    } else {
      onChange(next);
    }
  };

  return (
    <View className="flex-row gap-3">
      <GuardedPressable
        accessibilityRole="button"
        accessibilityLabel="Data inicial"
        onPress={() => setPicking('start')}
        className="bg-card flex-1 rounded-xl px-3 py-3"
      >
        <Text className="font-body text-foreground text-[14px]">{start || 'De'}</Text>
      </GuardedPressable>
      <GuardedPressable
        accessibilityRole="button"
        accessibilityLabel="Data final"
        onPress={() => setPicking('end')}
        className="bg-card flex-1 rounded-xl px-3 py-3"
      >
        <Text className="font-body text-foreground text-[14px]">{end || 'Até'}</Text>
      </GuardedPressable>

      {picking ? (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={
            picking === 'start' && start
              ? new Date(`${start}T00:00:00`)
              : picking === 'end' && end
                ? new Date(`${end}T00:00:00`)
                : new Date()
          }
          onChange={(_event, date) => handlePicked(picking, date)}
        />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: Adicionar as seções no `filters.tsx`**

3a. Imports:

```tsx
import { DateRangeField } from '@/components/filters/DateRangeField';
import type { SortBy } from '@/utils/filters';
```

3b. Constante de opções de ordenação (próximo a `DATE_OPTIONS`):

```tsx
const SORT_OPTIONS: Array<{ label: string; value: SortBy }> = [
  { label: 'Data', value: 'date' },
  { label: 'Distância', value: 'distance' },
  { label: 'Avaliação', value: 'rating' },
  { label: 'Preço', value: 'price' },
];
```

3c. Nas seções do formulário (dentro do `ScrollView`, junto às demais `FilterSection`), adicionar uma seção "Ordenar por" com `Chip`s (segue o padrão dos estilos/data já usados):

```tsx
<FilterSection title="Ordenar por">
  <View className="flex-row flex-wrap gap-2">
    {SORT_OPTIONS.map((opt) => (
      <Chip
        key={opt.value}
        label={opt.label}
        selected={draft.sortBy === opt.value}
        onPress={() => patch({ sortBy: opt.value })}
      />
    ))}
  </View>
</FilterSection>
```

3d. Na seção de data existente (a que usa `DATE_OPTIONS`), abaixo dos chips de bucket, adicionar o intervalo. Os chips de bucket devem limpar o range e o range deve zerar o bucket — espelha o store:

```tsx
<FilterSection title="Quando">
  <View className="flex-row flex-wrap gap-2">
    {DATE_OPTIONS.map((opt) => (
      <Chip
        key={opt.bucket}
        label={opt.label}
        selected={!draft.dateRange && draft.dateBucket === opt.bucket}
        onPress={() => patch({ dateBucket: opt.bucket, dateRange: null })}
      />
    ))}
  </View>
  <DateRangeField
    value={draft.dateRange}
    onChange={(range) => patch({ dateRange: range, dateBucket: 'any' })}
  />
</FilterSection>
```

> Se já existir uma seção de data com outro título/estrutura, integrar o `DateRangeField` e o `dateRange: null` nos handlers de bucket dela, sem duplicar.

- [ ] **Step 4: Verificar tipos**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/filters.tsx apps/mobile/src/components/filters/DateRangeField.tsx apps/mobile/package.json pnpm-lock.yaml
# msg: "feat(mobile): sort-by and date-range UI in filters sheet"
```

---

### Task B5: QuickFilterChips — limpar dateRange ao usar chip rápido

**Files:**
- Modify: `apps/mobile/src/components/feed/QuickFilterChips.tsx`

- [ ] **Step 1: Garantir exclusão mútua no chip rápido**

O `onPress` dos chips de data deve passar pelo `setDateBucket` do store (que já zera `dateRange` após a Task B3). Como o componente já chama `setDateBucket`, e o `selected` deve refletir que um range ativo desliga os chips:

```tsx
        <Chip
          key={bucket}
          label={label}
          selected={!filters.dateRange && filters.dateBucket === bucket}
          onPress={() => setDateBucket(filters.dateBucket === bucket ? 'any' : bucket)}
        />
```

- [ ] **Step 2: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/src/components/feed/QuickFilterChips.tsx
# msg: "fix(mobile): quick date chips reflect active date range"
```

---

## Bloco C — #5 Horário "de x até y"

### Task C1: formatTimeRange (TDD)

**Files:**
- Modify: `apps/mobile/src/utils/dates.ts`
- Test: `apps/mobile/src/utils/dates.test.ts` (criar se não existir)

- [ ] **Step 1: Escrever testes (falhando)**

```ts
import { formatTimeRange } from './dates';

describe('formatTimeRange', () => {
  const at = (h: number, m = 0) => new Date(2026, 5, 12, h, m, 0, 0).toISOString();

  it('formata início e fim no mesmo dia', () => {
    expect(formatTimeRange(at(20, 0), at(23, 30))).toBe('20:00 – 23:30');
  });

  it('quando início e fim coincidem, mostra só o horário', () => {
    expect(formatTimeRange(at(20, 0), at(20, 0))).toBe('20:00');
  });

  it('mantém os horários locais mesmo virando o dia', () => {
    const start = new Date(2026, 5, 12, 22, 0).toISOString();
    const end = new Date(2026, 5, 13, 2, 0).toISOString();
    expect(formatTimeRange(start, end)).toBe('22:00 – 02:00');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @agenda/mobile exec jest src/utils/dates.test.ts -t "formatTimeRange"`
Expected: FAIL — `formatTimeRange` não existe.

- [ ] **Step 3: Implementar** em `dates.ts` (reusa `formatTime`)

```ts
/** '20:00 – 23:30' no fuso local; só o início quando coincidem. */
export function formatTimeRange(startIso: string, endIso: string): string {
  const start = formatTime(startIso);
  const end = formatTime(endIso);
  return start === end ? start : `${start} – ${end}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @agenda/mobile exec jest src/utils/dates.test.ts -t "formatTimeRange"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/dates.ts apps/mobile/src/utils/dates.test.ts
# msg: "feat(mobile): formatTimeRange helper"
```

---

### Task C2: Exibir o range no card e no detalhe

**Files:**
- Modify: `apps/mobile/src/components/event/EventCard.tsx`
- Modify: `apps/mobile/app/event/[id].tsx`

- [ ] **Step 1: EventCard — usar o range**

Import: trocar/agregar `formatTimeRange` no import de `@/utils/dates`. No `FooterItem` do relógio, trocar:

```tsx
              {formatTime(event.starts_at)}
```

por:

```tsx
              {formatTimeRange(event.starts_at, event.ends_at)}
```

- [ ] **Step 2: Detalhe — InfoCard Horário**

Import `formatTimeRange`. Trocar no `InfoCard label="Horário"`:

```tsx
                value={formatTime(event.starts_at)}
```

por:

```tsx
                value={formatTimeRange(event.starts_at, event.ends_at)}
```

- [ ] **Step 3: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/src/components/event/EventCard.tsx apps/mobile/app/event/[id].tsx
# msg: "feat(mobile): show event time as start–end range"
```

---

## Bloco D — #4 Carrossel de fotos no detalhe

### Task D1: Componente EventPhotoCarousel

**Files:**
- Create: `apps/mobile/src/components/event/EventPhotoCarousel.tsx`

- [ ] **Step 1: Implementar o carrossel** (ScrollView paginado + dots; `expo-image` já instalado)

```tsx
import { useState } from 'react';
import {
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { colors } from '@/theme/colors';
import { Image, ScrollView, View } from '@/tw';

interface EventPhotoCarouselProps {
  /** já vem com o banner_url na primeira posição */
  photos: string[];
  accessibilityLabel: string;
}

export function EventPhotoCarousel({ photos, accessibilityLabel }: EventPhotoCarouselProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
    if (next !== index) setIndex(next);
  };

  if (photos.length <= 1) {
    return (
      <View className="h-65">
        <Image
          source={{ uri: photos[0] }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  return (
    <View className="h-65">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {photos.map((uri, i) => (
          <View key={`${uri}-${i}`} style={{ width }} className="h-65">
            <Image
              source={{ uri }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              accessibilityLabel={`${accessibilityLabel} — foto ${i + 1}`}
            />
          </View>
        ))}
      </ScrollView>
      <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
        {photos.map((uri, i) => (
          <View
            key={`dot-${uri}-${i}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === index ? colors.primary : colors.background,
              opacity: i === index ? 1 : 0.5,
            }}
          />
        ))}
      </View>
    </View>
  );
}
```

> `h-65` espelha a altura do banner atual no detalhe (`View className="h-65"`). Se a classe não existir no preset Nativewind, usar a mesma técnica de altura já aplicada hoje no detalhe.

- [ ] **Step 2: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/src/components/event/EventPhotoCarousel.tsx
# msg: "feat(mobile): EventPhotoCarousel component"
```

---

### Task D2: Usar o carrossel no detalhe

**Files:**
- Modify: `apps/mobile/app/event/[id].tsx`

- [ ] **Step 1: Substituir o banner único pelo carrossel**

Import:

```tsx
import { EventPhotoCarousel } from '@/components/event/EventPhotoCarousel';
```

Calcular as fotos (memo, após obter `event`):

```tsx
const photos = useMemo(
  () => [event?.banner_url, ...(event?.photo_urls ?? [])].filter(Boolean) as string[],
  [event],
);
```

Substituir o bloco do banner (a `View className="h-65"` com o `<Image>` do banner e o overlay de estilos). Manter o overlay dos chips de estilo por cima — envolver o carrossel e o overlay numa `View` relativa:

```tsx
<View className="h-65">
  <EventPhotoCarousel photos={photos} accessibilityLabel={event.name} />
  <View className="absolute inset-0 flex-1 justify-end p-4" pointerEvents="none">
    <View className="flex-row gap-1.5">
      {styles.map((style) => (
        <View key={style.id} className="bg-background/70 rounded-full px-2.5 py-1">
          <Text className="font-body-medium text-foreground text-[11px]">
            {style.emoji}
            {style.name}
          </Text>
        </View>
      ))}
    </View>
  </View>
</View>
```

> `pointerEvents="none"` no overlay para não bloquear o swipe do carrossel.

- [ ] **Step 2: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/app/event/[id].tsx
# msg: "feat(mobile): event detail photo carousel"
```

---

## Bloco E — #6 Atrações secundárias no detalhe

### Task E1: Seção "Outras atrações"

**Files:**
- Modify: `apps/mobile/app/event/[id].tsx`

- [ ] **Step 1: Consumir o hook e renderizar a seção**

Import:

```tsx
import { useEventAttractionsQuery } from '@/hooks/queries';
```

Após obter `event`:

```tsx
const { data: attractions } = useEventAttractionsQuery(event?.id ?? '');
```

Na coluna de conteúdo (dentro do `View className="gap-4 p-4"`, abaixo da seção "Sobre o evento"), adicionar:

```tsx
{attractions && attractions.length > 0 ? (
  <View className="gap-2">
    <SectionLabel>Outras atrações</SectionLabel>
    <View className="gap-1.5">
      {attractions.map((attraction) => (
        <View key={attraction.id} className="flex-row items-center gap-2">
          <Icon name="music" color={colors.primary} size={13} />
          <Text className="font-body text-foreground text-[14px]">{attraction.name}</Text>
        </View>
      ))}
    </View>
  </View>
) : null}
```

> Se o ícone `music` não existir no set FontAwesome do projeto, usar um já disponível (ex. `microphone`/`star`) — checar `components/ui/Icon`.

- [ ] **Step 2: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/app/event/[id].tsx
# msg: "feat(mobile): secondary attractions section in event detail"
```

---

## Bloco F — #3 Eventos no estabelecimento + aba Bares

### Task F1: upcomingEventsForEstablishment (TDD)

**Files:**
- Create: `apps/mobile/src/utils/events.ts`
- Test: `apps/mobile/src/utils/events.test.ts`

- [ ] **Step 1: Escrever os testes (falhando)**

```ts
import type { Event } from '../data/schemas';
import { upcomingEventsForEstablishment } from './events';

const NOW = new Date(2026, 5, 11, 20, 0, 0, 0);

function ev(id: string, establishmentId: string, startsAt: Date): Event {
  return {
    id,
    name: id,
    attraction: 'x',
    description: '',
    banner_url: 'https://example.com/a.jpg',
    photo_urls: [],
    music_style_ids: [],
    establishment_id: establishmentId,
    starts_at: startsAt.toISOString(),
    ends_at: startsAt.toISOString(),
    cover_charge: 0,
  };
}

describe('upcomingEventsForEstablishment', () => {
  const events: Event[] = [
    ev('past', 'b1', new Date(2026, 5, 1, 20)),
    ev('soon', 'b1', new Date(2026, 5, 12, 20)),
    ev('later', 'b1', new Date(2026, 5, 20, 20)),
    ev('other', 'b2', new Date(2026, 5, 13, 20)),
  ];

  it('retorna só futuros do estabelecimento, ordenados asc', () => {
    const result = upcomingEventsForEstablishment(events, 'b1', NOW, 5);
    expect(result.map((e) => e.id)).toEqual(['soon', 'later']);
  });

  it('respeita o limite', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      ev(`e${i}`, 'b1', new Date(2026, 5, 12 + i, 20)),
    );
    expect(upcomingEventsForEstablishment(many, 'b1', NOW, 5)).toHaveLength(5);
  });

  it('retorna [] quando não há eventos futuros', () => {
    expect(upcomingEventsForEstablishment([events[0]], 'b1', NOW, 5)).toEqual([]);
  });

  it('não muta a entrada', () => {
    const copy = [...events];
    upcomingEventsForEstablishment(events, 'b1', NOW, 5);
    expect(events).toEqual(copy);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @agenda/mobile exec jest src/utils/events.test.ts`
Expected: FAIL — módulo/função inexistente.

- [ ] **Step 3: Implementar** `apps/mobile/src/utils/events.ts`

```ts
import type { Event } from '../data/schemas';

/**
 * Eventos futuros (starts_at >= now) de um estabelecimento, ordenados do mais
 * próximo ao mais distante, limitados a `limit`. Função pura: não muta a entrada.
 */
export function upcomingEventsForEstablishment(
  events: Event[],
  establishmentId: string,
  now: Date,
  limit: number,
): Event[] {
  const nowMs = now.getTime();
  return events
    .filter(
      (event) =>
        event.establishment_id === establishmentId &&
        new Date(event.starts_at).getTime() >= nowMs,
    )
    .sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )
    .slice(0, limit);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @agenda/mobile exec jest src/utils/events.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/events.ts apps/mobile/src/utils/events.test.ts
# msg: "feat(mobile): upcomingEventsForEstablishment util"
```

---

### Task F2: Seção "Próximos eventos" na tela do estabelecimento

**Files:**
- Modify: `apps/mobile/app/establishment/[id].tsx`

- [ ] **Step 1: Buscar e calcular os próximos eventos**

Imports:

```tsx
import { useEventsByEstablishmentQuery, useMusicStylesQuery } from '@/hooks/queries';
import { EventCard } from '@/components/event/EventCard';
import { indexById, musicStylesForEvent } from '@/data/lookup';
import { upcomingEventsForEstablishment } from '@/utils/events';
```

> Confirmar quais imports já existem no arquivo e não duplicar.

No corpo do componente (após obter `establishment`):

```tsx
const { data: estEvents } = useEventsByEstablishmentQuery(establishment?.id ?? '');
const { data: musicStyles } = useMusicStylesQuery();
const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);
const upcoming = useMemo(
  () => upcomingEventsForEstablishment(estEvents ?? [], establishment?.id ?? '', new Date(), 5),
  [estEvents, establishment?.id],
);
```

- [ ] **Step 2: Renderizar a seção** (destaque = 1º; demais = lista; vazio = mensagem)

Na posição apropriada do conteúdo (seguir layout existente da tela; provavelmente abaixo das infos do bar):

```tsx
<View className="gap-3">
  <SectionLabel>Próximos eventos</SectionLabel>
  {upcoming.length === 0 ? (
    <Text className="font-body text-muted-foreground text-[14px]">
      Nenhum evento agendado por aqui ainda.
    </Text>
  ) : (
    <View className="gap-4">
      {upcoming.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          establishment={establishment}
          styles={musicStylesForEvent(event, stylesById)}
        />
      ))}
    </View>
  )}
</View>
```

> O 1º card já é naturalmente o "destaque" por ser o mais próximo e aparecer no topo. Se a tela usar `ScrollView`, inserir dentro dele; se usar lista, inserir no conteúdo. `SectionLabel` já é usado em outras telas — importar se necessário.

- [ ] **Step 3: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/app/establishment/[id].tsx
# msg: "feat(mobile): upcoming events preview on establishment screen"
```

---

### Task F3: Aba Eventos | Bares no feed

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Adicionar estado de aba e dados de bares**

Imports:

```tsx
import { useState } from 'react';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { normalizeText } from '@/utils/filters';
```

> `useState` já pode estar importado (o arquivo usa `useState` para `now`). Não duplicar.

No componente:

```tsx
const [activeTab, setActiveTab] = useState(0); // 0 = Eventos, 1 = Bares
```

Lista de bares da cidade ativa, com a mesma busca textual da SearchBar:

```tsx
const cityEstablishments = useMemo(() => {
  const all = establishments ?? [];
  const scoped = city ? all.filter((e) => e.city_id === city.id) : all;
  const q = normalizeText(filters.query.trim());
  if (!q) return scoped;
  return scoped.filter((e) => normalizeText(e.name).includes(q));
}, [establishments, city, filters.query]);
```

- [ ] **Step 2: Inserir o SegmentedTabs no ListHeader**

Dentro do `ListHeaderComponent`, abaixo do `SearchBar`, adicionar:

```tsx
<SegmentedTabs
  tabs={['Eventos', 'Bares']}
  activeIndex={activeTab}
  onChange={setActiveTab}
/>
```

- [ ] **Step 3: Renderizar a aba ativa**

Trocar a `FlashList` única por uma renderização condicional. Na aba Eventos, manter exatamente a lista atual. Na aba Bares, renderizar `EstablishmentCard`. Manter os chips de estilo/filtros só na aba Eventos (mover `QuickFilterChips` e a seção "Estilos em alta" para dentro do header condicional `activeTab === 0`).

```tsx
{activeTab === 0 ? (
  <FlashList
    data={filteredEvents}
    keyExtractor={(event) => event.id}
    /* ...props atuais... */
    renderItem={renderEvent}
  />
) : (
  <FlashList
    data={cityEstablishments}
    keyExtractor={(e) => e.id}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
    ItemSeparatorComponent={() => <View className="h-3" />}
    renderItem={({ item }) => <EstablishmentCard establishment={item} />}
  />
)}
```

> Os filtros de evento (calendário/estilos/preço) não se aplicam a bares — manter o acesso ao sheet de filtros só relevante na aba Eventos. Para o MVP, basta que a aba Bares ignore esses filtros (a lista de bares acima já não os usa). Não remover funcionalidade da aba Eventos.

- [ ] **Step 4: Verificar tipos + commit**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit`
Expected: sem erros.

```bash
git add apps/mobile/app/(tabs)/index.tsx
# msg: "feat(mobile): Events/Bares segmented tabs in feed"
```

---

## Bloco G — Fechamento

### Task G1: Suíte completa + tipos

- [ ] **Step 1: Rodar toda a suíte do mobile**

Run: `pnpm --filter @agenda/mobile test`
Expected: PASS — incluindo os testes pré-existentes (regressão de `applyEventFilters`, services).

- [ ] **Step 2: Rodar tipos do mobile e do core**

Run: `pnpm --filter @agenda/mobile exec tsc --noEmit && pnpm --filter @agenda/core exec tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Lint (se configurado)**

Run: `pnpm --filter @agenda/mobile lint` (pular se o script não existir)
Expected: sem erros.

- [ ] **Step 4: Verificação visual (preview)**

Subir o preview e validar: feed com aba Eventos/Bares, abrir um bar e ver "Próximos eventos", abrir um evento e ver carrossel (mock com ≥2 fotos), horário em range, e o sheet de filtros com "Ordenar por" + "Escolher datas". Usar as ferramentas `preview_*`.

- [ ] **Step 5: Commit final (staging)**

```bash
git add -A
# msg: "test(mobile): full suite green for app inclusions"
```

---

## Self-review (cobertura da spec)

- **#1 Calendário (intervalo):** Tasks B1–B4 (tipo `dateRange`, lógica, store, UI com datetimepicker), B5 (chips). ✔
- **#2 Ordenar por:** Tasks B1–B4 (`sortBy`, comparador, UI). Inclui fallback de `distance`. ✔
- **#3 Estabelecimento + aba Bares:** Tasks F1–F3. ✔
- **#4 Fotos:** Tasks A1–A3 (schema/query `photo_urls`), D1–D2 (carrossel). Feed inalterado. ✔
- **#5 Horário x–y:** Tasks C1–C2. ✔
- **#6 Atrações secundárias:** Tasks A1–A4 (tabela/query/service/hook), E1 (UI). ✔
- **Testes (AGENTS.md):** B2, B3, C1, F1 cobrem utils/services novos/alterados; A4 cobre service. Regressão de `applyEventFilters` preservada (B2 Step 4). ✔
- **Admin:** fora de escopo (esqueleto sem CRUD) — documentado no header. ✔
