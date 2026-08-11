# Design — App Web (Next.js + Supabase) e extração de lógica para `@agenda/core`

Data: 2026-06-27

## Objetivo

Criar `apps/web` (Next.js App Router + Supabase) que replica todas as telas do
`apps/mobile`, com responsividade no estilo Instagram (sidebar de navegação à
esquerda + container central com largura máxima, sem coluna de sugestões à
direita). Toda lógica não-visual reaproveitável é movida para `@agenda/core`
com retrocompatibilidade total para mobile e preparada para `apps/admin`. Ao
final, a parte web é removida do `apps/mobile`.

## Decisões (já aprovadas)

- **UI web reescrita** em HTML/Tailwind real (sem `react-native-web`). Mobile
  mantém UI React Native.
- **Pacote compartilhado = `@agenda/core`** (expandir o existente; não criar
  `packages/shared`).
- **Replicar todas as telas** no web (incluindo Mapa/Avisos/Estabelecimento),
  respeitando as mesmas `FEATURES` flags do core.
- **Migração via mover-de-verdade + shim de re-export**: o código passa a viver
  no core; os arquivos antigos em `apps/mobile/src/...` viram
  `export * from '@agenda/core'` para não quebrar os imports `@/...` existentes.
- **Mapa web**: `react-leaflet` (sem API key). O mobile hoje não tem mapa web
  interativo — só uma lista de fallback —, então não há implementação anterior
  a reaproveitar.

## Arquitetura

```
packages/core/  (@agenda/core — fonte única de lógica)
  src/
    supabase/      (existe) client factory + SupabaseStorageAdapter
    queries/       (existe) query layer Supabase
    schemas/ types/ (existe)
    services/      MOVE: catalog, favorites, proximity, realtime,
                         cachePolicy, queryKeys, auth, connectivity
    utils/         MOVE: filters, dates, cn, images, format, links, events,
                         auth, geo, responsiveType, errors
    data/          MOVE: mock, schemas, lookup, index
    theme/         MOVE: colors, shadows, typography, gradients
    config/        MOVE: features (flags v1)
    stores/        MOVE: useAuthStore, useFavoritesStore, useFiltersStore,
                         useNotificationsStore, usePreferencesStore
                         (+ createJsonStorage(adapter) — storage injetável)
    hooks/         MOVE: queries, useActiveCity, useNearbyEstablishments,
                         useGuardedPress, queryClient
    platform/      NOVO: interfaces de plataforma (ConnectivityProvider,
                         storage adapter), sem dependência de RN/DOM

apps/mobile/   injeta adapters RN (AsyncStorage, expo-secure-store, NetInfo);
               arquivos antigos viram shims `export * from '@agenda/core'`.
               UI RN intacta.

apps/web/      NOVO. Next.js App Router + Tailwind v4. Injeta adapters web
               (localStorage, navigator.onLine). Telas reescritas em DOM.

apps/admin/    sem mudança forçada; passa a poder consumir a mesma lógica.
```

### Critério de fronteira "shared"

- Vai para o core tudo que **não importa** `react-native`, `expo-*`,
  `@react-native-*`, `nativewind`, `@shopify/*`. (Levantamento: a grande maioria
  dos services/utils/data/theme/config/stores/hooks de query já é
  platform-agnostic.)
- O que toca plataforma vira **interface + injeção de dependência**, não é
  duplicado.

### Pontos de acoplamento e solução

| Origem (mobile) | Acoplamento | Solução no core |
|---|---|---|
| `store/storage.ts` | AsyncStorage | core exporta `createJsonStorage(adapter)`; mobile passa AsyncStorage, web passa `localStorage` |
| `lib/supabase.ts` | expo-secure-store | client já é factory no core; cada app monta seu `SupabaseStorageAdapter` (web = localStorage + `detectSessionInUrl`) |
| `services/connectivity.ts` + `useConnectivity` | NetInfo | core define `ConnectivityProvider` (interface); mobile = NetInfo, web = `navigator.onLine` + eventos `online/offline` |
| `services/auth.ts` | expo-web-browser (OAuth) | lógica no core; abertura de URL injetada (web = `window.location`) |
| `lib/queryPersister.ts` | AsyncStorage | core expõe factory genérica; cada app injeta seu storage |
| `useResponsive`, `useUserLocation`, `useRealtimeSync` | Dimensions / expo-location / RN | **não movem** (UI/plataforma). Web terá versões DOM próprias |

Os 5 stores zustand passam a receber o storage via parâmetro/factory em vez de
importar AsyncStorage diretamente.

## App web — UI e responsividade

- **Next.js App Router** + **Tailwind v4**. Tokens de cor reaproveitados do
  `theme/colors`/`global.css` do mobile (já são CSS vars hex) → mesmo design dark.
- **Shell estilo Instagram**:
  - Sidebar fixa à esquerda: Feed, Favoritos, Avisos, Mapa, Perfil (+ login/perfil).
  - Container central com **largura máxima ~630px**, centralizado.
  - **Sem** coluna de sugestões à direita.
  - Responsivo: em telas estreitas a sidebar colapsa para barra inferior de ícones.
- **Telas (todas, respeitando `FEATURES`)**: feed, favoritos, avisos, perfil,
  login, onboarding, cidade, filtros, detalhe de evento, detalhe de
  estabelecimento, excluir-conta, privacidade.
- **Mapa**: `react-leaflet` com marcadores dos estabelecimentos da cidade ativa
  + carrossel/lista lateral.
- **Dados**: mesmos hooks `useQuery` + services de `@agenda/core`. React Query
  com persister de localStorage. Provider de Supabase web (localStorage,
  `detectSessionInUrl`).

## Retrocompatibilidade

- Imports `@/services/...`, `@/utils/...`, `@/store/...` etc. do mobile
  continuam válidos via shims de re-export.
- Testes unitários movidos junto com o código para o core (regra do AGENTS.md:
  services/utils têm teste obrigatório). Os `*.test.ts` acompanham seus módulos.
- `apps/admin` (`@agenda/core` já é dependência) ganha acesso à mesma lógica sem
  alteração obrigatória.

## Remoção do web do mobile (passo final)

Após o web app validado:
- Remover `apps/mobile/src/screens/map/MapScreen.web.tsx`.
- Remover deps web: `react-native-web`, `react-dom` (se não usado por testes),
  e o override `@expo/metro-runtime` se aplicável.
- Remover `web` de scripts e o bloco `web: {...}` do `app.config.ts`.
- Remover `dist/` web e `nativewind` web glue se exclusivos de web.

## Testes

- Lógica movida ao core mantém seus testes (jest), rodando no core.
- Web: smoke de render das telas principais + teste do shell responsivo
  (largura máxima, sidebar→bottom bar). Sem framework novo além do que o repo já
  usa.

## Não-objetivos (YAGNI)

- Não criar `packages/shared` separado.
- Não usar `react-native-web` no Next.
- Não refatorar UI do mobile além dos shims de import.
- Não implementar autenticação nova — reusa a do core.
