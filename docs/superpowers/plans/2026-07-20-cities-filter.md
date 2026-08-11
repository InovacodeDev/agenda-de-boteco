# Ajustes nos filtros de eventos (mobile + web) + Version Gate no CI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajustar os filtros de eventos (header no iOS, seletor de busca de cidade, multi-select de cidade) no mobile e no web, e aplicar o Version Gate (tag check) no `ci.yml`.

**Architecture:** Multi-select de cidade vive só no filtro do feed via novo campo `cityIds: string[]` em `EventFilters` (a "cidade ativa" em `usePreferencesStore.cityId` fica single e intocada). O recorte de cidade em `applyEventFilters` passa a aceitar `ctx.cityIds` opcional (retrocompatível). Mobile usa draft local + um store de rascunho no core para a ponte com a rota de busca de cidade; web escreve direto no `useFiltersStore` com modal in-component. CI ganha jobs `version-gate` (valida em push/PR) e `tag` (cria a tag só em push).

**Tech Stack:** TypeScript, React, Next.js 15 (web), Expo Router / React Native (mobile), zustand, TanStack Query, Vitest, Tailwind v4, GitHub Actions.

---

## Referência: dados de teste (mock do core)

Fatos do `packages/core/src/data/mock.ts` usados nos testes:
- Estabelecimentos por cidade: `fln` = e1,e2,e3,e4 · `sao` = e5,e7,e8 · `rio` = e6 · nenhum em `cwb/poa/bhz`.
- Cidades do catálogo: `fln, sao, rio, cwb, poa, bhz`.
- `applyEventFilters(EVENTS, DEFAULT_EVENT_FILTERS, {cityId:'fln'})` → 7 eventos: `ev1,ev2,ev3,ev4,ev9,ev10,ev11` (asserção já existente em `filters.test.ts`).

---

## Task 1: `cityIds` no core (`EventFilters` + `applyEventFilters`)

**Files:**
- Modify: `packages/core/src/utils/filters.ts`
- Test: `packages/core/src/utils/filters.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final do `describe('applyEventFilters', ...)` em `packages/core/src/utils/filters.test.ts` (antes do `});` que fecha o describe):

```ts
  it('cityIds vazio no contexto é idêntico ao recorte single por ctx.cityId', () => {
    const single = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'fln' }));
    const emptyMulti = applyEventFilters(
      EVENTS,
      makeFilters(),
      makeContext({ cityId: 'fln', cityIds: [] }),
    );
    expect(ids(emptyMulti)).toEqual(ids(single));
  });

  it('cityIds com múltiplas cidades retorna a união dos recortes single', () => {
    const fln = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'fln' }));
    const sao = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'sao' }));
    const union = applyEventFilters(
      EVENTS,
      makeFilters(),
      makeContext({ cityId: 'fln', cityIds: ['fln', 'sao'] }),
    );
    // mesma composição (a ordenação por starts_at pode intercalar as duas cidades)
    expect(new Set(ids(union))).toEqual(new Set([...ids(fln), ...ids(sao)]));
    // ordenado por starts_at ascendente
    const times = union.map((e) => new Date(e.starts_at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('cityIds presente sobrepõe ctx.cityId', () => {
    // ctx.cityId aponta pra fln, mas cityIds só tem sao → resultado é o de sao
    const sao = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'sao' }));
    const overridden = applyEventFilters(
      EVENTS,
      makeFilters(),
      makeContext({ cityId: 'fln', cityIds: ['sao'] }),
    );
    expect(ids(overridden)).toEqual(ids(sao));
  });
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `pnpm --filter @agenda/core test -- filters`
Expected: FAIL — os 3 novos testes falham (`cityIds` não existe em `EventFilterContext`; TS ou runtime não reconhece a prop / recorte ignora `cityIds`).

- [ ] **Step 3: Adicionar `cityIds` ao `EventFilters` e default**

Em `packages/core/src/utils/filters.ts`, dentro da interface `EventFilters` (após `sortBy: SortBy;`, antes do `}`):

```ts
  /** cidades selecionadas no filtro (união). Vazio = usa a cidade ativa do contexto. */
  cityIds: string[];
```

