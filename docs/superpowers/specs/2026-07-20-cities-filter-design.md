# Ajustes nos filtros de eventos (mobile + web) + Version Gate no CI

Data: 2026-07-20
Branch: `feat/cities-filter`

## Contexto

Quatro ajustes pedidos, três de UI de filtros de eventos (mobile + web) e um de CI:

1. Título do filtro "Data" colado no topo do sheet no iOS.
2. Campo "Cidade": chips rápidos (atual + até 5 do catálogo) + seletor de busca por texto em modal sobre o filtro.
3. Multi-select de cidade no filtro.
4. Aplicar o Version Gate (tag check) no `ci.yml` (o deploy não roda no GitHub hoje).

### Estado atual (fatos apurados no código)

- **Filtro mobile:** rota `apps/mobile/app/filters.tsx`, `formSheet` nativa (`_layout.tsx`, `sheetGrabberVisible: true`, `sheetAllowedDetents: [0.92]`, `gestureEnabled: false`). Usa `ScreenHeader` em modo não-overlay (`paddingTop: 8` fixo em `ScreenHeader.tsx:48`).
- **Filtro web:** `apps/web/components/filters/FiltersSidebar.tsx`, drawer slide-in hand-rolled (sem Dialog/Command/Radix/shadcn/cmdk — só HTML nativo + Tailwind v4 + `cn()`). **NÃO tem seção "Cidade" hoje.**
- **Cidade não faz parte de `EventFilters`.** Vive em `usePreferencesStore` (`packages/core/src/stores/usePreferencesStore.ts`): `cityId: string` (single, default `'fln'`) + `customCity: City | null` (cidade virtual `geo:`). É a "cidade ativa", consumida por home/mapa/perfil/onboarding via `useActiveCity()`.
- **`City`** (zod): `packages/core/src/schemas/catalog.ts:9-16` → `{ id, name, uf, lat, lng, slug? }`. Lista real: array `CITIES` (6 cidades) em `packages/core/src/data/mock.ts:31-38`, servido por `useCitiesQuery()`.
- **Não existe** histórico/ranking de "cidades mais visitadas" no código.
- **Filtro por cidade é client-side:** `useEventsQuery()` chama `catalog.listEvents()` sem cityId. O recorte por cidade acontece em `applyEventFilters(events, filters, ctx)` (`packages/core/src/utils/filters.ts:105`), via `ctx.cityId` (`establishment.city_id !== ctx.cityId` → descarta, linha 121). Feed passa `ctx.cityId = city.id` em `apps/mobile/app/(tabs)/index.tsx:160` e `apps/web/app/(app)/page.tsx:83`.
- **Version gate atual:** job `version-gate` em `.github/workflows/deploy.yml:18-44` (lê `apps/mobile/package.json`, tag `${branch}-v${version}`, falha se existe). Tag é criada no fim do deploy (`deploy.yml:141-147`). O `ci.yml` roda `lint+typecheck+build` em push/PR nas branches `release/beta/alfa`, sem `fetch-depth: 0`, sem tag.
- **Versão fonte única:** `apps/mobile/package.json` → `version` (hoje `0.0.4`).

### Decisões travadas (com o usuário)

| Tema | Decisão |
| :--- | :--- |
| Multi-select x cidade ativa | **Multi só no filtro do feed** (novo `cityIds` em `EventFilters`; `usePreferencesStore.cityId` fica single e intocado) |
| "5 mais visitadas" | **Primeiras 5 do catálogo + atual** (não inventar telemetria; troca trivial depois) |
| Feed x cidades selecionadas | **Filtro sobrepõe a cidade ativa** (se `cityIds` não-vazio, feed busca a união; senão, cidade ativa) |
| Seletor de busca | Modal sobre o filtro, com **botão "Confirmar"** (seleção própria, faz merge no rascunho ao confirmar) |
| Version Gate no CI | **CI valida + cria a tag ao final**, mas a validação só dispara quando o diff toca `apps/mobile/` (job `version-gate` valida em push/PR só se mobile mudou; job `tag` cria tag só em push quando mobile mudou) |

## Design

### 1. Header colado no topo (iOS) — `apps/mobile/app/filters.tsx`

**Causa raiz:** `ScreenHeader` não-overlay tem `paddingTop: 8` fixo e não reserva espaço para o grabber nativo do sheet (`sheetGrabberVisible: true`). No Android não há grabber.

**Fix (localizado no `filters.tsx`, não no `ScreenHeader` compartilhado):** adicionar uma folga de topo sheet-aware só no uso do filtro, aplicada apenas no iOS (`Platform.OS === 'ios'`), via um `View` espaçador acima do `ScreenHeader` (ou bump do padding). Zero regressão no Android (mantém o layout atual).

### 2. Cidade — chips rápidos + seletor de busca

**Chips rápidos (mobile + web):** cidade atual (sufixo "(atual)") + até 5 cidades de `useCitiesQuery()`. Estrutura pronta para virar "5 mais visitadas" trocando a fonte quando houver telemetria. Abaixo, botão **"Buscar cidade"**.

