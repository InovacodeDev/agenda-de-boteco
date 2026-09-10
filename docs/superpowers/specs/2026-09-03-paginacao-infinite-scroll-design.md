# Paginação com infinite scroll nas listagens do catálogo — design

Data: 2026-09-03
Status: aprovado, aguardando plano de implementação
Issue: #94 (auditoria) → esta spec é uma das 5 tarefas derivadas

## Contexto

Auditoria da issue #94 confirmou: nenhuma das listagens de catálogo
(`listEvents`, `listEstablishments`, `listEventsByEstablishment`,
`listOwnedEvents`, `listNotifications`) pagina — todas trazem o conjunto
inteiro de uma vez, sem `.range()`/`.limit()`. `events.establishment_id`
também não tem índice dedicado, apesar de ser filtrado com frequência.

O repo já tem um padrão de referência para isso, fora do catálogo:
`apps/web-client/hooks/use-musician-leads.ts` usa `useInfiniteQuery` com
cursor composto, apoiado numa RPC (`list_musician_leads`) que devolve
`{ items, nextCursor }`. Esta spec estende o mesmo padrão para o catálogo.

## Escopo

Entram: `listEvents`, `listEstablishments`, `listEventsByEstablishment`,
`listOwnedEvents`, `listNotifications`.

Ficam de fora — catálogos pequenos e fixos, paginar é over-engineering:
`listMusicStyles`, `listCities`.

Tamanho de página: constante fixa `DEFAULT_PAGE_SIZE = 20` por listagem,
não escolhível pelo usuário (decisão já validada no brainstorming — 10/20/50
é o range aceitável documentado, não 3 opções simultâneas de UI).

Infinite scroll dispara ao atingir 80% do conteúdo carregado
(`onEndReachedThreshold={0.2}` no mobile, `IntersectionObserver` a 20% do
fim no web) — pré-carregamento antecipado, não busca reativa ao fim exato.

## 1. Query layer — cursor, não offset

Cursor composto (mesmo modelo de `list_musician_leads`): evita os problemas
clássicos de paginação por `OFFSET` (linhas duplicadas/puladas quando o
conjunto muda entre páginas). Para eventos e estabelecimentos, o cursor é
`(starts_at, id)` ou `(created_at, id)` conforme a ordenação natural de cada
listagem — `id` como desempate garante estabilidade.

`packages/core/src/queries/catalog.ts` — cada função `list*` dentro do
escopo ganha:

```ts
type CatalogPage<T> = { items: T[]; nextCursor: string | null };

async function listEvents(params?: { cursor?: string | null; limit?: number }): Promise<CatalogPage<Event>>
```

Implementação via `.range()` do PostgREST usando o cursor decodificado como
offset de valor (`.gt('starts_at', cursorStartsAt)` combinado com `.order()`),
não RPC nova — as migrations já indexam `starts_at`; não é necessário criar
RPC dedicada como a de `musician_leads`, que existia por outro motivo (filtro
+ sort dinâmicos). Se o filtro combinado (cidade + estilo + data) tornar a
query client-side inviável de expressar com o builder, avaliar RPC nesse
momento — não antecipar.

`listNotifications` e `listOwnedEvents` seguem o mesmo contrato de retorno.

## 2. Fachada — `packages/core/src/services/catalog.ts`

Repassa os novos parâmetros sem lógica extra, mantendo o fallback para mock
quando `getConfiguredSupabase()` é `null`. O mock (`data/mock.ts`) simula
paginação fatiando o array local pelo `limit`, para o app continuar
navegável sem backend (mesmo comportamento que hoje existe sem paginação).

## 3. Query keys — sem quebrar invalidação por prefixo

`catalogKeys.events.root` continua `['events']` como primeiro segmento —
crítico para invalidação por prefixo continuar alcançando a nova key. Nova
key paginada:

```ts
events: {
  root: ['events'],
  list: (params?: EventListParams) => ['events', 'list', params] as const,
  // detail/byEstablishment/attractions/owned inalterados
}
```

## 4. Hooks — migrar de `useQuery` para `useInfiniteQuery`

`packages/core/src/hooks/queries.ts`: `useEventsQuery`, `useEstablishmentsQuery`,
`useEventsByEstablishmentQuery`, `useNotificationsQuery` (e um `useOwnedEventsQuery`
novo, que hoje não existe — `listOwnedEvents` não tem hook de catálogo,
só é usado via service direto) passam a:

```ts
useInfiniteQuery({
  queryKey: catalogKeys.events.list(params),
  queryFn: ({ pageParam, signal }) => catalog.listEvents({ cursor: pageParam, limit: DEFAULT_PAGE_SIZE, signal }),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

Consumidores fazem `data.pages.flatMap((p) => p.items)` para reconstituir a
lista plana — isolado num pequeno helper (`flattenPages`) em vez de repetir
em cada componente.

## 5. Consumo por app

**Mobile** (`apps/mobile/app/(tabs)/index.tsx`, `favorites.tsx`, telas de
detalhe com `upcoming` top-5): já usa `FlashList`, que suporta
`onEndReached`/`onEndReachedThreshold` nativamente — conectar direto ao
`fetchNextPage()` do hook. Telas de favoritos ficam de fora (lista pequena,
filtrada client-side sobre dado já paginado — se a base de favoritos crescer
o suficiente para doer, é tarefa futura separada).

**Web** (`apps/web`, `apps/admin`, `apps/web-client`): sentinela
(`<div ref={sentinelRef} />`) no fim da lista renderizada, observado via
`IntersectionObserver` com `rootMargin` equivalente a 20% da altura da
lista. Extrair um hook pequeno `useInfiniteScrollSentinel(fetchNextPage,
hasNextPage)` reutilizável nos 3 apps Next (candidato a
`packages/shared-ui` ou hook local por app até a Regra dos 3 se confirmar
em uso real — não abstrair preventivamente).

Páginas de detalhe (`establishment/[id]`, `event/[id]`) que hoje só
mostram top-5 de `upcoming`/atrações **não entram no escopo de infinite
scroll** — continuam com corte fixo, é uma pré-visualização, não uma
listagem paginável.

## 6. Índice ausente

Nova migration `supabase/migrations/<timestamp>_events_establishment_id_idx.sql`:

```sql
CREATE INDEX events_establishment_id_idx ON public.events (establishment_id);
```

## 7. Cache — `CACHE_BUSTER`

O shape persistido muda de array plano para `{ pages, pageParams }`
(estrutura padrão do `useInfiniteQuery`). `PERSIST_ALLOWLIST` não muda —
ainda casa pelo primeiro segmento (`'events'`, `'establishments'`, etc).
`CACHE_BUSTER` em `packages/core/src/services/cachePolicy.ts` incrementa de
`'v2'` para `'v3'`, forçando descarte do cache antigo incompatível.

## 8. Testes

`packages/core/src/queries/catalog.test.ts` (ou arquivo equivalente já
existente) ganha casos por listagem migrada: primeira página sem cursor,
página seguinte com cursor, última página (`nextCursor: null`), client
ausente. Mudança em `queries/` e `services/` do core exige teste novo ou
atualizado (regra do AGENTS_RULES.md).

## Fora de escopo

- Seletor de UI para escolher tamanho de página — decisão já tomada no
  brainstorming, tamanho é fixo por tela.
- RPC dedicada para filtros combinados — só se o builder do PostgREST se
  mostrar insuficiente na implementação.
- Paginação de `listMusicStyles`/`listCities` — catálogos pequenos.