E em `DEFAULT_EVENT_FILTERS` (após `sortBy: 'date',`):

```ts
  cityIds: [],
```

- [ ] **Step 4: Adicionar `cityIds` opcional ao contexto**

Em `EventFilterContext` (após `cityId: string;`):

```ts
  /** Quando presente e não-vazio, o recorte de cidade usa esta união e sobrepõe `cityId`. */
  cityIds?: string[];
```

- [ ] **Step 5: Aplicar o recorte por união em `applyEventFilters`**

Em `applyEventFilters`, logo após `const isVirtualCity = isVirtualCityId(ctx.cityId);` (linha ~115), adicionar:

```ts
  // Multi-select do filtro sobrepõe a cidade ativa quando presente e não-vazio.
  const cityIds = ctx.cityIds && ctx.cityIds.length > 0 ? ctx.cityIds : null;
```

Substituir a linha do recorte de cidade (hoje):

```ts
      if (!isVirtualCity && establishment.city_id !== ctx.cityId) return false;
```

por:

```ts
      if (cityIds) {
        if (!cityIds.includes(establishment.city_id)) return false;
      } else if (!isVirtualCity && establishment.city_id !== ctx.cityId) {
        return false;
      }
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `pnpm --filter @agenda/core test -- filters`
Expected: PASS — todos os testes de `filters.test.ts` verdes (os 3 novos + os antigos, incl. o "fln → 7 eventos").

- [ ] **Step 7: Typecheck + lint do core**

Run: `pnpm --filter @agenda/core typecheck && pnpm --filter @agenda/core lint`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/utils/filters.ts packages/core/src/utils/filters.test.ts
git commit -m "feat(core): support multi-city filter via cityIds in applyEventFilters"
```

---

## Task 2: Store de rascunho de cidade no core (ponte mobile filtro↔busca)

**Files:**
- Create: `packages/core/src/stores/useCityDraftStore.ts`
- Modify: `packages/core/src/index.ts` (export)
- Test: `packages/core/src/stores/useCityDraftStore.test.ts`

Por que existe: no mobile o filtro é um `formSheet` (rota `/filters`) com draft local, e a busca de cidade é **outra rota** (`/city-search`). Precisa de um estado compartilhado fora do componente para a rota de busca devolver a seleção ao draft do filtro. O web NÃO usa este store (modal in-component com `useState` — ver Task 6).

- [ ] **Step 1: Escrever o teste que falha**

Criar `packages/core/src/stores/useCityDraftStore.test.ts`:

```ts
import { useCityDraftStore } from './useCityDraftStore';

describe('useCityDraftStore', () => {
  beforeEach(() => {
    useCityDraftStore.getState().setDraftCityIds([]);
  });

  it('setDraftCityIds substitui a lista', () => {
    useCityDraftStore.getState().setDraftCityIds(['fln', 'sao']);
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['fln', 'sao']);
  });

  it('toggleDraftCity adiciona quando ausente e remove quando presente', () => {
    const { toggleDraftCity } = useCityDraftStore.getState();
    toggleDraftCity('fln');
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['fln']);
    toggleDraftCity('sao');
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['fln', 'sao']);
    toggleDraftCity('fln');
    expect(useCityDraftStore.getState().draftCityIds).toEqual(['sao']);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @agenda/core test -- useCityDraftStore`
Expected: FAIL — `Cannot find module './useCityDraftStore'`.

- [ ] **Step 3: Criar o store**

Criar `packages/core/src/stores/useCityDraftStore.ts`:

```ts
import { create } from 'zustand';

export interface CityDraftState {
  draftCityIds: string[];
  setDraftCityIds: (ids: string[]) => void;
  toggleDraftCity: (id: string) => void;
}

/**
 * Rascunho efêmero da seleção de cidades do filtro do feed. Serve de ponte
 * entre a tela de filtros e a rota de busca de cidade (mobile), que vivem em
 * rotas separadas. Não é persistido — o commit definitivo é o `cityIds` do
 * `useFiltersStore` ao aplicar os filtros.
 */
export const useCityDraftStore = create<CityDraftState>()((set) => ({
  draftCityIds: [],
  setDraftCityIds: (ids) => set({ draftCityIds: ids }),
  toggleDraftCity: (id) =>
    set((state) => ({
      draftCityIds: state.draftCityIds.includes(id)
        ? state.draftCityIds.filter((cityId) => cityId !== id)
        : [...state.draftCityIds, id],
    })),
}));
```