**Seletor de busca (modal sobre o filtro):**
- **Mobile:** nova rota `apps/mobile/app/city-search.tsx` (`formSheet`/`modal` empilhada sobre `/filters`). `<TextInput>` filtra `useCitiesQuery()` por `normalizeText(name)`; lista rolável de resultados selecionáveis (multi). Seleção própria + botão **"Confirmar"** → faz merge no rascunho `cityIds` do filtro. Comunicação filtro↔busca via store de rascunho compartilhado (draft é multi, não cabe em `router` params). Reaproveita `resolveCityFromLocation`, `Chip`/`GuardedPressable`, padrão de `city.tsx`.
- **Web:** modal hand-rolled (overlay `fixed` + painel centralizado, padrão do drawer existente), `<input>` de busca nativo + lista filtrada, seleção própria + "Confirmar". Fecha com backdrop/Esc/X.

**Paridade web:** adicionar a seção "Cidade" ao `FiltersSidebar.tsx` (não existe hoje): chips rápidos + botão de busca.

### 3. Multi-select de cidade

**Core (`packages/core/src/utils/filters.ts`):**
- `EventFilters`: novo campo `cityIds: string[]`; `DEFAULT_EVENT_FILTERS.cityIds = []`.
- `EventFilterContext`: novo campo opcional `cityIds?: string[]`.
- `applyEventFilters`: recorte de cidade vira — se `ctx.cityIds` presente e não-vazio → `ctx.cityIds.includes(establishment.city_id)`; senão → comportamento atual (`ctx.cityId`). **Retrocompatível:** sem `cityIds`, retorno idêntico ao atual.

**Wiring do feed:**
- `apps/mobile/app/(tabs)/index.tsx` e `apps/web/app/(app)/page.tsx`: passar `cityIds: filters.cityIds` no `ctx`. Vazio → cai na cidade ativa (comportamento atual).

**UI multi (mobile + web):**
- Chips rápidos e resultados do modal de busca **alternam** ids no rascunho `draftCityIds` (padrão `toggleDraftStyle`).
- Rascunho guarda `draftCityIds: string[]`, seeded do `filters.cityIds`. Commit no "Aplicar filtros".
- "Limpar" zera `cityIds` para `[]`.
- Cidade atual "(atual)" é só mais um id em `cityIds`. Multi opera sobre ids de catálogo; virtual/`geo:` fica fora do multi (nenhuma cidade marcada → feed usa cidade ativa, que pode ser geo — comportamento atual).

**Testes (AGENTS.md — `utils` do core exige teste):** em `filters.test.ts`:
- `cityIds` vazio = idêntico ao single atual.
- `cityIds` com múltiplas cidades = união.
- `cityIds` presente sobrepõe `ctx.cityId`.

### 4. Version Gate no `ci.yml`

- `permissions: contents: write` + `concurrency: ci-${{ github.ref_name }}` (serializa por branch, padrão do `deploy.yml`).
- Job `version-gate` (name "Version Gate (tag check)"): checkout `fetch-depth: 0`, lê `apps/mobile/package.json` → `version`, `tag=${GITHUB_REF_NAME}-v${version}`. **Detecta se o diff tocou `apps/mobile/`** (PR: `origin/BASE...HEAD`; push: `before..sha`, com primeiro push tratado como mudou). Só valida a versão (falha se a tag já existe) **quando `apps/mobile/` mudou** — outras mudanças (web, docs, CI) passam sem checar versão. Expõe output `mobile_changed`.
- Job `verify` (atual): `needs: version-gate`.
- Job `tag` (`needs: [version-gate, verify]`, `if: github.event_name == 'push' && mobile_changed == 'true'`): cria/pusha `${branch}-v${version}`, **idempotente** (pula se a tag já existe; tolera corrida no push). **Não roda em PR** nem em pushes que não tocam o mobile.

**Por que escopado a `apps/mobile/`:** sem isso, todo PR de manutenção (doc, CI, web) contra um canal com release ativo seria bloqueado por "versão já publicada", forçando bump indevido. Escopar ao mobile (onde a versão vive) mantém a proteção onde importa sem travar o resto.

**Dívida conhecida:** `deploy.yml` e `ci.yml` passam a ter lógica de tag duplicada. Se o deploy voltar a rodar, ambos tentariam criar a mesma tag (o `tag` job do CI é idempotente e tolera isso, mas ainda é duplicação). Comentário no `ci.yml` aponta para revisitar (candidato a "mover o gate para o CI") quando o EAS voltar.

## Arquivos afetados

**Core:**
- `packages/core/src/utils/filters.ts` — `cityIds` em `EventFilters`/`EventFilterContext`/`applyEventFilters`.
- `packages/core/src/utils/filters.test.ts` — novos casos.
- (rascunho compartilhado filtro↔busca de cidade — store novo ou extensão do `useFiltersStore`, a decidir no plano.)

**Mobile:**
- `apps/mobile/app/filters.tsx` — folga de topo iOS; chips multi + botão de busca; `draftCityIds`.
- `apps/mobile/app/city-search.tsx` — novo (seletor de busca).
- `apps/mobile/app/_layout.tsx` — registrar rota `city-search`.

**Web:**
- `apps/web/components/filters/FiltersSidebar.tsx` — nova seção "Cidade" (chips multi + botão de busca).
- `apps/web/components/filters/CitySearchModal.tsx` (ou similar) — novo (seletor de busca).
- `apps/web/app/(app)/page.tsx` — passar `cityIds` no `ctx`.

**CI:**
- `.github/workflows/ci.yml` — jobs `version-gate` + `tag`.

## Checks (AGENTS.md)

- core/mobile: `typecheck && lint && test`.
- web: `typecheck && build`.
