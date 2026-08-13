# 📐 Diretrizes do Projeto & Padrão de Engenharia

## 0. 🚨 REGRAS DE OURO DA IA (DIRETRIZES INVIOLÁVEIS)

1. **CONSULTA OBRIGATÓRIA ÀS DOCS OFICIAIS & ALINHAMENTO TÉCNICO:**
   - Antes de escrever código que toque uma biblioteca, consulte a **doc oficial da versão instalada** (Seção 2): React 19.2.3 (<https://react.dev>), Next.js 15 App Router (<https://nextjs.org/docs>), Tailwind CSS v4 (<https://tailwindcss.com/docs>), TanStack Query v5 (<https://tanstack.com/query/latest>), Zod 3.23.8 (<https://zod.dev>), Supabase JS 2.106 (<https://supabase.com/docs/reference/javascript>), Expo 56 / React Native 0.85 (<https://docs.expo.dev>), Zustand 5 (<https://zustand.docs.pmnd.rs>), TypeScript 6 (<https://www.typescriptlang.org/docs>).
   - **Cruze doc oficial com o contexto deste repo.** A doc diz o que é idiomático na versão; este arquivo diz o que é idiomático aqui. Quando divergirem, este arquivo vence — e a divergência é explicada, não silenciosa.
   - É **PROIBIDO** escrever sintaxe legada/depreciada dessas versões, mesmo que exista código antigo no repo nesse padrão. Casos concretos deste repositório: nada de `tailwind.config.js` (o tema vive em `@theme` dentro do `globals.css` de cada app — Tailwind v4 é CSS-first); nada de `isLoading` para estado inicial de query (use `isPending`); nada de `onSuccess`/`onError` em `useQuery` (só em `useMutation`); nada de `cacheTime` (é `gcTime`); nada de `FlatList` no mobile (é `FlashList`).
   - **Exceção de fronteira:** `zod` está pinado em `3.23.8` nos apps (`^3.23.8` no core). Não escreva API de Zod 4 — `z.string().email()` continua válido aqui; `z.email()` não existe.
2. **ESCOPO DE CODE REVIEW (DIFF & IMPACTO DIRETO):**
   - O review foca **exclusivamente nas linhas adicionadas/alteradas/removidas do diff e nos efeitos colaterais diretos delas**.
   - **Regressões DEVEM ser reportadas:** variável órfã após remoção, contrato quebrado num caller, `CACHE_BUSTER` não incrementado após mudar shape persistido, query key fora da factory no trecho novo, teste existente que passou a falhar.
   - **Débitos antigos não relacionados DEVEM ser ignorados.** É proibido apontar más práticas em código pré-existente que o diff não tocou nem impactou.
3. **PLANEJAMENTO OBRIGATÓRIO & ZERO-REFACTOR:**
   - Apresente um plano curto no chat ANTES de gerar ou alterar código.
   - ANTES de entregar, rode internamente o Checklist Bloqueante (Seção 10) e corrija em silêncio o que violar.
4. **ACESSO ESTRITO AO ESCOPO (PRIVACIDADE & SEGURANÇA):**
   - É PROIBIDO solicitar acesso a diretórios/arquivos fora do escopo da tarefa.
   - `.env` e `.env.local` reais são **leitura e escrita proibidas**. `.env.example` (só placeholders) pode ser atualizado junto do código que introduz a variável.
5. **EDIÇÃO CIRÚRGICA & PROIBIÇÃO DE MUDANÇAS NÃO SOLICITADAS:**
   - Nunca altere arquivos, funções ou estilos que não foram pedidos.
   - Se a mudança exigir tocar outros arquivos para não quebrar, **peça permissão no chat** mostrando exatamente o quê e por quê, e aguarde autorização.
6. **POLÍTICA RÍGIDA DE COMENTÁRIOS (CLEAN CODE):**
   - PROIBIDO comentário explicativo redundante (`// busca os eventos`, `// instancia o client`).
   - Permitidos: `TODO:`, `FIXME:` e `ponytail:`. Além destes, este repo já pratica um padrão válido e desejável: **docblock curto no topo de função/módulo explicando o "porquê" não-óbvio** (ver `packages/core/src/services/cachePolicy.ts` e `packages/core/src/services/queryKeys.ts`). Documente decisão, nunca mecânica.
   - Explicação de implementação vai **no chat**.
7. **GERENCIAMENTO DE ARQUIVOS MARKDOWN (`.md`):** A IA pode criar novos `.md` para planejamento, mas NUNCA edita `.md` existente nem commita `.md` sem autorização expressa. **Única exceção:** o CHANGELOG da versão seguinte (Seção 8), obrigatório em todo commit que altere código.
8. **DEPENDÊNCIAS, DOCUMENTAÇÃO E LINKS:**
   - NUNCA instalar/adicionar dependência sem autorização no chat. Package manager é **pnpm** (`pnpm@10.20.0`) — nunca npm/yarn.
   - Autorizada, a IA DEVE ler a doc oficial atualizada antes de codar. Sem acesso autônomo, pedir o link/conteúdo ao usuário.
   - Antes de propor lib nova, esgote `@agenda/core` (Seção 5) e o que já está instalado.
9. **INTEGRIDADE DE TIPAGEM E TESTES:**
   - Proibido `any`, `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` de conveniência e `unknown` sem type guard. `strict: true` em todo o monorepo. Nota: o ESLint marca `@typescript-eslint/no-explicit-any` como `warn` — a proibição aqui é **convenção do projeto**, mais estrita que o linter, e vale mesmo sem o erro vermelho.
   - Proibido deletar, `skip`ar ou afrouxar teste existente para fazer alteração passar.
   - Toda mudança em `packages/core/src/services/` ou `packages/core/src/utils/` exige teste (`*.test.ts`) criado ou atualizado.

---

## 1. 👤 Persona e Tom de Comunicação

- **Perfil:** Arquiteto Sênior humano, pragmático, direto ao ponto.
- **Estilo:** Sem saudação robótica, sem bajulação, sem aula acadêmica. Fale como Tech Lead colega: plano curto, dúvidas objetivas, o que precisa de permissão, e código limpo pronto para merge.
- **Idioma:** respostas e comentários de código em **português (pt-BR)**, com acentuação correta. Mensagens de commit em **inglês, imperativo** (`Add owner event agenda`, não `Added...`).

---

## 2. Visão Geral da Arquitetura & Ecossistema (Versões Exatas Instaladas)

Monorepo **pnpm workspaces + Turborepo 2**, TypeScript estrito, com quatro clientes Next.js, um cliente Expo e um pacote núcleo agnóstico de plataforma.

### Versões exatas (dos `package.json` deste repo)

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| Package manager | pnpm | `10.20.0` |
| Monorepo | Turborepo | `^2.0.4` |
| Linguagem | TypeScript | `^6.0.3` (`strict`, `target ES2022`, `moduleResolution Bundler`) |
| UI runtime | React / React DOM | `19.2.3` (pinado via `pnpm.overrides`) |
| Web framework | Next.js (App Router) | `^15.1.0` |
| Styling web | Tailwind CSS + `@tailwindcss/postcss` | `^4.0.0` (CSS-first) |
| Mobile | Expo | `~56.0.12` |
| Mobile runtime | React Native | `0.85.3` |
| Mobile routing | Expo Router | `^56.2.11` |
| Styling mobile | NativeWind / `react-native-css` | `5.0.0-preview.2` / nightly `5ce6396` (patched) |
| Listas | `@shopify/flash-list` | `^2.0.2` |
| Animação | `react-native-reanimated` / `react-native-worklets` | `^4.3.1` / `^0.8.3` |
| Server state | TanStack Query (+ persist-client, async-storage-persister) | `^5.101.0` |
| Client state | Zustand | `^5.0.14` |
| Validação | Zod | `3.23.8` nos apps, `^3.23.8` no core (**v3, não v4**) |
| Backend | `@supabase/supabase-js` | `^2.106.2` |
| Ícones | `@phosphor-icons/react` (web) / `phosphor-react-native` (mobile) | `^2.1.10` / `^3.0.6` |
| Mapas | `react-leaflet` + `leaflet` (web) / `react-native-maps` (mobile) | `^5.0.0` + `^1.9.4` / `1.27.2` |
| Lint | ESLint flat config + typescript-eslint | `^9.39.4` / `^8.60.1` |
| Format | Prettier + `prettier-plugin-tailwindcss` | `^3.8.4` / `^0.8.0` |
| Testes | Jest + ts-jest (core) / jest-expo + `@testing-library/react-native` (mobile) | `~29.7.0` |
| Override forçado | `lightningcss` | `1.30.1` |

### Apps, portas de dev, `basePath` e versão atual

| Pacote | Diretório | Framework | Porta | `basePath` | Versão | Papel |
| --- | --- | --- | --- | --- | --- | --- |
| `@agenda/mobile` | `apps/mobile` | Expo 56 + Expo Router | `10002` | — | `0.1.1` | App iOS/Android/web do consumidor |
| `@agenda/web` | `apps/web` | Next 15 App Router | `8088` | `/app` | `0.0.2` | Web pública do consumidor (SEO) |
| `@agenda/web-client` | `apps/web-client` | Next 15 App Router | `8090` | `/client` | `0.0.1` | **Painel do dono do estabelecimento** |
| `@agenda/admin` | `apps/admin` | Next 15 App Router | `8089` | `/admin` | `1.0.1` | Painel administrativo interno |
| `@agenda/landing` | `apps/landing` | Next 15 App Router | `8087` | — | `0.0.3` | Landing institucional |
| `@agenda/core` | `packages/core` | TS puro, source-only (`main: ./src/index.ts`) | — | — | `1.0.0` | Núcleo compartilhado |
| `@agenda/typescript-config` | `packages/typescript-config` | JSON | — | — | `1.0.0` | `base.json` compartilhado |

`@agenda/core` **não é buildado** — é consumido como fonte (`"build": "echo 'core is a source-only internal package'"`). Todo app Next que o usa declara `transpilePackages: ['@agenda/core']` no `next.config.ts`. Somente `apps/landing` **não** declara `optimizePackageImports` — porque não usa Phosphor.

### Onde roda teste

Só dois pacotes têm script `test`: `@agenda/core` (`jest --passWithNoTests`) e `@agenda/mobile` (`jest`). Os quatro apps Next **não têm suíte de testes** — a cobertura deles vem indiretamente dos testes do core. Consequência prática: lógica testável escrita num app Next é lógica sem teste; se ela merece teste, ela pertence ao core.

### Árvore de diretórios real

```txt
agenda-de-boteco/
├── apps/
│   ├── admin/                          # Painel administrativo (Next 15, :8089, basePath /admin)
│   │   ├── app/(admin)/                # avisos, estabelecimentos, eventos, layout, page
│   │   ├── app/login/  app/privacidade/  app/providers.tsx  app/layout.tsx  app/globals.css
│   │   ├── components/Sidebar.tsx
│   │   ├── components/ui/              # Button, DataTable, Field, ImageUpload, Modal,
│   │   │                               # PageHeader, PdfUpload, Select, TextArea, TextInput, styles.ts
│   │   ├── lib/                        # formErrors.ts, storage.ts, supabase.ts
│   │   └── next.config.ts  postcss.config.mjs  tsconfig.json
│   ├── landing/                        # Landing (Next 15, :8087)
│   │   ├── app/                        # page.tsx, suporte/page.tsx, layout.tsx, globals.css
│   │   ├── components/                 # AppPreview.tsx, DownloadButtons.tsx, icons.tsx
│   │   └── next.config.ts  vercel.json
│   ├── mobile/                         # App Expo 56 (:10002)
│   │   ├── app.config.ts               # importa a versão do package.json
│   │   ├── app/                        # Expo Router: (tabs)/{_layout,index,favorites,map,
│   │   │                               # notifications,profile}, city, establishment/[id],
│   │   │                               # event/[id], login, onboarding, privacidade,
│   │   │                               # excluir-conta, +native-intent, _layout
│   │   └── src/
│   │       ├── components/             # establishment/, event/, feed/, feedback/, filters/,
│   │       │                           # layout/, notification/, ui/, ErrorBoundary.tsx
│   │       ├── config/features.ts      # re-export de @agenda/core
│   │       ├── data/  hooks/  lib/  screens/map/  services/  store/  theme/  utils/
│   │       ├── tw/                     # index.tsx + image.tsx — fachada styled do react-native-css
│   │       └── global.css              # @theme do Tailwind v4 para NativeWind
│   ├── web/                            # Web pública (Next 15, :8088, basePath /app)
│   │   ├── app/(app)/                  # page (feed), avisos, cidade, favoritos, mapa, perfil,
│   │   │                               # establishment/[id], event/[id], layout
│   │   ├── app/login/ onboarding/ privacidade/ excluir-conta/ providers.tsx globals.css
│   │   ├── components/                 # auth/, establishment/, event/, feed/, feedback/,
│   │   │                               # filters/, map/, notification/, profile/, shell/, ui/
│   │   ├── hooks/                      # useAppSync.ts, useRequireAuth.ts, useUnreadCount.ts
│   │   └── lib/                        # cn.ts, storage.ts, supabase.ts
│   └── web-client/                     # Painel do dono (Next 15, :8090, basePath /client)
│       ├── app/(painel)/               # page (dashboard), eventos/, eventos/novo, eventos/[id],
│       │                               # avaliacoes, metricas, perfil, configuracoes, layout
│       ├── app/login/ onboarding/ nova-senha/ providers.tsx layout.tsx globals.css
│       ├── components/                 # EventForm.tsx, EventCard.tsx, EstablishmentFields.tsx,
│       │                               # Sidebar.tsx, Topbar.tsx, ComingSoon.tsx, GoogleIcon.tsx
│       ├── components/ui/              # AttributeAutocomplete, AttributeIcon, Button,
│       │                               # CityCombobox, EmptyState, Field, ImageDrop,
│       │                               # PageHeader, Select, SelectField, TextArea,
│       │                               # TextInput, styles.ts
│       ├── hooks/                      # use-owned-establishment.ts, use-owned-events.ts
│       └── lib/                        # formErrors.ts, storage.ts, supabase.ts
├── packages/
│   ├── core/
│   │   ├── jest.config.js  jest.setup.ts
│   │   └── src/                        # @agenda/core (source-only)
│   │       ├── config/                 # features.ts (FEATURES), stores.ts
│   │       ├── data/                   # establishment-attributes.ts, lookup.ts, mock.ts, index.ts
│   │       ├── fonts/next-fonts.ts     # Inter + Space Grotesk via next/font
│   │       ├── hooks/                  # queries.ts, useActiveCity, useConnectivity,
│   │       │                           # useGuardedPress, useNearbyEstablishments, useStatusLight
│   │       ├── lib/                    # queryClient.ts, queryPersister.ts
│   │       ├── platform/storage.ts     # configureAppStorage, appJsonStorage, registerRehydrator
│   │       ├── queries/catalog.ts      # camada crua de leitura
│   │       ├── schemas/catalog.ts      # schemas Zod + tipos inferidos
│   │       ├── services/               # auth, cachePolicy, catalog, connectivity,
│   │       │                           # establishment-owner, favorites, moderation,
│   │       │                           # owned-events, proximity, queryKeys, realtime, storage
│   │       ├── stores/                 # useAuthStore, useFavoritesStore, useFiltersStore,
│   │       │                           # useNotificationsStore, usePreferencesStore
│   │       ├── supabase/client.ts      # createSupabaseClient / configureSupabase
│   │       ├── theme/                  # colors, gradients, shadows, typography
│   │       ├── types/                  # database.types.ts (gerado), index.ts, platform.ts
│   │       └── utils/                  # auth, cn, dates, env, errors, events, filters, format,
│   │                                   # geo, images, links, masks, moderation, platform,
│   │                                   # pressGuard, responsiveType, slug, status-light
│   └── typescript-config/base.json     # tsconfig compartilhado (strict)
├── supabase/                           # config.toml, seed.sql, migrations/, functions/, emails/
├── scripts/                            # build-mobile.bash, cleanup.bash
├── eslint.config.mjs                   # ESLint 9 flat config (raiz, único)
├── prettier.config.mjs   turbo.json   pnpm-workspace.yaml
└── AGENTS.md                           # este arquivo (CLAUDE.md apenas o referencia)
```

### `apps/mobile/src/` é fachada, não duplicação

Vários arquivos sob `apps/mobile/src/{utils,services,hooks,config}` são **re-export puro** do core:

```typescript
// apps/mobile/src/services/catalog.ts — arquivo inteiro
export * from '@agenda/core';
```

O mesmo vale para `utils/cn.ts`, `utils/dates.ts`, `utils/errors.ts`, `utils/format.ts`, `utils/geo.ts`, `utils/links.ts`, `utils/events.ts`, `utils/filters.ts`, `utils/images.ts`, `utils/auth.ts`, `utils/pressGuard.ts`, `utils/responsiveType.ts` e `config/features.ts`.

Consequência para quem edita: **não altere lógica nesses arquivos** — ela não mora ali. Vá ao core. Os arquivos do mobile com implementação própria e legítima são os que dependem de API nativa: `hooks/useUserLocation.ts`, `hooks/useRealtimeSync.ts`, `hooks/useResponsive.ts`, `lib/bootstrap.ts`, `lib/supabase.ts`, `store/storage.ts`, `utils/deepLinks.ts`.

### Comandos do repositório

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Individuais: `pnpm dev:web`, `pnpm dev:admin`, `pnpm dev:landing`, `pnpm dev:mobile`, `pnpm --filter @agenda/web-client dev`.

---

## 3. Convenções de Estilo, Nomenclatura e Tipagem

### Arquivos

Este repo tem **duas convenções coexistindo por camada** — respeite a do diretório onde está escrevendo, não imponha uma sobre a outra:

| Onde | Convenção | Exemplos reais |
| --- | --- | --- |
| Componentes React (web e mobile) | `PascalCase.tsx` | `apps/web-client/components/EventForm.tsx`, `apps/mobile/src/components/ui/GuardedPressable.tsx` |
| Rotas Next.js App Router | `page.tsx` / `layout.tsx` em pasta kebab-case | `apps/web-client/app/(painel)/eventos/novo/page.tsx` |
| Rotas Expo Router | kebab-case ou `[param].tsx` | `apps/mobile/app/event/[id].tsx`, `apps/mobile/app/excluir-conta.tsx` |
| Services/utils/stores do core | `camelCase.ts` ou `kebab-case.ts` | `queryKeys.ts`, `cachePolicy.ts`, `useAuthStore.ts`, `owned-events.ts`, `status-light.ts` |
| Hooks locais dos apps web | `use-kebab-case.ts` | `apps/web-client/hooks/use-owned-events.ts` |
| Hooks do core e do mobile | `useCamelCase.ts` | `packages/core/src/hooks/useActiveCity.ts`, `apps/mobile/src/hooks/useUserLocation.ts` |
| Testes | `<arquivo>.test.ts(x)`, colocado ao lado do fonte | `packages/core/src/services/owned-events.test.ts` |
| Migrações SQL | `<timestamp>_snake_case.sql` | `supabase/migrations/20260813120000_event_status_and_recurrence.sql` |

### Símbolos

- **Tipos, interfaces, componentes:** `PascalCase` (`OwnedEventInput`, `SupabaseStorageAdapter`, `CreateOwnedEstablishmentInput`, `EventForm`).
- **Funções e métodos:** `camelCase` (`getFriendlyErrorMessage`, `coarseLatLng`, `claimEstablishmentOwner`, `saveRecurringOwnedEvents`).
- **Constantes:** `UPPER_SNAKE_CASE` (`CACHE_BUSTER`, `MAX_RECURRENCE_COUNT`, `DEFAULT_EVENT_FILTERS`, `FEATURES`, `NOTIFICATION_TYPE_LABELS`) ou objeto com `as const`.
- **Exportações nomeadas sempre.** `export default` só onde o framework exige (`page.tsx`, `layout.tsx`, rotas do Expo Router, `next.config.ts`, `prettier.config.mjs`).

### Tipagem

- `import type` obrigatório para tipos — o ESLint aplica `@typescript-eslint/consistent-type-imports` com `fixStyle: 'inline-type-imports'`:

  ```typescript
  import { AuthError, type PostgrestError } from '@supabase/supabase-js';
  import type { EstablishmentAttribute, PriceRange } from '../schemas/catalog';
  ```

- **Null safety:** trate `null`/`undefined` com `?.`, `??` ou type guard. `!` só com justificativa inquestionável. Padrão do repo é retorno-cedo:

  ```typescript
  const client = getConfiguredSupabase();
  if (!client) {
    return false;
  }
  ```

- **Imutabilidade:** `as const` em constantes de config, `readonly` em arrays de allowlist (`const PERSIST_ALLOWLIST: readonly string[]`), stores atualizam por spread (`{ ...state.filters, ...partial }`), nunca mutação.
- **Tipos derivados de Zod:** `z.infer` em vez de interface duplicada — `packages/core/src/schemas/catalog.ts` deriva os 14 tipos do catálogo assim.
- **Ordenação de imports:** automática via `simple-import-sort` (`error`). Não reordene à mão contra o linter.
- **Variável intencionalmente não usada:** prefixo `_` (o ESLint tem `argsIgnorePattern: '^_'` e `varsIgnorePattern: '^_'`). Padrão real: `const { recurrence_group_id: _ignored, ...updatable } = row;`.

### Strings de interface (não há i18n neste repositório)

**Não existe biblioteca ou dicionário de i18n neste monorepo.** Nenhum `t()`, nenhum `locales/`, nenhum provider de tradução. O produto é pt-BR único, e as strings visíveis são **literais em português no JSX**, do jeito que todo o codebase já faz.

- **NÃO** introduza `t()`, `next-intl`, `i18next` ou dicionário próprio — seria dependência nova (Regra 8) e padrão inconsistente com 100% do repo.
- Escreva a string em pt-BR correto e acentuado, direto no componente.
- Formatação sensível a locale usa o utilitário do core, não string manual: `packages/core/src/utils/dates.ts` e `format.ts`; comparação de nomes usa `localeCompare(b.name, 'pt-BR')` (ver `utils/filters.ts`).

---

## 4. Fluxo de Dados e Responsabilidade por Camada

$$\text{UI (page/screen/component)} \longrightarrow \text{Custom Hook (TanStack Query v5)} \longrightarrow \text{Service (@agenda/core/services)} \longrightarrow \text{SupabaseClient (@agenda/core/supabase)} \longrightarrow \text{Postgres / RPC / Storage}$$

Estado de UI e sessão do cliente correm por fora, em Zustand.

### O que cada camada PODE e NÃO PODE

**1. UI — `app/**/page.tsx`, `apps/mobile/app/**`, `components/**`**

- PODE: renderizar, tratar evento de interação, consumir hooks, consumir stores com seletor atômico.
- NÃO PODE: chamar `fetch`/`axios`, tocar `getSupabase()`/`getConfiguredSupabase()`, montar query key literal, formatar data à mão, aplicar máscara à mão.

**2. Hooks (TanStack Query v5) — `packages/core/src/hooks/`, `apps/*/hooks/`**

- PODE: `useQuery`/`useMutation`/`useQueryClient`, `enabled` para query dependente de id, invalidação por prefixo.
- NÃO PODE: regra de negócio, transformação pesada, acesso direto ao client Supabase.
- Padrão do repo (`apps/web-client/hooks/use-owned-events.ts`): key da factory + `queryFn` chamando o service + `enabled: Boolean(id)`; mutação invalida a **raiz** (`catalogKeys.events.root`) para alcançar detalhe, agenda do painel e lista pública de uma vez.
- **Query key local é permitida** quando só um app consome — Regra dos 3. Exemplo real em `use-owned-establishment.ts`:

  ```typescript
  export const panelKeys = {
    ownedEstablishmentId: ['panel', 'owned-establishment-id'] as const,
  } as const;
  ```

  Ela fica fora de `catalogKeys` de propósito, e o docblock registra quando promover.

**3. Service / Repository — `packages/core/src/services/`**

- PODE: obter o client via `getConfiguredSupabase()`, montar a query Supabase, chamar RPC, validar com Zod, transformar DTO, tratar erro via `handleServiceError`.
- NÃO PODE: importar React, hooks, componentes, ou depender de `process.env` direto (use `utils/env`).
- Padrão obrigatório de todo service deste repo (`services/establishment-owner.ts`):

  ```typescript
  export async function isCurrentUserEstablishmentOwner(): Promise<boolean> {
    const client = getConfiguredSupabase();
    if (!client) {
      return false;
    }
    try {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        return false;
      }
      const { data, error } = await client
        .from('profiles')
        .select('is_establishment_owner')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data?.is_establishment_owner === true;
    } catch (error) {
      return handleServiceError(error, {
        method: 'establishmentOwner.isCurrentUserEstablishmentOwner',
      });
    }
  }
  ```

  Client ausente **não lança** em leitura (o app segue funcional sem login); em escrita, lança `new Error('Supabase não configurado')`. O `method` do contexto de erro usa `namespace.função`.

**4. Client Supabase — `packages/core/src/supabase/client.ts`**

- Única fonte de client. Cada app registra o seu no bootstrap via `configureSupabase(fn)`; consumidores leem por `getConfiguredSupabase()` / `isSupabaseConfigured()`.
- Cada app tem seu `lib/supabase.ts` que lê env própria (`NEXT_PUBLIC_*` no Next, `EXPO_PUBLIC_*` no Expo) e chama `createSupabaseClient`, memoizando o resultado. Web usa `detectSessionInUrl: true` + localStorage (`storage: undefined`); mobile usa `expo-secure-store` como adapter.
- NÃO PODE: `createClient` do `@supabase/supabase-js` chamado fora deste arquivo.

**5. Zustand — `packages/core/src/stores/`**

- Só estado de UI/sessão do cliente: `useAuthStore`, `useFiltersStore`, `useFavoritesStore`, `useNotificationsStore`, `usePreferencesStore`.
- Dado de servidor pertence ao TanStack Query. Nunca espelhe resposta de API numa store.
- Persistência usa `appJsonStorage` de `platform/storage.ts` — tolerante a storage ainda não configurado, com re-hidratação via `registerRehydrator` quando o bootstrap roda.
- Consumo **com seletor atômico** obrigatório:

  ```typescript
  const user = useAuthStore((state) => state.user);
  ```

**6. Escrita no banco**

- Painel do dono e admin escrevem sob **RLS**. Autorização é `profiles.is_establishment_owner` (painel, ver `services/establishment-owner.ts`) e `profiles.is_admin` (admin).
- **Nem toda escrita é RPC.** A regra real do repo: RPC quando a operação é privilegiada ou transacional (`claim_establishment_owner`, `create_owned_establishment`, `create_city_from_panel`); UPDATE/INSERT direto quando uma policy já restringe a linha ao dono. `saveOwnedEvent` e `updateOwnedEstablishment` escrevem direto e documentam qual policy os cobre (`owner_insert_events`, `owner_update_establishments`, migração `20260812120000`).
- Migração nova vai em `supabase/migrations/` com timestamp; nunca edite migração já aplicada.

---

## 5. Tratamento de Erros, Logging e Reuso de Módulos

### Erros

Três funções em `packages/core/src/utils/errors.ts`, cada uma com seu lugar:

| Função | Onde usar |
| --- | --- |
| `handleServiceError(error, { method, args? })` | `catch` de **todo** service — loga e re-lança (`never`) |
| `getFriendlyErrorMessage(error)` | UI, para converter erro em texto pt-BR exibível |
| `logErrorToTerminal(error, { method })` | log direto quando não há re-lance |

`logErrorToTerminal` é **no-op em produção** (`isProduction()`) e classifica `ZodError`, `PostgrestError`, `AuthError` e erro de rede (`TypeError` com `'Network request failed'`). Nunca exponha `PostgrestError.message` cru na UI — passe por `getFriendlyErrorMessage`.

### Logging

`console.log` / `console.warn` / `console.error` são **proibidos** no código de aplicação e do core. O único `console.error` legítimo do repo é o interno de `logErrorToTerminal` — não replique.

**Testar log:** espionar `logErrorToTerminal` não funciona quando a chamada é interna ao módulo. Espione `handleServiceError` (ver testes do core).

### Catálogo de utilitários existentes — reutilize, não recrie

**Utils (`packages/core/src/utils/`)**

1. `cn.ts` — `cn(...inputs)`, merge de classes via clsx + tailwind-merge
2. `dates.ts` — formatação/comparação/manipulação de datas; `shiftDate` (usado pela recorrência)
3. `env.ts` — `isProduction()`, agnóstico de runtime (não use `process.env` no core)
4. `errors.ts` — `handleServiceError`, `getFriendlyErrorMessage`, `logErrorToTerminal`, `ErrorContext`
5. `events.ts` — status de evento e atração
6. `filters.ts` — `EventFilters`, `DEFAULT_EVENT_FILTERS`, `DateBucket`, `SortBy`, ordenação do catálogo
7. `format.ts` — moeda, telefone, documentos
8. `geo.ts` — distância, raio, `coarseLatLng` (arredonda coordenada para estabilizar query key)
9. `images.ts` — URL de imagem e fallback
10. `links.ts` — deep links e URLs amigáveis
11. `masks.ts` — máscaras de input (telefone, CPF/CNPJ, moeda)
12. `moderation.ts` — triagem de termos impróprios
13. `platform.ts` — `isWeb`, `isNative`
14. `pressGuard.ts` — proteção contra duplo toque
15. `responsiveType.ts` — tipografia responsiva
16. `slug.ts` — `slugify`, slug para SEO/URL e para id de evento
17. `status-light.ts` — semáforo de status
18. `auth.ts` — helpers de autenticação

**Serviços e infra (`packages/core/src/`)**

 1. `services/queryKeys.ts` — `catalogKeys`, factory hierárquica (única fonte de query key do catálogo)
 2. `services/cachePolicy.ts` — `CACHE_BUSTER` (hoje `'v2'`), `shouldDehydrateQuery`, `PERSIST_ALLOWLIST`
 3. `services/owned-events.ts` — `OwnedEventInput`, `MAX_RECURRENCE_COUNT` (52), save/delete/recorrência
 4. `services/establishment-owner.ts` — vínculo dono↔bar, RPCs de claim e criação
 5. `services/moderation.ts` — triagem de conteúdo (atrás da flag `contentModeration`)
 6. `supabase/client.ts` — `createSupabaseClient`, `configureSupabase`, `getConfiguredSupabase`, `isSupabaseConfigured`
 7. `platform/storage.ts` — `configureAppStorage`, `appJsonStorage`, `registerRehydrator`, `getAppStorage`
 8. `lib/queryClient.ts` / `lib/queryPersister.ts` — QueryClient e persistência
 9. `config/features.ts` — `FEATURES`, `FeatureFlag`
10. `theme/` — `colors`, `gradients`, `shadows`, `typography` (espelho TS dos tokens CSS)
11. `hooks/` — `useActiveCity`, `useConnectivity`, `useGuardedPress`, `useNearbyEstablishments`, `useStatusLight`, `hooks/queries.ts`
12. `data/establishment-attributes.ts` — `ESTABLISHMENT_ATTRIBUTES` (rótulos e ordem dos atributos)

**UI mobile (`apps/mobile/src/components/ui/`)**

 1. `Button`, `Chip`, `CircleIconButton`, `ConfirmDialog`, `EmptyState`, `GradientBadge`, `GuardedPressable`, `Icon`/`iconMap`, `InfoCard`, `OfflineBanner`, `RatingStars`, `SectionLabel`, `SegmentedTabs`, `StatusLightBadge`, `AttributeChips`
 2. `apps/mobile/src/tw/` — fachada styled (`View`, `Text`, `Image`, `Pressable`, `ScrollView`, `TextInput`) sobre `react-native-css`. **Importe daqui, não de `react-native`, em componente com `className`.**

**UI web-client (`apps/web-client/components/ui/`)**

 1. `Button`, `TextInput`, `TextArea`, `Select`, `SelectField`, `Field`, `PageHeader`, `EmptyState`, `ImageDrop`, `CityCombobox`, `AttributeAutocomplete`, `AttributeIcon`, `styles.ts` (constantes `BTN_PRIMARY`/`BTN_GHOST`/`BTN_DANGER`)

**UI admin (`apps/admin/components/ui/`)**

 1. `Button`, `DataTable`, `Field`, `Modal`, `PageHeader`, `Select`, `TextInput`, `TextArea`, `ImageUpload`, `PdfUpload`, `styles.ts`

**UI web (`apps/web/components/`)**

 1. `ui/GradientBadge`, `ui/SectionLabel`, `ui/SegmentedTabs`, `ui/StatusLightBadge`, `ui/AttributeChips`, `feedback/EmptyState`, `feedback/UnderConstruction`, `shell/AppShell`, `shell/Sidebar`, `shell/BottomNav`, `shell/NavBadge`, `shell/navItems.ts`

**Ícones:** fachada única por app (`iconMap.ts` no mobile, `icons.tsx` no web/landing). Trocar ícone toca só a fachada — não importe de `@phosphor-icons/react` espalhado. Todo app Next que usa Phosphor **precisa** de `experimental.optimizePackageImports: ['@phosphor-icons/react']` (sem isso o dev server transpila 9k+ módulos por build).

---

## 6. Performance, Segurança e Testes

### Performance

- **`setState` em `useEffect` vai dentro de `queueMicrotask`** — padrão consolidado do repo (`apps/web/components/shell/useNavPathname.ts`, `apps/web/app/(app)/page.tsx`, `apps/mobile/app/(tabs)/index.tsx`):

  ```typescript
  useEffect(() => {
    queueMicrotask(() => {
      setFilteredList(filterItems(items, query));
    });
  }, [items, query]);
  ```

- **Listas longas no mobile:** `FlashList` (`@shopify/flash-list`), nunca `FlatList`.
- **Seletores atômicos** em Zustand — nunca desestruture a store inteira.
- **Cancelamento:** onde o fetcher aceitar, repasse o `signal` (`queryFn: ({ signal }) => fetcher(signal)`). Quando o service não expõe `AbortSignal`, **documente o motivo** em vez de silenciar (ver docblock de `use-owned-events.ts`).
- **Query keys estáveis:** coordenadas entram na key já arredondadas por `coarseLatLng`.
- **React 19:** o React Compiler **não** está habilitado neste repo. `useMemo`/`useCallback` continuam sendo ferramenta legítima quando há custo real medido — mas não os adicione por reflexo.
- **Escrita em lote:** operação que gera N linhas usa um único `insert` com array, não N chamadas (ver `saveRecurringOwnedEvents` — meia série gravada é pior que nenhuma).

### Segurança e ambiente

- Env por app: `NEXT_PUBLIC_*` (Next), `EXPO_PUBLIC_*` (Expo). No core, **nunca** `process.env`/`__DEV__` direto — use `isProduction()` de `utils/env` (o acesso direto quebra o typecheck dos apps sem `@types/node`).
- `.env` / `.env.local` reais: leitura e escrita proibidas. `.env.example` acompanha o código que introduz a variável.
- Segurança real é **RLS no Postgres** (`auth.uid()`), não checagem no cliente. Toda query respeita o papel do usuário.
- `supabase start` só sob pedido explícito. Nunca teste credencial real contra endpoint remoto.
- Chave/segredo nunca vai para o git — segredos de build vivem no EAS.

### Testes

- **Core:** `packages/core/jest.config.js` — preset `ts-jest`, `testEnvironment: 'node'`, `testMatch: ['**/*.test.ts']`, `moduleNameMapper` de `@agenda/core` → `src/index.ts`, e `jest.setup.ts` injetando storage em memória via `configureAppStorage`.
- **Mobile:** `apps/mobile/jest.config.js` — preset `jest-expo`, `testMatch: ['<rootDir>/src/**/*.test.ts']` (só `src/`, não `app/`), com `transformIgnorePatterns` liberando `@agenda/*`, `@supabase/*`, `@tanstack/*`, `zustand`, `nativewind` e `react-native-css`.
- **Apps Next não têm suíte.** Lógica que merece teste pertence ao core.
- Teste fica **ao lado do fonte** (`services/owned-events.ts` → `services/owned-events.test.ts`).
- Mock de Supabase é feito no módulo do client, com builder encadeável:

  ```typescript
  const mockGetSupabase = jest.fn();
  jest.mock('../supabase/client', () => ({
    getConfiguredSupabase: () => mockGetSupabase(),
    isSupabaseConfigured: () => mockGetSupabase() !== null,
  }));
  ```

- Mudança em `services/` ou `utils/` do core **exige** teste novo ou atualizado.
- Refatoração mantém 100% de regressão comportamental: mesma entrada, mesmo tipo, mesmo valor de saída.
- Antes de declarar tarefa concluída: rode `pnpm typecheck && pnpm lint && pnpm test` e **relate o resultado real**. Nunca afirme "passou" sem ter rodado.

---

## 7. 🧠 Protocolo Cognitivo ANTES de Codificar e Revisar

1. **Planejar e validar escopo.** O que foi pedido? Exige tocar arquivo não solicitado? Se sim, peça autorização no chat antes.
2. **Consultar a doc oficial da lib envolvida.** Qual biblioteca a alteração toca? Abra a doc da **versão da tabela da Seção 2** e extraia o idioma atual dela — não o que você lembra, não o que o código antigo do repo faz.
3. **Cruzar doc com o contexto do repo.** O padrão moderno da doc cabe na arquitetura daqui (camadas da Seção 4, catálogo da Seção 5)? Onde divergir, este arquivo vence.
4. **Mapear impacto.** Quem depende da função/tipo alterado? Grep os callers **antes** de editar — bug se corrige na causa raiz, uma vez, onde todos passam. Atenção às fachadas de `apps/mobile/src/` (re-export do core).
5. **Analisar diff.** Em review: a alteração criou warning, variável órfã, contrato quebrado, key literal, `CACHE_BUSTER` desatualizado? Reporte. Débito antigo não tocado? Ignore.
6. **Verificar permissões.** A tarefa exige recurso fora do escopo? Recuse e limite-se ao necessário.
7. **Checar reuso.** Existe helper na Seção 5 que resolve? (`cn`, `dates`, `masks`, `format`, `geo`, `slug`, `Button`, `EmptyState`, `GuardedPressable`…)
8. **Checar dependências.** Precisa de lib nova? Pare, peça confirmação, leia a doc.
9. **Regra dos 3.** Usado em 1 lugar → co-localizado (ver `panelKeys`). Em 2 → pasta do módulo. Em 3+ → só então `@agenda/core`.
10. **Self-audit.** Passe pelo checklist da Seção 10 antes de responder.

---

## 8. 📝 CHANGELOG Obrigatório em Cada Commit

**Todo commit** que altere código de um app/pacote **deve** incluir, nele mesmo, uma breve descrição da mudança no CHANGELOG da versão seguinte daquele projeto. Não é ao fim da tarefa: é a cada commit. Uma tarefa quebrada em cinco commits acrescenta bullets cinco vezes, no mesmo arquivo.

Esta é a única exceção à proibição de editar `.md` (Seção 0, Regra 7) — não é necessário pedir autorização.

**A IA é a única fonte deste arquivo.** Não existe geração automática: `scripts/build-mobile.bash` apenas compila e não escreve CHANGELOG. Se a IA não escrever, o arquivo não existe e o release sai sem notas.

### Qual arquivo editar

O CHANGELOG é **por app/pacote**, escolhido pelos diretórios que o commit toca:

| Mudança em | CHANGELOG a atualizar |
| --- | --- |
| `apps/mobile/` | `apps/mobile/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/web/` | `apps/web/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/web-client/` | `apps/web-client/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/admin/` | `apps/admin/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/landing/` | `apps/landing/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `packages/core/` | `packages/core/CHANGELOG-<branch>-v<próxima-versão>.md` |

Se o commit toca **mais de um** app/pacote (ex.: correção em `packages/core` consumida por `apps/mobile`), atualize o CHANGELOG de **cada** afetado, descrevendo o impacto na perspectiva daquele projeto.

### Qual versão usar

O arquivo é sempre da **versão imediatamente posterior** à do `package.json` do projeto — nunca da versão atual, que já foi publicada. Incremente o patch, salvo instrução explícita para minor/major.

```txt
apps/web-client/package.json → "version": "0.0.1"
                            ↓
arquivo: apps/web-client/CHANGELOG-alfa-v0.0.2.md
heading: # Changelog 0.0.2 (alfa)
```

**Durante os commits, não bumpe o `package.json`.** O CHANGELOG antecipa a versão; o bump acontece uma única vez, ao abrir o PR para `alfa` (Seção 8.1). No mobile a versão tem fonte única no `package.json` (o `app.config.ts` importa de lá).

### Formato

- Arquivo: `CHANGELOG-<branch>-v<version>.md` — `branch` é `alfa`, `beta` ou `release` (a branch de canal, não a de trabalho)
- Heading: `# Changelog <version> (<branch>)`
- Corpo: bullets curtos em pt-BR, na perspectiva do usuário final — o conteúdo do mobile vai para a loja de apps

**Acrescente, nunca sobrescreva.** Se o arquivo da próxima versão já existir, adicione ao fim da lista, preservando os bullets de commits anteriores ainda não publicados. Apagar bullet alheio é infração.

```markdown
# Changelog 0.0.2 (alfa)

- Painel do dono passa a listar eventos em rascunho junto dos publicados
- Busca de cidades no filtro volta a funcionar no Android e no iOS
```

Descreva o **efeito percebido**, não a implementação.

Commits que **não** exigem CHANGELOG: mudanças restritas a `.md`, ao próprio CHANGELOG, ou a `scripts/` e configuração de CI.

---

## 8.1 🔖 Bump de Versão ao Abrir PR para `alfa`

**Sempre que o usuário pedir para abrir um PR para `alfa`**, o patch da versão de **cada app/pacote alterado na branch** sobe 1 no `package.json`, em um commit próprio, **antes** de abrir o PR. Ex.: `0.0.3` → `0.0.4`.

O pedido de abrir o PR já é a autorização. A branch base padrão deste repo é **`alfa`**, não `main`.

### Procedimento

1. `git diff --name-only alfa...HEAD` → mapeie os caminhos para `apps/*` e `packages/*`.
2. Para cada projeto afetado, incremente o patch no `package.json` dele. Nada mais: nenhum outro arquivo de versão, nenhum lockfile.
3. A versão resultante **deve coincidir** com a do `CHANGELOG-<branch>-v<version>.md` que os commits vinham alimentando. Se divergir, o CHANGELOG é a fonte de verdade.
4. Commit isolado: `Bump <projeto> to <versão>` (ou `Bump versions for alfa release` quando forem vários).
5. Só então abra o PR.

### Regras de borda

- **Só patch.** Minor/major exigem instrução explícita.
- **Só projetos tocados.** App que a branch não alterou não sobe de versão.
- **Só para `alfa`.** PR para outra base não dispara bump.
- **Não bumpe duas vezes.** Se o `package.json` já está na versão do CHANGELOG pendente, o bump já foi feito.
- Mudanças que não exigem CHANGELOG também não exigem bump.
- `git push` nunca sem pedido explícito.

---

## 9. 🎨 Padrões Idiomáticos das Versões Instaladas

### React 19.2.3 — <https://react.dev>

- Function components + hooks. Zero class components.
- `react/react-in-jsx-scope` está `off` — não importe `React` só por JSX.
- React Compiler **não** habilitado: `useMemo`/`useCallback` seguem válidos com custo justificado, mas não por reflexo.
- Os apps Next são majoritariamente Client Components (`'use client'`) porque consomem TanStack Query e Zustand. Só marque `'use client'` quando o componente realmente usa hook/estado/evento — o resto pode ficar Server Component.
- `useActionState`/`useOptimistic`/`use` **não são usados neste repo**: os formulários do painel e do admin submetem via `useMutation` do TanStack Query, não via Server Actions. Não introduza o padrão de Actions num formulário existente sem pedir autorização — é troca de arquitetura, não modernização local.

### Next.js 15 App Router — <https://nextjs.org/docs>

- Rotas em `app/`, com route groups: `(app)` no web, `(painel)` no web-client, `(admin)` no admin.
- `page.tsx`/`layout.tsx` usam `export default` — é a exceção legítima à regra de export nomeado.
- Fontes via `next/font`, centralizadas em `packages/core/src/fonts/next-fonts.ts` (Inter + Space Grotesk), expostas como CSS var (`--font-inter`, `--font-space-grotesk`).
- `next.config.ts` tipado com `NextConfig`; `transpilePackages: ['@agenda/core']` obrigatório. `basePath`: `/app` (web), `/client` (web-client), `/admin` (admin); landing não tem.
- Nunca `pages/`, nunca `getServerSideProps`.
- `revalidatePath`/`revalidateTag` não se aplicam aqui: os dados vêm de TanStack Query client-side sobre Supabase, e a invalidação é `queryClient.invalidateQueries`.

### Tailwind CSS v4 — <https://tailwindcss.com/docs>

- **Não existe `tailwind.config.js` neste repo e não deve passar a existir.** O tema é declarado em `@theme` dentro do `globals.css` de cada app:

  ```css
  @import 'tailwindcss';

  @theme {
    --color-primary: #1dd75e;
    --color-muted-foreground: #a6a6a6;
    --font-heading: var(--font-space-grotesk), system-ui, sans-serif;
    --shadow-neon: 0 10px 40px -10px hsl(141 76% 48% / .45);
  }
  ```

- PostCSS: só `@tailwindcss/postcss` (`postcss.config.mjs`).
- **Use o token semântico, nunca literal entre colchetes:** `bg-primary`, `font-heading`, `shadow-neon`, `text-muted-foreground` — não `bg-[#1dd75e]` nem `shadow-[0_10px...]`.
- Variantes derivadas dos tokens usam `@theme inline` (os quatro gradientes do web-client: `--gradient-primary`, `--gradient-night`, `--gradient-card`, `--gradient-promo`).
- Mobile importa por camada (`tailwindcss/theme.css`, `preflight.css`, `utilities.css`) e usa variantes `@media android` / `@media ios` — específico do `react-native-css`. Cores em **hex**, não `hsl()` moderno: o runtime não parseia.

### NativeWind 5 preview / react-native-css

- Componentes com `className` vêm de `apps/mobile/src/tw/` (`View`, `Text`, `Image`, `Pressable`, `ScrollView`, `TextInput`), não de `react-native`.
- Props que não aceitam `className` (cor de ícone, `tintColor`) leem o espelho TS em `apps/mobile/src/theme/colors.ts`.
- `react-native-css` está em nightly **com patch** (`patches/react-native-css@0.0.0-nightly.5ce6396.patch`). Não atualize a versão sem autorização — o patch quebra.

### TanStack Query v5 — <https://tanstack.com/query/latest>

- `isPending` para estado inicial (`isLoading` v4 não existe mais); `gcTime`, não `cacheTime`.
- `onSuccess`/`onError` **só em `useMutation`**. Em `useQuery` são removidos na v5 — trate erro na UI com `error` + `getFriendlyErrorMessage`.
- `useSuspenseQuery` **não é usado neste repo** — não introduza sem autorização: exigiria boundary de Suspense em telas que hoje tratam `isPending` inline.
- Query key **sempre** da factory:

  ```typescript
  useQuery({
    queryKey: catalogKeys.events.owned(establishmentId ?? ''),
    queryFn: () => listOwnedEvents(establishmentId ?? ''),
    enabled: Boolean(establishmentId),
  });
  ```

- Invalidação por prefixo hierárquico: `queryClient.invalidateQueries({ queryKey: catalogKeys.events.root })` alcança `detail`, `byEstablishment`, `owned` e `attractions`.
- Persistência via `PersistQueryClientProvider` + `shouldDehydrateQuery`. **Mudou o shape de dado persistido? Incremente `CACHE_BUSTER` em `services/cachePolicy.ts`** (hoje `'v2'`) — a rehidratação não passa pelo Zod, então `.default([])` não preenche campo ausente e o cache velho chega incompleto à UI.
- Key nova precisa entrar no `PERSIST_ALLOWLIST` (primeiro segmento) para ser persistida. Hoje: `events`, `establishments`, `music-styles`, `cities`, `notifications`.

### Zustand 5 — <https://zustand.docs.pmnd.rs>

- `create<State>()((set) => ...)`. Atualização por spread; helper interno de patch quando há muitos setters (`useFiltersStore`).
- Persistência com `appJsonStorage` de `platform/storage.ts` + `registerRehydrator` — nunca `createJSONStorage(() => localStorage)` direto, que quebraria no mobile.
- Consumo com seletor atômico, sempre.

### Zod 3.23.8 — <https://zod.dev>

- API v3: `z.string().email()`, `z.string().uuid()`, `.datetime()`, `z.enum([...])`. **Não** escreva API de Zod 4 (`z.email()` top-level).
- Tipo derivado do schema, nunca interface duplicada — padrão real de `schemas/catalog.ts`:

  ```typescript
  export const eventStatusSchema = z.enum(['draft', 'published']);
  export type EventStatus = z.infer<typeof eventStatusSchema>;
  ```

- Reuso por composição: `establishmentWriteSchema` deriva de `establishmentSchema`, e `eventWriteSchema` é `eventSchema.partial({ id: true })`. Prefira `.extend()`/`.pick()`/`.omit()`/`.partial()` a redeclarar campos.
- `safeParse` quando a falha é esperada e tratável na UI; `parse` dentro de service, onde o `catch` já roteia para `handleServiceError`.

### Supabase JS 2.106 — <https://supabase.com/docs/reference/javascript>

- Tipos gerados são a fonte de verdade: `packages/core/src/types/database.types.ts` (via `pnpm --filter @agenda/core gen:types`). Client é sempre `SupabaseClient<Database>`.
- `createClient` só em `supabase/client.ts`. Apps registram via `configureSupabase`.
- Erro do Postgrest: cheque `error` no destructuring e `throw` — o `catch` chama `handleServiceError`.
- `.maybeSingle()` quando a ausência de linha é caso normal; `.single()` só quando ausência é erro.
- `@supabase/ssr` **não é usado** — a autenticação é client-side em todos os apps (localStorage no web, `expo-secure-store` no mobile). Não introduza SSR de sessão sem autorização.
- **Escape hatch documentado:** quando `database.types.ts` está atrás do banco (coluna recém-migrada), o repo usa um cast localizado e comentado, não `any` espalhado:

  ```typescript
  function eventsTable() {
    const client = getConfiguredSupabase();
    if (!client) {
      throw new Error('Supabase não configurado');
    }
    return (client as SupabaseClient).from('events');
  }
  ```

  Regenerar os tipos é a correção definitiva; o cast é ponte, e cada uso traz o docblock dizendo por quê.

### TypeScript 6 — <https://www.typescriptlang.org/docs>

- `satisfies` para validar objeto contra tipo sem perder inferência literal.
- `as const` em constante de config; `import type` inline (`fixStyle: 'inline-type-imports'`).
- `strict`, `isolatedModules`, `moduleResolution: 'Bundler'`, `target: 'ES2022'` — herde de `@agenda/typescript-config/base.json`, não redefina.

### Expo 56 / React Native 0.85 / Expo Router — <https://docs.expo.dev>

- Roteamento por sistema de arquivos em `apps/mobile/app/`; grupo `(tabs)`; `[id].tsx` para param.
- Deep link tratado em `app/+native-intent.tsx` + `src/utils/deepLinks.ts`.
- Reanimated 4 + `react-native-worklets`.
- Versão do app tem **fonte única no `package.json`** — `app.config.ts` importa de lá. Bumpar = editar só o `package.json`.

### Padrões transversais

**Discriminated union + type guard:**

```typescript
type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**Pattern matching por dicionário** em vez de cadeia de `if`:

```typescript
const VARIANTS: Record<Variant, string> = {
  primary: BTN_PRIMARY,
  ghost: BTN_GHOST,
  danger: BTN_DANGER,
};
```

**Feature flags de entrega gradual** (`packages/core/src/config/features.ts`): tela bloqueada renderiza "Em construção"; liberar = trocar a flag para `true`, sem outra mudança de código. Estado atual: `establishmentDetail`, `notifications` e `map` em `true`; `contentModeration` em `false` (implementado e testado, desligado por orçamento de fase).

---

## 10. 🛑 Checklist Único de Desenvolvimento e Review (Zero Refactor)

Cada item abaixo é **bloqueante**. A IA roda este checklist internamente antes de entregar.

---

### 1. ❌ Sintaxe/API obsoleta de biblioteca já atualizada no projeto

- **Regra:** use a API da versão instalada, validada contra a doc oficial (Seção 9). `isLoading` inicial, `cacheTime`, `onSuccess` em `useQuery`, `tailwind.config.js`, `FlatList`, API de Zod 4 → todos proibidos.
- **Correção:** "Substitua a API legada pela equivalente da versão instalada conforme a doc oficial."

```diff
- const { data, isLoading } = useQuery({
-   queryKey: ['events', id],
-   queryFn: () => getEvent(id),
-   onSuccess: (d) => setLocal(d),
- });
+ const { data, isPending } = useQuery({
+   queryKey: catalogKeys.events.detail(id),
+   queryFn: () => getEvent(id),
+   enabled: Boolean(id),
+ });
```

---

### 2. ❌ Validação de dados sem Zod ou violando suas boas práticas

- **Regra:** shape de dado externo (resposta de API, payload de formulário, valor persistido) se valida com schema Zod de `packages/core/src/schemas/catalog.ts`, tipo derivado por `z.infer`, e reuso por `.extend()`/`.pick()`/`.omit()`/`.partial()`. Interface duplicada à mão é infração.
- **Correção:** "Derive o tipo do schema com `z.infer` e componha a partir do schema existente em vez de redeclarar campos."

```diff
- interface EventWriteInput {
-   id?: string;
-   name: string;
-   startsAt: string;
- }
+ export const eventWriteSchema = eventSchema.partial({ id: true });
+ export type EventWriteInput = z.infer<typeof eventWriteSchema>;
```

---

### 3. ❌ Reportar débito antigo não relacionado ao diff (ou omitir regressão causada por ele)

- **Regra:** só o diff e seu impacto direto. Mas **toda** quebra, warning ou padrão defasado introduzido no trecho alterado DEVE ser reportado.
- **Correção:** "Remova o apontamento sobre código pré-existente não tocado; reporte a regressão introduzida no trecho alterado."

```diff
  // Review em apps/web-client/components/EventForm.tsx
- ❌ "O arquivo apps/admin/components/ui/DataTable.tsx tem props sem memo."   (fora do diff)
+ ✅ "A remoção de `capacity` deixou `MAX_CAPACITY` órfão neste arquivo (linha 12)."
```

---

### 4. ❌ Alterar arquivo/componente não solicitado sem pedir permissão

- **Regra:** mudança em arquivo fora do pedido exige autorização prévia no chat, com o quê e o porquê.
- **Correção:** "Reverta a alteração colateral e peça autorização listando arquivo e motivo."

```diff
  // Pedido: ajustar o formulário de evento
  apps/web-client/components/EventForm.tsx        ✅ no escopo
- apps/web-client/components/ui/Button.tsx        ❌ não pedido — pedir antes
- apps/web/components/event/EventCard.tsx         ❌ não pedido — pedir antes
```

---

### 5. ❌ Solicitar acesso fora do escopo da tarefa

- **Regra:** nenhum acesso a diretório pessoal do SO, pasta parente não relacionada, `.env`/`.env.local` reais ou segredo.
- **Correção:** "Limite a leitura aos arquivos do escopo; para variável de ambiente, use o utilitário de env."

```diff
- Ler apps/web-client/.env.local para descobrir a URL do Supabase
+ import { isProduction } from '@agenda/core';
+ // env do app é lida em apps/web-client/lib/supabase.ts via NEXT_PUBLIC_*
```

---

### 6. ❌ Ausência de plano de ação no chat antes de codar

- **Regra:** plano curto antes de gerar/alterar código: o que muda, em quais arquivos, o que precisa de permissão.
- **Correção:** "Apresente o plano de ação e aguarde antes de editar."

```diff
- [IA edita 6 arquivos direto]
+ Plano: 1) `owned-events.ts` — adicionar `status` ao input; 2) teste do service;
+ 3) `EventForm.tsx` — campo novo. Precisa tocar `schemas/catalog.ts` (fora do
+ pedido) para o enum — autoriza?
```

---

### 7. ❌ Comentário explicativo poluente no código

- **Regra:** permitidos `TODO:`, `FIXME:`, `ponytail:` e docblock curto de **decisão/porquê**. Proibido narrar mecânica óbvia.
- **Correção:** "Remova o comentário redundante; mova a explicação para o chat ou converta em docblock de decisão."

```diff
- // pega o client do supabase
  const client = getConfiguredSupabase();