- [ ] **Step 4: Exportar do core**

Em `packages/core/src/index.ts`, adicionar (junto aos outros `export * from './stores/...'`):

```ts
export * from './stores/useCityDraftStore';
```

Verifique o padrão real de export do arquivo (pode ser `export { useFiltersStore } from ...`). Siga o padrão existente para os stores — grep por `useFiltersStore` em `packages/core/src/index.ts` e replique a forma.

- [ ] **Step 5: Rodar teste + typecheck**

Run: `pnpm --filter @agenda/core test -- useCityDraftStore && pnpm --filter @agenda/core typecheck`
Expected: PASS, sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/stores/useCityDraftStore.ts packages/core/src/stores/useCityDraftStore.test.ts packages/core/src/index.ts
git commit -m "feat(core): add ephemeral city draft store for filter/search bridge"
```

---

## Task 3: Mobile — folga de topo do header no iOS (`filters.tsx`)

**Files:**
- Modify: `apps/mobile/app/filters.tsx`

- [ ] **Step 1: Importar `Platform`**

Em `apps/mobile/app/filters.tsx`, na linha de import de `react-native` (linha 4):

```ts
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
```

- [ ] **Step 2: Inserir espaçador iOS acima do `ScreenHeader`**

No JSX, dentro do `<View className="bg-popover flex-1">` (linha ~132), imediatamente ANTES do `<ScreenHeader ...>`, adicionar:

```tsx
      {Platform.OS === 'ios' && <View className="h-2" />}
```

Racional: o sheet tem `sheetGrabberVisible: true`; o grabber nativo ocupa o topo e o `ScreenHeader` (não-overlay) tem `paddingTop: 8` fixo. A folga iOS-only dá respiro sob o grabber sem alterar o layout do Android (que não tem grabber). `h-2` = 8px.

- [ ] **Step 3: Verificar no simulador iOS**

Rodar o app (dev client / Expo) e abrir o filtro. Expected: o título "Filtros" não fica colado no grabber; há um respiro visível. (Se não houver simulador disponível nesta sessão, validar por inspeção do diff e deixar registrado.)

- [ ] **Step 4: Typecheck + lint mobile**

Run: `pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/filters.tsx
git commit -m "fix(mobile): add iOS top spacing under sheet grabber in filters header"
```

---

## Task 4: Mobile — rota de busca de cidade (`city-search.tsx`)

**Files:**
- Create: `apps/mobile/app/city-search.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (registrar rota)

Tela de busca apresentada sobre o filtro. Campo de texto filtra `useCitiesQuery()`, lista multi-select com seleção própria seedada do `useCityDraftStore`, botão "Confirmar" que persiste no `useCityDraftStore` e volta.

- [ ] **Step 1: Registrar a rota no `_layout.tsx`**

Em `apps/mobile/app/_layout.tsx`, após o bloco `<Stack.Screen name="filters" ... />` (linha ~165), adicionar:

```tsx
            <Stack.Screen
              name="city-search"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.92],
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                contentStyle: { backgroundColor: colors.popover },
              }}
            />
```

- [ ] **Step 2: Criar a tela `city-search.tsx`**

Criar `apps/mobile/app/city-search.tsx`:

