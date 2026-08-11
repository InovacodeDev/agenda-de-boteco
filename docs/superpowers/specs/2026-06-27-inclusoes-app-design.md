# Inclusões no app — design

> Data: 2026-06-27 · Branch base: `feat/v4`

Seis inclusões solicitadas no app mobile (`apps/mobile`), com mudanças aditivas no
banco (`supabase`), nos schemas compartilhados (`packages/core`) e no admin
(`apps/admin`). **Princípio mestre:** nada quebra o que já existe — `attraction` e
`banner_url` continuam sendo a fonte de verdade do feed; toda novidade é aditiva.

## Escopo

| # | Feature | Camada principal | Risco |
|---|---------|------------------|-------|
| 5 | Horário "de x até y" | só UI (dado já existe) | mínimo |
| 2 | Ordenar por | `filters.ts` + store + UI | baixo |
| 1 | Calendário (intervalo de/até) | `filters.ts` + store + UI | baixo |
| 3 | Eventos no estabelecimento + aba Bares no feed | telas + 1 util | médio |
| 4 | Fotos (carrossel + destaque) | schema + admin + 2 telas | médio |
| 6 | Atrações secundárias | schema (tabela) + admin + detalhe | médio |

---

## Seção 1 — Camada de dados

Três mudanças no banco, todas aditivas. Nova migration em `supabase/migrations/`.

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
CREATE POLICY select_event_attractions ON public.event_attractions FOR SELECT USING (true);
```

**Schemas (`packages/core/src/schemas/catalog.ts`):**

- `Event` ganha `photo_urls: z.array(z.string().url())` (default `[]`).
- Novo schema `EventAttraction` (`id`, `event_id`, `name`, `position`).
- Tipos gerados do Supabase (`packages/core/src/types/database.types.ts`) regenerados em
  CI — nunca editados à mão.

**Consumo das atrações secundárias:** query separada por evento. Hook novo
`useEventAttractionsQuery(eventId)` em `apps/mobile/src/hooks/queries`, chamado **só no
detalhe do evento**. O feed continua leve (não carrega secundárias).

**Carrossel:** o array exibido no detalhe é `[banner_url, ...photo_urls]` — o destaque
sempre primeiro.

**Regressão:** feed, `EventCard` e busca seguem lendo apenas `banner_url` e `attraction`.

---

## Seção 2 — Filtros (#1 calendário de intervalo + #2 ordenar por)

Lógica em `apps/mobile/src/utils/filters.ts` (função pura, testada) +
`useFiltersStore`. UI de edição em `apps/mobile/app/filters.tsx`.

**Mudanças no `EventFilters`:**

```ts
export type SortBy = 'date' | 'distance' | 'rating' | 'price';