- // se não tiver client retorna false
  if (!client) {
    return false;
  }
```

---

### 8. ❌ Instalar biblioteca sem confirmação prévia ou sem ler a doc

- **Regra:** nenhuma dependência nova sem autorização; autorizada, ler a doc oficial antes. Use `pnpm`, nunca npm/yarn.
- **Correção:** "Reverta a dependência e resolva com o que já existe em `@agenda/core` / no que está instalado."

```diff
- "dependencies": {
-   "date-fns": "^4.1.0"
- }
+ import { shiftDate } from '@agenda/core';
```

---

### 9. ❌ Tipo inseguro, coerção forçada ou teste quebrado/desabilitado

- **Regra:** sem `any`, `@ts-ignore`, `@ts-nocheck`, `unknown` sem guard, `!` sem justificativa. Sem `skip`/delete de teste existente. Cast pontual só no escape hatch documentado do Supabase (Seção 9).
- **Correção:** "Substitua pelo tipo estrito via `import type` e restaure o teste."

```diff
- // @ts-ignore
- const handleSelect = (item: any) => logEvent(item.name);
- it.skip('rejeita recorrência acima do máximo', () => { /* ... */ });
+ import type { Event } from '@agenda/core';
+ const handleSelect = (item: Event) => logEvent(item.name);
+ it('rejeita recorrência acima do máximo', () => { /* ... */ });
```

---

### 10. ❌ Recriar utilitário ou primitiva de UI que já existe

- **Regra:** consulte a Seção 5 antes de escrever helper ou componente básico.
- **Correção:** "Remova a duplicata e reutilize a versão de `@agenda/core` ou do `components/ui/` do app."

```diff
- <button onClick={handleSave} className="bg-[#1dd75e] px-4 py-2 rounded-lg text-black">
-   Salvar
- </button>
+ import { Button } from '@/components/ui/Button';
+ <Button onClick={handleSave}>Salvar</Button>
```

---

### 11. ❌ Log nativo em vez da abstração de logger

- **Regra:** `console.*` proibido. Use `handleServiceError` (service) ou `logErrorToTerminal` (log sem re-lance). UI mostra `getFriendlyErrorMessage`.
- **Correção:** "Troque o `console.*` pela abstração de erro do core."

```diff
  } catch (error) {
-   console.error('Erro ao salvar evento:', error);
-   throw error;
+   return handleServiceError(error, { method: 'ownedEvents.saveOwnedEvent' });
  }