```tsx
import type { City } from '@agenda/core';
import { useCityDraftStore } from '@agenda/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { useCitiesQuery } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import { ScrollView, Text, TextInput, View } from '@/tw';
import { normalizeText } from '@/utils/filters';

export default function CitySearchSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cities } = useCitiesQuery();
  const draftCityIds = useCityDraftStore((state) => state.draftCityIds);
  const setDraftCityIds = useCityDraftStore((state) => state.setDraftCityIds);

  // seleção própria do modal de busca — só devolve ao rascunho ao "Confirmar"
  const [selected, setSelected] = useState<string[]>(draftCityIds);
  const [query, setQuery] = useState('');

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    const list = cities ?? [];
    if (!q) return list;
    return list.filter((c) => normalizeText(c.name).includes(q));
  }, [cities, query]);

  const confirm = () => {
    setDraftCityIds(selected);
    router.back();
  };

  return (
    <View className="bg-popover flex-1">
      <ScreenHeader
        title="Buscar cidade"
        right={
          <GuardedPressable
            accessibilityRole="button"
            accessibilityLabel="Fechar busca de cidade"
            onPress={() => router.back()}
            hitSlop={8}
            className="active:opacity-80"
          >
            <Icon name="xmark" color={colors.mutedForeground} size={20} />
          </GuardedPressable>
        }
      />
      <View className="px-5 pt-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Digite o nome da cidade"
          placeholderTextColor={colors.mutedForeground}
          autoFocus
          className="bg-card text-foreground font-body h-12 rounded-2xl px-4 text-[14px]"
        />
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-3 px-5 pb-5 pt-4"
      >
        {results.map((city: City) => {
          const isSelected = selected.includes(city.id);
          return (
            <GuardedPressable
              key={city.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => toggle(city.id)}
              className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
            >
              <View>
                <Text className="font-body-semibold text-foreground text-[15px]">{city.name}</Text>
                <Text className="font-body text-muted-foreground text-[12px]">{city.uf}</Text>
              </View>
              {isSelected ? <Icon name="check" color={colors.primary} size={18} /> : null}
            </GuardedPressable>
          );
        })}
        {results.length === 0 ? (
          <Text className="font-body text-muted-foreground text-center text-[13px]">
            Nenhuma cidade encontrada.
          </Text>
        ) : null}
      </ScrollView>
      <View
        className="bg-popover px-5 pt-4 pb-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label="Confirmar"
          onPress={confirm}
          className="w-full"
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    </View>
  );
}
```

> NOTA: `TextInput` vem de `@/tw` (não há `@/components/ui/TextInput`) e recebe className Tailwind via `style` — props `value`/`onChangeText`/`placeholder`/`placeholderTextColor`, padrão idêntico ao `SearchBar.tsx`. `Button` (label/onPress) é o mesmo já usado em `filters.tsx`.

- [ ] **Step 3: Typecheck + lint mobile**

Run: `pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile lint`
Expected: sem erros. (Se houver erro de import do input, corrigir conforme a NOTA e repetir.)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/city-search.tsx apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add city search sheet with text filter and multi-select"
```

---

## Task 5: Mobile — filtro usa multi-select de cidade (`filters.tsx`)

**Files:**
- Modify: `apps/mobile/app/filters.tsx`

Trocar o single `draftCityId` pelo `useCityDraftStore` (multi), atualizar os chips para toggle, adicionar botão "Buscar cidade" (navega para `/city-search`), e comitar `cityIds` no `apply()`.

- [ ] **Step 1: Trocar imports e leitura de estado**

Em `apps/mobile/app/filters.tsx`:

Adicionar ao import de `@agenda/core` o `useCityDraftStore` (já existe `import type { City } from '@agenda/core';` na linha 1 — adicionar um import de valor):

```ts
import { useCityDraftStore } from '@agenda/core';
```

Adicionar import do router já existe (`useRouter`). Nas leituras de estado (linhas 49-51), REMOVER `cityId`/`setCity`/`setCustomCity` do `usePreferencesStore` **NÃO** — o multi agora vive em `EventFilters`/rascunho, então essas linhas do `usePreferencesStore` deixam de ser usadas pelo filtro. Substituir o bloco:

```ts
  const cityId = usePreferencesStore((state) => state.cityId);
  const setCity = usePreferencesStore((state) => state.setCity);
  const setCustomCity = usePreferencesStore((state) => state.setCustomCity);
```

por:

```ts
  const draftCityIds = useCityDraftStore((state) => state.draftCityIds);
  const setDraftCityIds = useCityDraftStore((state) => state.setDraftCityIds);
  const toggleDraftCity = useCityDraftStore((state) => state.toggleDraftCity);