export interface EventFilters {
  // ...existentes...
  dateBucket: DateBucket;                              // mantém os chips rápidos
  dateRange: { start: string; end: string } | null;   // #1 — null = sem intervalo
  sortBy: SortBy;                                      // #2 — default 'date'
}
```

### #1 — Calendário (intervalo de/até)

- Os chips rápidos (qualquer dia / hoje / amanhã / fds) continuam.
- Adiciona "Escolher datas", que abre o seletor de intervalo.
- **`dateRange` precede `dateBucket` e são mutuamente exclusivos:** escolher um intervalo
  zera o `dateBucket` (volta a `any`); tocar um chip rápido limpa o `dateRange`. Sem
  ambiguidade de "qual data vale".
- Filtro: evento passa se `starts_at` cai dentro de `[start, end]` (dias locais,
  inclusivo nas duas pontas).
- **Componente:** `@react-native-community/datetimepicker` com dois campos ("de" / "até").
  Escolhido por consistência (`@react-native-community/slider` já é usado), menor
  dependência e por renderizar picker nativo no iOS/Android e `<input type="date">` na web
  sem reimplementar UI. Trade-off aceito: não há a "faixa pintada" de um calendário contínuo.

### #2 — Ordenar por

A ordenação deixa de ser `.sort` fixo e vira parametrizada por `sortBy`:

- `date` → `starts_at` asc (atual, **default**).
- `distance` → menor distância primeiro. Reusa o cálculo que `nearMe` já faz (RPC PostGIS
  ou fallback Haversine). **Sem localização disponível, cai para `date`** e a UI sinaliza.
- `rating` → `establishment.rating_avg` desc.
- `price` → `cover_charge` asc (mais barato primeiro).
- **Desempate sempre `starts_at` asc** — ordem determinística (essencial para os testes de
  regressão de `applyEventFilters`).

**UI:** seletor "Ordenar por" no `filters.tsx`, seguindo o padrão de `FilterSection`.

---

## Seção 3 — Telas

### #5 — Horário "de x até y"

Dado (`ends_at`) já existe no banco.

- Helper novo `formatTimeRange(starts_at, ends_at)` em `utils/dates.ts` — função pura, com
  teste de contrato. Trata mesma-hora e virada de dia.
- `event/[id].tsx`: `InfoCard "Horário"` passa de `formatTime(starts_at)` para o range.
- `EventCard.tsx`: mesmo tratamento no `FooterItem` do relógio.

### #4 — Fotos (carrossel no detalhe + destaque no feed)

- Feed / `EventCard`: **nenhuma mudança** — seguem em `banner_url`.
- `event/[id].tsx`: o `<Image>` único do banner vira um carrossel horizontal de
  `[banner_url, ...photo_urls]` com indicadores (dots). Com apenas `banner_url`, renderiza
  igual a hoje (sem dots) — sem regressão visual.
- Componente novo `EventPhotoCarousel` em `components/event/`, usando `expo-image`
  (já instalado) + ScrollView paginado / FlashList horizontal.
- Upload das fotos e definição de destaque: feitos no painel admin (`apps/admin`).

### #6 — Atrações secundárias (só no detalhe)

- `event/[id].tsx`: seção "Outras atrações" abaixo do header (nome + `attraction`),
  listando `event_attractions` via `useEventAttractionsQuery(id)`, ordenadas por `position`.
- Query vazia → seção não aparece. Headliner (`attraction`) segue no topo como hoje.
- Cadastro das secundárias: feito no painel admin.

### #3 — Eventos no estabelecimento + aba Bares no feed

**Tela do estabelecimento (`establishment/[id].tsx`):**

- Seção nova "Próximos eventos": eventos do `establishment_id` com `starts_at >= now`,
  ordenados asc, **limite 5**.
- 1º (mais próximo) = card destaque; demais = lista compacta. Bar sem eventos futuros →
  estado vazio ("Nenhum evento agendado").
- Função pura `upcomingEventsForEstablishment(events, establishmentId, now, limit)` em
  `utils/` — testável e reaproveitável.

**Aba Bares no feed (`(tabs)/index.tsx`):**

- `SegmentedTabs` no topo: **Eventos | Bares** (mesmo componente já usado em Favoritos).
- Aba **Eventos:** comportamento atual intacto (filtros, ordenação, busca por evento).
- Aba **Bares:** lista `EstablishmentCard` da cidade ativa (mesmo recorte de cidade do
  feed). A SearchBar busca por nome do bar nessa aba. Filtros de evento (calendário,
  estilos, preço) ficam inativos na aba Bares; mantêm-se os aplicáveis (avaliação,
  distância, perto de mim).
- Caminho de acesso garantido na entrega atual. O **Mapa** (feature v4, atrás de flag) leva
  à mesma tela de estabelecimento quando ligado.

**Telas/arquivos tocados na Seção 3:**

| Arquivo | Mudança |
|---|---|
| `event/[id].tsx` | horário x–y, carrossel de fotos, seção atrações secundárias |
| `EventCard.tsx` | horário x–y |
| `establishment/[id].tsx` | seção "Próximos eventos" (destaque + lista, máx 5) |
| `(tabs)/index.tsx` | SegmentedTabs Eventos/Bares |
| `utils/dates.ts` | `formatTimeRange` (+teste) |
| `utils/` | `upcomingEventsForEstablishment` (+teste) |
| `components/event/` | `EventPhotoCarousel` |

---

## Testes (AGENTS.md)

Teste de contrato obrigatório para todo `services`/`utils` novo ou alterado, como fonte de
verdade do comportamento:

- `filters.ts`: novos casos para `dateRange` (precedência sobre `dateBucket`, inclusividade
  nas pontas) e para cada `sortBy` (incluindo desempate por `starts_at` e fallback de
  `distance` sem localização). Regressão preservada: mesma entrada antiga → mesma saída.
- `dates.ts`: `formatTimeRange` (mesma hora, virada de dia).
- `upcomingEventsForEstablishment`: filtro por `starts_at >= now`, ordem, limite 5, vazio.

## Dependências novas

- `@react-native-community/datetimepicker` (alinhada à família `@react-native-community/*`
  já usada).

## Fora de escopo

- Refatorar `attraction`/`banner_url` para os novos modelos (decisão: manter como headliner
  / destaque).
- Mudanças na navegação por tab bar (Bares entra como SegmentedTabs, não como nova aba).
- Implementação do admin além do necessário para cadastrar fotos extras e atrações
  secundárias.