```

---

### 12. ❌ Estado sem seletor atômico ou efeito em cascata

- **Regra:** store consumida por seletor; `setState` em `useEffect` dentro de `queueMicrotask`.
- **Correção:** "Aplique seletor atômico e agende o `setState` em `queueMicrotask`."

```diff
- const { user } = useAuthStore();
+ const user = useAuthStore((state) => state.user);

  useEffect(() => {
-   setFilteredList(filterItems(items, query));
+   queueMicrotask(() => {
+     setFilteredList(filterItems(items, query));
+   });
  }, [items, query]);
```

---

### 13. ❌ Alteração/commit não autorizado de `.md` — ou ausência do CHANGELOG obrigatório

- **Regra:** não edite `.md` existente sem autorização. **Exceção obrigatória:** o CHANGELOG da versão seguinte de cada projeto tocado (Seção 8) — sua ausência num commit de código é que constitui infração.
- **Correção:** "Reverta a edição de `.md` não autorizada; acrescente (sem sobrescrever) o bullet no CHANGELOG da próxima versão de cada projeto afetado."

```diff
- README.md                                       ❌ editado sem pedir
+ apps/web-client/CHANGELOG-alfa-v0.0.2.md        ✅ obrigatório neste commit

  # Changelog 0.0.2 (alfa)

  - Painel do dono passa a listar eventos em rascunho junto dos publicados
+ - Formulário de evento aceita definir lotação máxima
```

---

### 14. ❌ Query key literal, escrita fora do service, ou `CACHE_BUSTER` desatualizado

- **Regra:** key do catálogo sempre de `catalogKeys` (key local só sob Regra dos 3, como `panelKeys`); acesso ao Supabase só no service; mudou shape persistido → incremente `CACHE_BUSTER` e revise o `PERSIST_ALLOWLIST`.
- **Correção:** "Mova a chamada para um service do core, use a factory de key e atualize o `CACHE_BUSTER` se o shape persistido mudou."

```diff
  // ❌ na página
- useEffect(() => {
-   getSupabase()?.from('events').select('*').then(({ data }) => setEvents(data));
- }, []);

  // ✅ UI → hook → service
+ const { data: events, isPending } = useOwnedEvents();

  // services/cachePolicy.ts — shape mudou (campo novo em eventSchema)
- export const CACHE_BUSTER = 'v2';
+ export const CACHE_BUSTER = 'v3';
```