```

Remover também o import agora não usado `import { usePreferencesStore } from '@/store/usePreferencesStore';` (linha 19) e `resolveCityFromLocation`/`useUserLocation`/`currentCity` **somente se** deixarem de ser usados. ATENÇÃO: `currentCity` (a cidade atual "(atual)") continua sendo mostrada — mantenha `useUserLocation` + `resolveCityFromLocation` + `currentCity`.

- [ ] **Step 2: Seed do rascunho a partir de `filters.cityIds`**

Remover a linha 57 (`const [draftCityId, setDraftCityId] = useState(cityId);`).

Adicionar um efeito que seeda o rascunho de cidade quando a tela monta, a partir do filtro persistido:

```ts
  useEffect(() => {
    setDraftCityIds(storedFilters.cityIds);
    // seeda só na montagem — a partir daí o rascunho é a fonte de verdade
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

(`storedFilters` já é lido na linha 47.)

- [ ] **Step 3: Ajustar `handleUseMyLocation` para toggle multi**

No `handleUseMyLocation` (linhas 76-92), a chamada `setDraftCityId(city.id)` (linha 84) vira:

```ts
          toggleDraftCity(city.id);
```

- [ ] **Step 4: Ajustar `clear` e `apply`**

Em `clear` (linha 117-119), adicionar reset do rascunho:

```ts
  const clear = () => {
    setDraft(DEFAULT_EVENT_FILTERS);
    setDraftCityIds([]);
  };
```

Substituir `apply` (linhas 121-129) inteiro por:

```ts
  const apply = () => {
    replaceFilters({ ...draft, cityIds: draftCityIds });
    router.back();
  };
```

(Não mexe mais em `usePreferencesStore` — a cidade ativa fica intocada; o multi vai para `EventFilters.cityIds`.)

- [ ] **Step 5: Atualizar a seção "Cidade" (chips toggle + botão de busca)**

Substituir o conteúdo do `<FilterSection title="Cidade">` (linhas 193-220) por:

```tsx
        <FilterSection title="Cidade">
          <View className="flex-row flex-wrap gap-2">
            {currentCity ? (
              <Chip
                key={currentCity.id}
                label={`${currentCity.name} (atual)`}
                selected={draftCityIds.includes(currentCity.id)}
                onPress={() => toggleDraftCity(currentCity.id)}
              />
            ) : (
              <Chip
                label={resolvingLocation ? 'Buscando...' : 'Minha localização'}
                selected={false}
                onPress={handleUseMyLocation}
              />
            )}
            {(cities ?? [])
              .filter((c) => c.id !== currentCity?.id)
              .slice(0, 5)
              .map((city) => (
                <Chip
                  key={city.id}
                  label={city.name}
                  selected={draftCityIds.includes(city.id)}
                  onPress={() => toggleDraftCity(city.id)}
                />
              ))}
            <Chip label="Buscar cidade" selected={false} onPress={() => router.push('/city-search')} />
          </View>
        </FilterSection>
```

Mudanças vs. hoje: `selected` agora é `draftCityIds.includes(...)`; `onPress` é `toggleDraftCity(...)`; a lista de catálogo é limitada a `.slice(0, 5)` (5 chips rápidos); e um chip "Buscar cidade" abre a rota de busca.

- [ ] **Step 6: Typecheck + lint mobile**

Run: `pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile lint`
Expected: sem erros. Confirmar que não sobrou import não usado (`usePreferencesStore`, `setCity`, `setCustomCity`, `City` se aplicável).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/filters.tsx
git commit -m "feat(mobile): multi-select city in feed filter with quick chips and search"
```

---

## Task 6: Mobile — feed passa `cityIds` para o filtro (`index.tsx`)

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Passar `cityIds` no contexto de `applyEventFilters`**

Em `apps/mobile/app/(tabs)/index.tsx`, no `applyEventFilters(events ?? [], filters, { ... })` (linhas ~156-163), adicionar a prop `cityIds`:

```tsx
        ? applyEventFilters(events ?? [], filters, {
            now,
            cityId: city.id,
            cityIds: filters.cityIds,
            establishmentsById,
            nearbyEstablishmentIds,
          })
```

`filters` já está no escopo (linha lida do `useFiltersStore`). O `useMemo` deps inclui `filters`, então `filters.cityIds` já é coberto — não precisa alterar o array de deps.

- [ ] **Step 2: Typecheck mobile**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(tabs)/index.tsx"
git commit -m "feat(mobile): wire cityIds from filter into feed event query"
```

---

## Task 7: Web — seção "Cidade" no filtro com multi-select e modal de busca

**Files:**
- Create: `apps/web/components/filters/CitySearchModal.tsx`
- Modify: `apps/web/components/filters/FiltersSidebar.tsx`

O web escreve direto no `useFiltersStore` (sem draft; "Aplicar" só fecha). Adiciona a seção "Cidade" (não existe hoje), com chips toggle sobre `filters.cityIds` + botão que abre o `CitySearchModal`. O store precisa de setters para `cityIds`.

- [ ] **Step 1: Adicionar setters de `cityIds` ao `useFiltersStore` (core)**

Em `packages/core/src/stores/useFiltersStore.ts`:

Na interface `FiltersState` (após `setOpenNow`):

```ts
  toggleCity: (id: string) => void;
  setCityIds: (ids: string[]) => void;
```

Na implementação (após `setOpenNow: (value) => patchFilters({ openNow: value }),`):

```ts
    toggleCity: (id) =>
      set((state) => ({
        filters: {
          ...state.filters,
          cityIds: state.filters.cityIds.includes(id)
            ? state.filters.cityIds.filter((cityId) => cityId !== id)
            : [...state.filters.cityIds, id],
        },
      })),
    setCityIds: (cityIds) => patchFilters({ cityIds }),
```

Teste (adicionar `packages/core/src/stores/useFiltersStore.test.ts` se não existir; se existir, adicionar os casos):

```ts
import { useFiltersStore } from './useFiltersStore';
import { DEFAULT_EVENT_FILTERS } from '../utils/filters';

describe('useFiltersStore cityIds', () => {
  beforeEach(() => {
    useFiltersStore.getState().replaceFilters(DEFAULT_EVENT_FILTERS);
  });

  it('toggleCity adiciona e remove', () => {
    useFiltersStore.getState().toggleCity('fln');
    expect(useFiltersStore.getState().filters.cityIds).toEqual(['fln']);
    useFiltersStore.getState().toggleCity('fln');
    expect(useFiltersStore.getState().filters.cityIds).toEqual([]);
  });

  it('setCityIds substitui a lista', () => {
    useFiltersStore.getState().setCityIds(['fln', 'sao']);
    expect(useFiltersStore.getState().filters.cityIds).toEqual(['fln', 'sao']);
  });
});
```

Run: `pnpm --filter @agenda/core test -- useFiltersStore && pnpm --filter @agenda/core typecheck`
Expected: PASS.

Commit parcial:

```bash
git add packages/core/src/stores/useFiltersStore.ts packages/core/src/stores/useFiltersStore.test.ts
git commit -m "feat(core): add toggleCity/setCityIds to filters store"
```

- [ ] **Step 2: Criar o `CitySearchModal` (web)**

Criar `apps/web/components/filters/CitySearchModal.tsx`:

```tsx
'use client';

import { type City, useCitiesQuery } from '@agenda/core';
import { useEffect, useMemo, useState } from 'react';

import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export interface CitySearchModalProps {
  isOpen: boolean;
  initialSelected: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export function CitySearchModal({ isOpen, initialSelected, onClose, onConfirm }: CitySearchModalProps) {
  const { data: cities } = useCitiesQuery();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState('');

  // ressincroniza a seleção sempre que o modal reabre
  useEffect(() => {
    if (isOpen) {
      setSelected(initialSelected);
      setQuery('');
    }
  }, [isOpen, initialSelected]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = cities ?? [];
    if (!q) return list;
    return list.filter((c) => normalize(c.name).includes(q));
  }, [cities, query]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-[16px] font-[family-name:var(--font-heading)] font-bold text-foreground">
            Buscar cidade
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca de cidade"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-foreground transition-opacity hover:opacity-80"
          >
            <XIcon size={16} />
          </button>
        </header>
        <div className="px-5 pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome da cidade"
            aria-label="Buscar cidade"
            autoFocus
            className="h-11 w-full rounded-2xl bg-surface-elevated px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 scrollbar-thin">
          {results.map((city: City) => {
            const isSelected = selected.includes(city.id);
            return (
              <button
                key={city.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(city.id)}
                className={cn(
                  'flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-primary/15' : 'bg-surface-elevated hover:opacity-80',
                )}
              >
                <span>
                  <span className="block text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
                    {city.name}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">{city.uf}</span>
                </span>
                {isSelected ? <span className="text-primary text-[13px] font-semibold">✓</span> : null}
              </button>
            );
          })}
          {results.length === 0 ? (
            <p className="text-center text-[13px] text-muted-foreground">Nenhuma cidade encontrada.</p>
          ) : null}
        </div>
        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="w-full rounded-2xl bg-primary py-3 text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-80"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Adicionar a seção "Cidade" ao `FiltersSidebar`**

Em `apps/web/components/filters/FiltersSidebar.tsx`:

Ajustar o import de `@agenda/core` (linhas 3-8) para incluir `useCitiesQuery`:

```tsx
import {
  type DateBucket,
  type SortBy,
  useCitiesQuery,
  useFiltersStore,
  useMusicStylesQuery,
} from '@agenda/core';
```

Adicionar imports (após os imports de `@/components/...`):

```tsx
import { CitySearchModal } from '@/components/filters/CitySearchModal';
import { useState } from 'react';
```

(Se `react` já estiver importado no arquivo, adicionar `useState` ao import existente em vez de duplicar.)

Dentro do componente, adicionar leituras do store e estado do modal (após `const resetFilters = ...`, linha 75):

```tsx
  const toggleCity = useFiltersStore((state) => state.toggleCity);
  const setCityIds = useFiltersStore((state) => state.setCityIds);
  const { data: cities } = useCitiesQuery();
  const [isCitySearchOpen, setIsCitySearchOpen] = useState(false);
```

Adicionar a seção "Cidade" no corpo do painel — inserir logo APÓS o `</FilterSection>` da seção "Ordenar por" (linha ~145) e ANTES da seção "Distância":

```tsx
          <FilterSection title="Cidade">
            <div className="flex flex-wrap gap-2">
              {(cities ?? []).slice(0, 5).map((city) => (
                <Chip
                  key={city.id}
                  label={city.name}
                  selected={filters.cityIds.includes(city.id)}
                  onClick={() => toggleCity(city.id)}
                />
              ))}
              <Chip
                label="Buscar cidade"
                selected={false}
                onClick={() => setIsCitySearchOpen(true)}
              />
            </div>
          </FilterSection>
```

Adicionar o modal ANTES do `</>` de fechamento do return (após o `</aside>`, linha ~230):

```tsx
      <CitySearchModal
        isOpen={isCitySearchOpen}
        initialSelected={filters.cityIds}
        onClose={() => setIsCitySearchOpen(false)}
        onConfirm={(ids) => {
          setCityIds(ids);
          setIsCitySearchOpen(false);
        }}
      />
```

> NOTA: o web não tem "cidade atual (atual)" no filtro hoje (o mobile resolve geolocalização; o web tem isso só em `cidade/page.tsx`). Para paridade mínima e sem geoloc no filtro web, os chips rápidos são as 5 primeiras do catálogo + "Buscar cidade". Isso atende o requisito de multi-select e busca. (Adicionar "(atual)" no web fica como melhoria futura — não está no escopo travado.)

- [ ] **Step 4: Typecheck + build web**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web build`
Expected: sem erros. (Parar qualquer dev server antes do build — `.next` compartilhado, conforme AGENTS.md.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/filters/CitySearchModal.tsx apps/web/components/filters/FiltersSidebar.tsx
git commit -m "feat(web): add city section to feed filter with multi-select and search modal"
```

---

## Task 8: Web — feed passa `cityIds` para o filtro (`page.tsx`)

**Files:**
- Modify: `apps/web/app/(app)/page.tsx`

- [ ] **Step 1: Passar `cityIds` no contexto**

Em `apps/web/app/(app)/page.tsx`, no `applyEventFilters(events ?? [], filters, { ... })` (linhas ~79-86), adicionar `cityIds: filters.cityIds`:

```tsx
         ? applyEventFilters(events ?? [], filters, {
            now,
            cityId: city.id,
            cityIds: filters.cityIds,
            establishmentsById,
            nearbyEstablishmentIds,
          })
```

- [ ] **Step 2: Typecheck + build web**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web build`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(app)/page.tsx"
git commit -m "feat(web): wire cityIds from filter into feed event query"
```

---

## Task 9: CI — Version Gate no `ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`

Adicionar `permissions: contents: write`, um job `version-gate` (valida em push e PR), fazer `verify` depender dele, e um job `tag` (cria a tag só em push). Lógica espelhada de `deploy.yml`.

- [ ] **Step 1: Reescrever `ci.yml`**

Substituir o conteúdo de `.github/workflows/ci.yml` por:

```yaml
name: CI

on:
  push:
    branches: [ release, beta, alfa ]
  pull_request:
    branches: [ release, beta, alfa ]

permissions:
  contents: write

jobs:
  version-gate:
    name: Version Gate (tag check)
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.check.outputs.version }}
      tag: ${{ steps.check.outputs.tag }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Ensure version is not already deployed on this channel
        id: check
        run: |
          set -euo pipefail
          version=$(jq -r '.version' apps/mobile/package.json)
          tag="${GITHUB_REF_NAME}-v${version}"
          echo "version=$version" >> "$GITHUB_OUTPUT"
          echo "tag=$tag" >> "$GITHUB_OUTPUT"
          git fetch --tags --force
          if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
            echo "::error::A versão $version já foi publicada no canal $GITHUB_REF_NAME (tag $tag existe). Bumpe apps/mobile/package.json antes de subir."
            exit 1
          fi
          echo "Tag $tag ainda não existe — liberado."

  verify:
    name: Build & Verify
    runs-on: ubuntu-latest
    needs: version-gate

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.20.0

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Cache Turbo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Lint
        run: pnpm run lint

      - name: Run Typecheck
        run: pnpm run typecheck

      - name: Run Build
        run: pnpm run build

  # Cria a tag do canal só em push (não em PR — PR não queima versão).
  # NOTA: enquanto o deploy.yml não roda no GitHub, o CI é o dono das tags de
  # versão. Quando o deploy voltar a rodar, remover a criação de tag daqui
  # (ou do deploy.yml) para não duplicar — os dois tentariam criar a mesma tag.
  tag:
    name: Tag channel version
    runs-on: ubuntu-latest
    needs: [version-gate, verify]
    if: github.event_name == 'push'

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Tag version for this channel
        run: |
          set -euo pipefail
          tag="${{ needs.version-gate.outputs.tag }}"
          git tag "$tag"
          git push origin "refs/tags/$tag"
          echo "Tag $tag criada — este canal fica bloqueado até o próximo bump de versão."
```

- [ ] **Step 2: Validar a sintaxe YAML**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml ok')"`
Expected: `yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add version gate (tag check) and channel tagging to CI workflow"
```

---

## Task 10: Verificação integrada final

**Files:** nenhum (só checks)

- [ ] **Step 1: Checks do core**

Run: `pnpm --filter @agenda/core typecheck && pnpm --filter @agenda/core lint && pnpm --filter @agenda/core test`
Expected: tudo verde.

- [ ] **Step 2: Checks do mobile**

Run: `pnpm --filter @agenda/mobile typecheck && pnpm --filter @agenda/mobile lint && pnpm --filter @agenda/mobile test`
Expected: tudo verde.

- [ ] **Step 3: Checks do web**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web build`
Expected: sem erros.

- [ ] **Step 4: Revisão de diff**

Run: `git log --oneline alfa..HEAD` e `git diff alfa..HEAD --stat`
Expected: commits das Tasks 1-9 presentes; nenhum arquivo inesperado tocado; `usePreferencesStore` NÃO alterado (cidade ativa intocada).
