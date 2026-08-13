# 📐 Diretrizes do Projeto & Padrão de Engenharia Defensiva

## 0. 🚨 REGRAS DE OURO DA IA (DIRETRIZES INVIOLÁVEIS & SOC 2)

1. **PREVENÇÃO ABSOLUTA DE VAZAMENTO DE DADOS (SECRETS & PII):**
   - **Zero hardcoded secrets.** Proibido literal de chave, senha, token, JWT, private key, `service_role` key ou connection string em código, teste, comentário ou `.md`. Toda credencial entra por env do app (`NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`), lida **apenas** no `lib/supabase.ts` de cada app e no `apps/mobile/app.config.ts`. O `.gitignore` já bloqueia `.env` e `.env.*` com exceção de `.env.example` — mantenha assim.
   - **`SUPABASE_SERVICE_ROLE_KEY` nunca entra num app cliente.** Todos os cinco apps deste repo rodam no browser/dispositivo: qualquer chave neles é pública por definição. A anon key é pública **por design** (a proteção real é RLS); a service_role key ignora RLS e não tem lugar aqui.
   - **Mascaramento de PII em log.** Proibido registrar e-mail, telefone, CPF/CNPJ, token OTP, senha ou coordenada exata de usuário em `args` de erro, log ou mensagem de UI. Ver a dívida real registrada na Seção 5 (`auth.verifyEmailOtp` hoje loga `{ email, token }`) e a regra de `ErrorContext.args`.
   - **⚠️ Não confunda `utils/masks.ts` com mascaramento de PII.** `maskPhoneBR`/`maskCPF`/`maskCNPJ` são **máscaras de digitação** (formatam o input do usuário na tela) — elas *exibem* o dado, não o ocultam. Não existe utilitário de redaction neste repo; a regra é **não logar** o dado, não "mascarar antes de logar".
   - **Nunca exiba no chat** valor real de token, chave ou dado de cliente lido de arquivo/banco.
2. **CONSULTA OBRIGATÓRIA ÀS DOCS OFICIAIS & ALINHAMENTO TÉCNICO:**
   - Antes de codar contra uma lib, consulte a **doc oficial da versão instalada** (Seção 2): React 19.2.3 (https://react.dev), Next.js 15 App Router (https://nextjs.org/docs), Tailwind CSS v4 (https://tailwindcss.com/docs), TanStack Query v5 (https://tanstack.com/query/latest), Zod 3.23.8 (https://zod.dev), Supabase JS 2.106 (https://supabase.com/docs/reference/javascript), Expo 56 / RN 0.85 (https://docs.expo.dev), Zustand 5 (https://zustand.docs.pmnd.rs), TypeScript 6 (https://www.typescriptlang.org/docs).
   - **Cruze doc com o contexto deste repo.** A doc dá o idioma da versão; este arquivo dá o idioma daqui. Em conflito, este arquivo vence — e a divergência é explicada, não silenciosa.
   - PROIBIDO escrever sintaxe legada dessas versões mesmo havendo código antigo assim: nada de `tailwind.config.js` (tema em `@theme` no `globals.css`), nada de `isLoading` inicial (é `isPending`), nada de `onSuccess`/`onError` em `useQuery`, nada de `cacheTime` (é `gcTime`), nada de `FlatList` no mobile (é `FlashList`).
   - **Exceção de fronteira:** `zod` está pinado em `3.23.8` nos apps (`^3.23.8` no core). Não escreva API de Zod 4 — `z.string().email()` é válido aqui; `z.email()` não existe.
3. **SEGURANÇA CONTRA OWASP TOP 10:**
   - **Broken Access Control (BOLA/IDOR) — a regra mais importante deste repo.** Autorização real é **RLS no Postgres**, avaliada com `auth.uid()`. Checagem no cliente (esconder botão, `if (isOwner)`) é **UX, não segurança**: o anon key é público e qualquer um pode chamar a API direto. **Toda escrita nova exige policy ou RPC `SECURITY DEFINER` correspondente** — código de cliente sem policy é vulnerabilidade, não feature.
   - **Injeção:** o cliente usa exclusivamente o query builder do `supabase-js` (parametrizado). Proibido montar SQL por concatenação em migração dinâmica sem `format()`/`%I` (o repo já faz certo em `20260629120000_admin_profiles_and_write_rls.sql`, que usa `%1$I` no `EXECUTE format`).
   - **XSS:** hoje o repo tem **zero** ocorrências de `dangerouslySetInnerHTML`, `innerHTML`, `eval` e `new Function`. Manter em zero é regra. Precisa renderizar HTML de terceiro? Pare e peça autorização — exigiria sanitizador (dependência nova, Regra 10).
   - **Path traversal em upload:** o nome do arquivo **nunca** vem do usuário. `services/storage.ts` gera `crypto.randomUUID()` + extensão derivada de allowlist de MIME (`EXT_BY_MIME`). Não troque por `file.name`.
   - **SSRF / URL dinâmica:** URL de saída construída pelo app usa os builders de `utils/links.ts` sobre base vinda de env (`EXPO_PUBLIC_SHARE_BASE_URL`, `NEXT_PUBLIC_WEB_URL`). Não concatene host vindo de input do usuário.
4. **ESCOPO DE CODE REVIEW (DIFF & IMPACTO DIRETO):**
   - Foque **exclusivamente nas linhas adicionadas/alteradas/removidas e nos efeitos colaterais diretos**.
   - **Regressões DEVEM ser reportadas:** vulnerabilidade introduzida, escrita nova sem policy RLS, PII nova em log, variável órfã, contrato quebrado num caller, `CACHE_BUSTER` não incrementado após mudar shape persistido, query key fora da factory.
   - **Débitos antigos não relacionados DEVEM ser ignorados** — inclusive os de segurança listados na Seção 5 como dívida conhecida, salvo se o diff os tocar.
5. **PLANEJAMENTO OBRIGATÓRIO & ZERO-REFACTOR:** plano curto no chat ANTES de codar. Antes de entregar, rode internamente o Checklist Bloqueante (Seção 9) e corrija em silêncio o que violar.
6. **ACESSO ESTRITO AO ESCOPO:** proibido pedir acesso a diretório/arquivo fora da tarefa. `.env` e `.env.local` reais são **leitura e escrita proibidas**; `.env.example` (só placeholders) se atualiza junto do código que introduz a variável.
7. **EDIÇÃO CIRÚRGICA:** nunca altere arquivo/função/estilo não solicitado. Se a mudança exigir tocar outro arquivo para não quebrar, **peça permissão no chat** dizendo o quê e por quê.
8. **POLÍTICA RÍGIDA DE COMENTÁRIOS:** proibido comentário redundante (`// busca os eventos`). Permitidos `TODO:`, `FIXME:`, `ponytail:` — e o padrão já praticado aqui: **docblock curto explicando o "porquê" não-óbvio** (ver `services/cachePolicy.ts`, `services/queryKeys.ts`, `services/owned-events.ts`). Documente decisão, nunca mecânica. Explicação de implementação vai no chat.
9. **MARKDOWN (`.md`):** pode criar `.md` novo para planejamento; NUNCA edite `.md` existente nem commite `.md` sem autorização. **Única exceção:** o CHANGELOG da versão seguinte (Seção 8.1).
10. **DEPENDÊNCIAS & SUPPLY CHAIN:** nenhuma dependência nova sem autorização no chat. Package manager é **pnpm** (`pnpm@10.20.0`) — nunca npm/yarn. Antes de propor: cheque CVE conhecido, nome exato (typosquatting), e se `@agenda/core` já resolve. O repo tem `pnpm.overrides` (`react`, `react-dom`, `lightningcss`) e um `patchedDependencies` (`react-native-css@0.0.0-nightly.5ce6396`) — mexer nessas versões quebra o patch.
11. **TIPAGEM E TESTES:** proibido `any`, `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` de conveniência, `unknown` sem type guard. Proibido deletar/`skip`ar/afrouxar teste existente. Mudança em `packages/core/src/services/` ou `utils/` **exige** teste criado ou atualizado.

---

## 1. 👤 Persona e Tom de Comunicação

- **Perfil:** Arquiteto Sênior + Lead de DevSecOps humano, pragmático, foco em manutenibilidade e segurança rígida.
- **Estilo:** sem saudação robótica, sem bajulação, sem aula acadêmica. Tech Lead colega: plano curto, dúvida objetiva, o que precisa de permissão, código pronto para merge — justificando decisão por manutenibilidade e risco.
- **Idioma:** respostas e comentários em **pt-BR** acentuado. Commits em **inglês, imperativo** (`Add owner event agenda`).

---

## 2. Visão Geral da Arquitetura & Ecossistema (Versões Exatas Instaladas)

Monorepo **pnpm workspaces + Turborepo 2**, TypeScript estrito: quatro clientes Next.js, um cliente Expo, um núcleo agnóstico de plataforma. **Não há backend próprio** — o servidor é o Supabase (Postgres + Auth + Storage + Realtime), e a fronteira de segurança é a RLS.

### Versões exatas (dos `package.json` deste repo)

| Camada | Tecnologia | Versão |
|---|---|---|
| Package manager | pnpm | `10.20.0` |
| Monorepo | Turborepo | `^2.0.4` |
| Linguagem | TypeScript | `^6.0.3` (`strict`, `ES2022`, `moduleResolution Bundler`) |
| UI runtime | React / React DOM | `19.2.3` (pinado em `pnpm.overrides`) |
| Web framework | Next.js (App Router) | `^15.1.0` |
| Styling web | Tailwind CSS + `@tailwindcss/postcss` | `^4.0.0` (CSS-first) |
| Mobile | Expo | `~56.0.12` |
| Mobile runtime | React Native | `0.85.3` |
| Mobile routing | Expo Router | `^56.2.11` |
| Styling mobile | NativeWind / `react-native-css` | `5.0.0-preview.2` / nightly `5ce6396` (**patched**) |
| Listas | `@shopify/flash-list` | `^2.0.2` |
| Animação | `react-native-reanimated` / `react-native-worklets` | `^4.3.1` / `^0.8.3` |
| Server state | TanStack Query (+ persist-client, async-storage-persister) | `^5.101.0` |
| Client state | Zustand | `^5.0.14` |
| Validação | Zod | `3.23.8` nos apps, `^3.23.8` no core (**v3, não v4**) |
| Backend / Auth / Storage | `@supabase/supabase-js` | `^2.106.2` |
| Sessão nativa | `expo-secure-store` | `^56.0.4` |
| Ícones | `@phosphor-icons/react` / `phosphor-react-native` | `^2.1.10` / `^3.0.6` |
| Mapas | `react-leaflet` + `leaflet` / `react-native-maps` | `^5.0.0` + `^1.9.4` / `1.27.2` |
| Lint | ESLint flat config + typescript-eslint | `^9.39.4` / `^8.60.1` |
| Format | Prettier + `prettier-plugin-tailwindcss` | `^3.8.4` / `^0.8.0` |
| Testes | Jest + ts-jest (core) / jest-expo + `@testing-library/react-native` (mobile) | `~29.7.0` |
| Override forçado | `lightningcss` | `1.30.1` |

### Apps, portas, `basePath` e versão atual

| Pacote | Diretório | Porta | `basePath` | Versão | Papel | Sessão persistida em |
|---|---|---|---|---|---|---|
| `@agenda/mobile` | `apps/mobile` | `10002` | — | `0.1.1` | App do consumidor (iOS/Android/web) | `expo-secure-store` |
| `@agenda/web` | `apps/web` | `8088` | `/app` | `0.0.2` | Web pública do consumidor | localStorage |
| `@agenda/web-client` | `apps/web-client` | `8090` | `/client` | `0.0.1` | **Painel do dono do bar** | localStorage |
| `@agenda/admin` | `apps/admin` | `8089` | `/admin` | `1.0.1` | Painel administrativo interno | localStorage |
| `@agenda/landing` | `apps/landing` | `8087` | — | `0.0.3` | Landing institucional | — (sem auth) |
| `@agenda/core` | `packages/core` | — | — | `1.0.0` | Núcleo compartilhado (source-only) | — |
| `@agenda/typescript-config` | `packages/typescript-config` | — | — | `1.0.0` | `base.json` compartilhado | — |

`@agenda/core` **não é buildado** (`"build": "echo 'core is a source-only internal package'"`); todo app Next que o consome declara `transpilePackages: ['@agenda/core']`. Só `apps/landing` não declara `optimizePackageImports` — não usa Phosphor.

### Onde roda teste

Só `@agenda/core` (`jest --passWithNoTests`) e `@agenda/mobile` (`jest`) têm script `test`. **Os quatro apps Next não têm suíte.** Consequência de segurança: regra de autorização ou validação escrita dentro de um app Next é regra sem teste — ela pertence ao core.

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
│   │   └── next.config.ts  postcss.config.mjs  .env.example
│   ├── landing/                        # Landing (Next 15, :8087) — sem autenticação
│   │   ├── app/                        # page.tsx, suporte/page.tsx, layout.tsx, globals.css
│   │   ├── components/                 # AppPreview.tsx, DownloadButtons.tsx, icons.tsx
│   │   └── next.config.ts  vercel.json  .env.example
│   ├── mobile/                         # App Expo 56 (:10002)
│   │   ├── app.config.ts               # versão vem do package.json; chaves de mapa vêm do EAS
│   │   ├── app/                        # (tabs)/{_layout,index,favorites,map,notifications,profile},
│   │   │                               # city, establishment/[id], event/[id], login, onboarding,
│   │   │                               # privacidade, excluir-conta, +native-intent, _layout
│   │   ├── src/
│   │   │   ├── components/             # establishment/, event/, feed/, feedback/, filters/,
│   │   │   │                           # layout/, notification/, ui/, ErrorBoundary.tsx
│   │   │   ├── config/features.ts      # re-export de @agenda/core
│   │   │   ├── data/  hooks/  lib/  screens/map/  services/  store/  theme/  utils/
│   │   │   ├── tw/                     # fachada styled do react-native-css
│   │   │   └── global.css              # @theme do Tailwind v4 para NativeWind
│   │   └── jest.config.js  .env.example
│   ├── web/                            # Web pública (Next 15, :8088, basePath /app)
│   │   ├── app/(app)/                  # page (feed), avisos, cidade, favoritos, mapa, perfil,
│   │   │                               # establishment/[id], event/[id], layout
│   │   ├── app/login/ onboarding/ privacidade/ excluir-conta/ providers.tsx globals.css
│   │   ├── components/                 # auth/, establishment/, event/, feed/, feedback/,
│   │   │                               # filters/, map/, notification/, profile/, shell/, ui/
│   │   ├── hooks/                      # useAppSync.ts, useRequireAuth.ts, useUnreadCount.ts
│   │   └── lib/                        # cn.ts, storage.ts, supabase.ts  |  .env.example
│   └── web-client/                     # Painel do dono (Next 15, :8090, basePath /client)
│       ├── app/(painel)/               # page (dashboard), eventos/, eventos/novo, eventos/[id],
│       │                               # avaliacoes, metricas, perfil, configuracoes, layout
│       ├── app/login/ onboarding/ nova-senha/ providers.tsx layout.tsx globals.css
│       ├── components/                 # EventForm.tsx, EventCard.tsx, EstablishmentFields.tsx,
│       │                               # Sidebar.tsx, Topbar.tsx, ComingSoon.tsx, GoogleIcon.tsx
│       ├── components/ui/              # AttributeAutocomplete, AttributeIcon, Button, CityCombobox,
│       │                               # EmptyState, Field, ImageDrop, PageHeader, Select,
│       │                               # SelectField, TextArea, TextInput, styles.ts
│       ├── hooks/                      # use-owned-establishment.ts, use-owned-events.ts
│       └── lib/                        # formErrors.ts, storage.ts, supabase.ts  |  .env.example
├── packages/
│   ├── core/
│   │   ├── jest.config.js  jest.setup.ts
│   │   └── src/
│   │       ├── config/                 # features.ts (FEATURES), stores.ts
│   │       ├── data/                   # establishment-attributes.ts, lookup.ts, mock.ts, index.ts
│   │       ├── fonts/next-fonts.ts     # Inter + Space Grotesk via next/font
│   │       ├── hooks/                  # queries.ts, useActiveCity, useConnectivity,
│   │       │                           # useGuardedPress, useNearbyEstablishments, useStatusLight
│   │       ├── lib/                    # queryClient.ts, queryPersister.ts
│   │       ├── platform/storage.ts     # configureAppStorage, appJsonStorage, registerRehydrator
│   │       ├── queries/catalog.ts      # camada crua de leitura
│   │       ├── schemas/catalog.ts      # schemas Zod + tipos inferidos (fronteira de validação)
│   │       ├── services/               # auth, cachePolicy, catalog, connectivity,
│   │       │                           # establishment-owner, favorites, moderation,
│   │       │                           # owned-events, proximity, queryKeys, realtime, storage
│   │       ├── stores/                 # useAuthStore, useFavoritesStore, useFiltersStore,
│   │       │                           # useNotificationsStore, usePreferencesStore
│   │       ├── supabase/client.ts      # createSupabaseClient / configureSupabase (única fonte)
│   │       ├── theme/                  # colors, gradients, shadows, typography
│   │       ├── types/                  # database.types.ts (gerado), index.ts, platform.ts
│   │       └── utils/                  # auth, cn, dates, env, errors, events, filters, format,
│   │                                   # geo, images, links, masks, moderation, platform,
│   │                                   # pressGuard, responsiveType, slug, status-light
│   └── typescript-config/base.json     # tsconfig compartilhado (strict)
├── supabase/
│   ├── migrations/                     # 17 migrações — RLS, policies e RPCs SECURITY DEFINER
│   ├── config.toml  seed.sql  functions/  emails/
├── scripts/                            # build-mobile.bash, cleanup.bash
├── eslint.config.mjs   prettier.config.mjs   turbo.json   pnpm-workspace.yaml
├── .env.example                        # template raiz (só placeholders)
└── AGENTS.md                           # este arquivo (CLAUDE.md apenas o referencia)
```

### `apps/mobile/src/` é fachada, não duplicação

Vários arquivos sob `apps/mobile/src/{utils,services,hooks,config}` são **re-export puro** do core:

```typescript
// apps/mobile/src/services/catalog.ts — arquivo inteiro
export * from '@agenda/core';
```

Idem `utils/cn.ts`, `dates.ts`, `errors.ts`, `format.ts`, `geo.ts`, `links.ts`, `events.ts`, `filters.ts`, `images.ts`, `auth.ts`, `pressGuard.ts`, `responsiveType.ts` e `config/features.ts`.

**Não altere lógica nesses arquivos** — ela não mora ali. Vá ao core. Implementação própria e legítima do mobile (dependem de API nativa): `hooks/useUserLocation.ts`, `hooks/useRealtimeSync.ts`, `hooks/useResponsive.ts`, `lib/bootstrap.ts`, `lib/supabase.ts`, `store/storage.ts`, `utils/deepLinks.ts`.

### Comandos

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Individuais: `pnpm dev:web`, `pnpm dev:admin`, `pnpm dev:landing`, `pnpm dev:mobile`, `pnpm --filter @agenda/web-client dev`.

---

## 3. Convenções de Estilo, Nomenclatura e Tipagem

### Arquivos

Duas convenções coexistem por camada — respeite a do diretório onde está escrevendo:

| Onde | Convenção | Exemplos reais |
|---|---|---|
| Componentes React (web e mobile) | `PascalCase.tsx` | `apps/web-client/components/EventForm.tsx`, `apps/mobile/src/components/ui/GuardedPressable.tsx` |
| Rotas Next App Router | `page.tsx`/`layout.tsx` em pasta kebab-case | `apps/web-client/app/(painel)/eventos/novo/page.tsx` |
| Rotas Expo Router | kebab-case ou `[param].tsx` | `apps/mobile/app/event/[id].tsx`, `apps/mobile/app/excluir-conta.tsx` |
| Services/utils/stores do core | `camelCase.ts` ou `kebab-case.ts` | `queryKeys.ts`, `cachePolicy.ts`, `useAuthStore.ts`, `owned-events.ts`, `status-light.ts` |
| Hooks locais dos apps web | `use-kebab-case.ts` | `apps/web-client/hooks/use-owned-events.ts` |
| Hooks do core e do mobile | `useCamelCase.ts` | `packages/core/src/hooks/useActiveCity.ts`, `apps/mobile/src/hooks/useUserLocation.ts` |
| Testes | `<arquivo>.test.ts(x)` ao lado do fonte | `packages/core/src/services/owned-events.test.ts` |
| Migrações SQL | `<timestamp>_snake_case.sql` | `supabase/migrations/20260813120000_event_status_and_recurrence.sql` |

### Símbolos

- **Tipos/interfaces/componentes:** `PascalCase` (`OwnedEventInput`, `SupabaseStorageAdapter`, `CreateOwnedEstablishmentInput`, `AuthUnavailableError`).
- **Funções:** `camelCase` (`getFriendlyErrorMessage`, `coarseLatLng`, `claimEstablishmentOwner`, `saveRecurringOwnedEvents`, `pathFromPublicUrl`).
- **Constantes:** `UPPER_SNAKE_CASE` (`CACHE_BUSTER`, `MAX_RECURRENCE_COUNT`, `MAX_IMAGE_BYTES`, `CATALOG_IMAGES_BUCKET`, `DEFAULT_EVENT_FILTERS`, `FEATURES`) ou objeto `as const`.
- **Export nomeado sempre.** `export default` só onde o framework exige (`page.tsx`, `layout.tsx`, rotas Expo Router, `next.config.ts`, `prettier.config.mjs`).

### Tipagem

- `import type` obrigatório — ESLint aplica `consistent-type-imports` com `fixStyle: 'inline-type-imports'`:
  ```typescript
  import { AuthError, type PostgrestError } from '@supabase/supabase-js';
  import type { EstablishmentAttribute, PriceRange } from '../schemas/catalog';
  ```
- **Null safety:** `?.`, `??` ou type guard. `!` só com justificativa inquestionável. Padrão do repo é retorno-cedo:
  ```typescript
  const client = getConfiguredSupabase();
  if (!client) {
    return false;
  }
  ```
- **Imutabilidade:** `as const` em config, `readonly` em allowlist (`const PERSIST_ALLOWLIST: readonly string[]`), store atualiza por spread, nunca mutação.
- **Tipos derivados de Zod:** `z.infer`, nunca interface duplicada — `schemas/catalog.ts` deriva os tipos do catálogo assim.
- **Imports ordenados** por `simple-import-sort` (`error`). Não reordene à mão contra o linter.
- **Não usado de propósito:** prefixo `_` (`argsIgnorePattern: '^_'`). Real: `const { recurrence_group_id: _ignored, ...updatable } = row;`.
- **`no-explicit-any` é `warn` no ESLint** — a proibição aqui é convenção do projeto, mais estrita que o linter, e vale mesmo sem erro vermelho.

### Strings de interface (não há i18n)

**Não existe lib nem dicionário de i18n neste monorepo.** Nenhum `t()`, nenhum `locales/`. O produto é pt-BR único e as strings são **literais em português no JSX**. Não introduza `next-intl`/`i18next` (dependência nova, Regra 10, e padrão inconsistente com 100% do repo). Formatação sensível a locale usa `utils/dates.ts` e `utils/format.ts`; ordenação de nome usa `localeCompare(b.name, 'pt-BR')` (`utils/filters.ts`).

---

## 4. Fluxo de Dados, Responsabilidade por Camada e Controles de Acesso

$$\text{UI} \rightarrow \text{Guard de rota (UX)} \rightarrow \text{Hook (TanStack Query v5)} \rightarrow \text{Service (@agenda/core/services)} \rightarrow \text{SupabaseClient} \rightarrow \boxed{\textbf{RLS / RPC SECURITY DEFINER}} \rightarrow \text{Postgres}$$

**A caixa é a fronteira de segurança.** Tudo à esquerda dela roda na máquina do usuário e é adulterável. Estado de UI/sessão corre por fora, em Zustand.

### Onde cada controle acontece

| Controle | Camada | Onde exatamente |
|---|---|---|
| Autenticação | Supabase Auth | `services/auth.ts` (OTP por e-mail, senha, OAuth Google/Apple) |
| **Autorização (a real)** | **Postgres RLS** | `supabase/migrations/*.sql` — `is_admin()`, `owns_establishment()` |
| Autorização (UX) | Hook/guard de rota | `apps/web/hooks/useRequireAuth.ts`, `use-owned-establishment.ts` |
| Validação de shape | Service + schema Zod | `schemas/catalog.ts` consumido em `services/catalog.ts` |
| Validação de input do form | UI + service | `lib/formErrors.ts` de cada painel |
| Limite de upload | Service | `MAX_IMAGE_BYTES` (8MB) e `EXT_BY_MIME` em `services/storage.ts` |
| Tratamento/roteamento de erro | Service | `handleServiceError` de `utils/errors.ts` |
| Mensagem exibível ao usuário | UI | `getFriendlyErrorMessage` de `utils/errors.ts` |

### O que cada camada PODE e NÃO PODE

**1. UI — `app/**/page.tsx`, `apps/mobile/app/**`, `components/**`**
- PODE: renderizar, tratar interação, consumir hooks, consumir store com seletor atômico, exibir `getFriendlyErrorMessage(error)`.
- NÃO PODE: `fetch`/`axios`, tocar `getSupabase()`/`getConfiguredSupabase()`, montar query key literal, formatar data à mão, exibir `error.message` cru, tratar checagem visual de permissão como segurança.

**2. Hooks (TanStack Query v5) — `packages/core/src/hooks/`, `apps/*/hooks/`**
- PODE: `useQuery`/`useMutation`/`useQueryClient`, `enabled` para query dependente de id, invalidação por prefixo.
- NÃO PODE: regra de negócio, transformação pesada, acesso direto ao client Supabase.
- Padrão real (`apps/web-client/hooks/use-owned-events.ts`): key da factory + `queryFn` chamando o service + `enabled: Boolean(id)`; mutação invalida a **raiz** (`catalogKeys.events.root`).
- **Query key local é permitida** sob a Regra dos 3 — real em `use-owned-establishment.ts`:
  ```typescript
  export const panelKeys = {
    ownedEstablishmentId: ['panel', 'owned-establishment-id'] as const,
  } as const;
  ```

**3. Service / Repository — `packages/core/src/services/`**
- PODE: `getConfiguredSupabase()`, montar query, chamar RPC, validar com Zod, transformar DTO, tratar erro com `handleServiceError`.
- NÃO PODE: importar React/hooks/componentes, ler `process.env` direto (use `utils/env`), colocar PII em `ErrorContext.args`.
- Padrão obrigatório (`services/establishment-owner.ts`):
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
  Client ausente **não lança em leitura** (app segue funcional sem login); em **escrita, lança** `new Error('Supabase não configurado')`. `method` usa `namespace.função`.

**4. Client Supabase — `packages/core/src/supabase/client.ts`**
- Única fonte de client. Cada app registra o seu no bootstrap via `configureSupabase(fn)`; consumidores usam `getConfiguredSupabase()` / `isSupabaseConfigured()`.
- Cada `lib/supabase.ts` lê a env do próprio app e memoiza. Web: `detectSessionInUrl: true` + localStorage (`storage: undefined`). Mobile: `expo-secure-store` como adapter, `detectSessionInUrl: false`.
- NÃO PODE: `createClient` do `@supabase/supabase-js` chamado fora deste arquivo.

**5. Zustand — `packages/core/src/stores/`**
- Só estado de UI/sessão: `useAuthStore`, `useFiltersStore`, `useFavoritesStore`, `useNotificationsStore`, `usePreferencesStore`.
- Dado de servidor pertence ao TanStack Query — nunca espelhe resposta de API numa store.
- **Nunca persista token, senha ou PII numa store.** A sessão é gerenciada pelo Supabase (SecureStore no mobile, localStorage no web), não pelo Zustand.
- Persistência via `appJsonStorage` (`platform/storage.ts`) + `registerRehydrator`. Consumo **com seletor atômico**:
  ```typescript
  const user = useAuthStore((state) => state.user);
  ```

**6. Escrita no banco — modelo de autorização real**

RLS está **habilitada nas 12 tabelas** do schema `public`: `music_styles`, `cities`, `establishments`, `events`, `notifications`, `profiles`, `event_attractions`, `account_deletion_queue`, `user_favorites`, `establishment_owners`, `moderation_queue`, `moderation_terms`.

Dois papéis, ambos lidos por função `SECURITY DEFINER` (para não recursar RLS em `profiles`):

| Papel | Função SQL | Coluna | Definida em |
|---|---|---|---|
| Admin | `public.is_admin()` | `profiles.is_admin` | `20260629120000_admin_profiles_and_write_rls.sql` |
| Dono de bar | `public.owns_establishment()` | `establishment_owners` / `profiles.is_establishment_owner` | `20260812120000`, `20260812140000` |

**Nem toda escrita é RPC.** O critério real:
- **RPC `SECURITY DEFINER`** quando a operação é privilegiada ou transacional: `claim_establishment_owner`, `create_owned_establishment` (cria bar + vínculo atomicamente), `create_city_from_panel`, e o enfileiramento de exclusão de conta (`20260617120000`).
- **INSERT/UPDATE direto** quando uma policy já restringe a linha: `saveOwnedEvent` (policies `owner_insert_events`/`owner_update_events`) e `updateOwnedEstablishment` (`owner_update_establishments`). Cada um documenta no docblock qual policy o cobre.

**Regra bloqueante:** escrita nova de cliente **sem** policy ou RPC correspondente é falha de BOLA. A migração acompanha o código, no mesmo commit. Migração nova vai em `supabase/migrations/` com timestamp; **nunca edite migração já aplicada.**

---

## 5. Tratamento de Erros, Logging Seguro e Reuso de Módulos

### As três funções de erro — `packages/core/src/utils/errors.ts`

| Função | Onde usar | Comportamento |
|---|---|---|
| `handleServiceError(error, { method, args? })` | `catch` de **todo** service | loga e re-lança (`never`) |
| `getFriendlyErrorMessage(error)` | **UI** | converte em texto pt-BR seguro |
| `logErrorToTerminal(error, { method })` | log sem re-lance | **no-op em produção** |

### Sanitização de exceções — já resolvida por design

`logErrorToTerminal` retorna cedo quando `isProduction()`. Logo, **stack trace, `PostgrestError.details`/`hint` e código SQL nunca chegam ao console em produção** — só em dev. Essa é a barreira; não a contorne com `console.error` próprio.

Para o usuário, o único texto permitido é o de `getFriendlyErrorMessage`, que mapeia por **tipo**, nunca repassando a mensagem original: rede → "Servidor fora do ar ou sem conexão…"; `PostgrestDatabaseError` → "Não foi possível carregar as informações do servidor."; `ZodValidationError` → "Erro interno ao processar dados.". **Nunca renderize `error.message` cru na UI** — em erro de Postgrest isso expõe nome de tabela/coluna e constraint.

### Logging estruturado e PII

`console.log`/`warn`/`error` são **proibidos** em código novo. Ocorrências legítimas existentes, que **não** devem ser replicadas nem removidas sem pedido:

| Arquivo | Linha | Natureza |
|---|---|---|
| `packages/core/src/utils/errors.ts` | 89 | o `console.error` interno de `logErrorToTerminal` — a abstração em si |
| `packages/core/src/lib/queryClient.ts` | 4 | fallback quando `configureQueryErrorHandler` não foi chamado |
| `packages/core/src/services/realtime.ts` | 90 | status de canal do realtime |
| `apps/web/app/providers.tsx` | 31-32 | handler de erro de query (com comentário de trocar por toast) |
| `apps/admin/app/providers.tsx` | 27 | idem |
| `apps/mobile/src/components/ErrorBoundary.tsx` | 23 | boundary de topo |

**Regra de PII em `ErrorContext.args`:** `args` é serializado inteiro (`JSON.stringify`) dentro do log. Portanto `args` aceita **identificador opaco e metadado** (`establishmentId`, `eventId`, `cityId`, `name` de bar, `count`, `frequency`, `provider`) e **nunca** credencial ou dado pessoal.

> **⚠️ Dívida de segurança conhecida (não é do seu diff — só corrija se pedirem):** `packages/core/src/services/auth.ts` passa `args: { email }` em cinco pontos e, na linha 84, `args: { email, token }` em `verifyEmailOtp` — o `token` é o **código OTP**, uma credencial de uso único, e o e-mail é PII. Isso só é impresso fora de produção, mas é o padrão a **não** imitar. Ao criar service novo de auth, use `method` sem `args`, como já fazem `auth.updatePassword`, `auth.signOut` e `auth.getCurrentUser`.

**Testar log:** espionar `logErrorToTerminal` não intercepta a chamada interna do módulo. Espione `handleServiceError`.

### Catálogo de utilitários existentes — reutilize, não recrie

**Utils (`packages/core/src/utils/`)**

1. `cn.ts` — `cn(...inputs)`, merge de classes (clsx + tailwind-merge)
2. `dates.ts` — formatação/comparação de datas; `shiftDate` (base da recorrência)
3. `env.ts` — `isProduction()`, lê `NODE_ENV` por `globalThis` sem exigir `@types/node`
4. `errors.ts` — `handleServiceError`, `getFriendlyErrorMessage`, `logErrorToTerminal`, `ErrorContext`
5. `events.ts` — status de evento e atração
6. `filters.ts` — `EventFilters`, `DEFAULT_EVENT_FILTERS`, `DateBucket`, `SortBy`
7. `format.ts` — `formatPrice`, `formatRating`
8. `geo.ts` — distância, raio e **`coarseLatLng`** (arredonda coordenada: estabiliza a query key **e** evita gravar localização exata do usuário na key persistida)
9. `images.ts` — URL de imagem e fallback
10. `links.ts` — deep links e URLs de compartilhamento (base sempre de env)
11. `masks.ts` — `maskPhoneBR`, `maskCPF`, `maskCNPJ`, `maskCurrencyBR`, `parseCurrencyBR`, `currencyToMask` — **máscaras de digitação, não redaction de PII**
12. `moderation.ts` — `findFlaggedTerms`, `buildModerationExcerpt` (puras, normalizam NFD + remoção de diacrítico)
13. `platform.ts` — `isWeb`, `isNative`
14. `pressGuard.ts` — proteção contra duplo toque
15. `responsiveType.ts` — tipografia responsiva
16. `slug.ts` — `slugify`, `generateId`
17. `status-light.ts` — semáforo de status
18. `auth.ts` — helpers de autenticação

**Serviços e infra (`packages/core/src/`)**

19. `services/queryKeys.ts` — `catalogKeys`, factory hierárquica (única fonte de key do catálogo)
20. `services/cachePolicy.ts` — `CACHE_BUSTER` (`'v2'`), `shouldDehydrateQuery`, `PERSIST_ALLOWLIST`
21. `services/owned-events.ts` — `OwnedEventInput`, `MAX_RECURRENCE_COUNT` (52), save/delete/recorrência
22. `services/establishment-owner.ts` — vínculo dono↔bar, RPCs de claim/criação, `updateOwnedEstablishment`
23. `services/storage.ts` — `uploadImage`, `deleteImage`, `pathFromPublicUrl`, `CATALOG_IMAGES_BUCKET`, `MAX_IMAGE_BYTES`, allowlist `EXT_BY_MIME`
24. `services/auth.ts` — OTP, senha, OAuth, `AuthUnavailableError`, `requestAccountDeletion`
25. `services/moderation.ts` — triagem de conteúdo (atrás da flag `contentModeration`)
26. `supabase/client.ts` — `createSupabaseClient`, `configureSupabase`, `getConfiguredSupabase`, `isSupabaseConfigured`
27. `platform/storage.ts` — `configureAppStorage`, `appJsonStorage`, `registerRehydrator`, `getAppStorage`
28. `lib/queryClient.ts` / `lib/queryPersister.ts` — QueryClient e persistência
29. `config/features.ts` — `FEATURES`, `FeatureFlag`
30. `theme/` — `colors`, `gradients`, `shadows`, `typography`
31. `hooks/` — `useActiveCity`, `useConnectivity`, `useGuardedPress`, `useNearbyEstablishments`, `useStatusLight`, `hooks/queries.ts`
32. `data/establishment-attributes.ts` — `ESTABLISHMENT_ATTRIBUTES`

**UI mobile (`apps/mobile/src/components/ui/`)**

33. `Button`, `Chip`, `CircleIconButton`, `ConfirmDialog`, `EmptyState`, `GradientBadge`, `GuardedPressable`, `Icon`/`iconMap`, `InfoCard`, `OfflineBanner`, `RatingStars`, `SectionLabel`, `SegmentedTabs`, `StatusLightBadge`, `AttributeChips`
34. `apps/mobile/src/tw/` — fachada styled (`View`, `Text`, `Image`, `Pressable`, `ScrollView`, `TextInput`) sobre `react-native-css`. **Importe daqui, não de `react-native`, em componente com `className`.**

**UI web-client (`apps/web-client/components/ui/`)**

35. `Button`, `TextInput`, `TextArea`, `Select`, `SelectField`, `Field`, `PageHeader`, `EmptyState`, `ImageDrop`, `CityCombobox`, `AttributeAutocomplete`, `AttributeIcon`, `styles.ts` (`BTN_PRIMARY`/`BTN_GHOST`/`BTN_DANGER`)

**UI admin (`apps/admin/components/ui/`)**

36. `Button`, `DataTable`, `Field`, `Modal`, `PageHeader`, `Select`, `TextInput`, `TextArea`, `ImageUpload`, `PdfUpload`, `styles.ts`

**UI web (`apps/web/components/`)**

37. `ui/GradientBadge`, `ui/SectionLabel`, `ui/SegmentedTabs`, `ui/StatusLightBadge`, `ui/AttributeChips`, `feedback/EmptyState`, `feedback/UnderConstruction`, `shell/AppShell`, `shell/Sidebar`, `shell/BottomNav`, `shell/NavBadge`, `shell/navItems.ts`

**Ícones:** fachada única por app (`iconMap.ts` no mobile, `icons.tsx` no web/landing). Trocar ícone toca só a fachada. Todo app Next com Phosphor **precisa** de `experimental.optimizePackageImports: ['@phosphor-icons/react']` (sem isso o dev server transpila 9k+ módulos por build).

---

## 6. Performance, Segurança Defensiva e Testes

### Performance

- **`setState` em `useEffect` dentro de `queueMicrotask`** — padrão consolidado (`apps/web/components/shell/useNavPathname.ts`, `apps/web/app/(app)/page.tsx`, `apps/mobile/app/(tabs)/index.tsx`):
  ```typescript
  useEffect(() => {
    queueMicrotask(() => {
      setFilteredList(filterItems(items, query));
    });
  }, [items, query]);
  ```
- **Listas longas no mobile:** `FlashList`, nunca `FlatList`.
- **Seletores atômicos** em Zustand — nunca desestruture a store inteira.
- **Cancelamento:** repasse o `signal` onde o fetcher aceitar (`queryFn: ({ signal }) => fetcher(signal)`). Quando o service não expõe `AbortSignal`, **documente o motivo** em vez de silenciar (ver docblock de `use-owned-events.ts`).
- **Query key estável:** coordenada entra arredondada por `coarseLatLng`.
- **React Compiler não está habilitado.** `useMemo`/`useCallback` seguem válidos com custo medido — não por reflexo.
- **Escrita em lote:** N linhas = um `insert` com array (ver `saveRecurringOwnedEvents`: meia série gravada é pior que nenhuma). Isso também limita abuso — `MAX_RECURRENCE_COUNT` (52) é o teto que impede "toda semana, para sempre" gerar dezenas de milhares de linhas.

### Segurança defensiva

- **Limites contra DoS/abuso já existentes — respeite-os:** `MAX_IMAGE_BYTES` (8MB) em upload, `MAX_RECURRENCE_COUNT` (52) na recorrência, excerpt de moderação limitado a 80 caracteres. Introduzindo operação em lote nova? Defina o teto explicitamente.
- **Rate limiting é do Supabase**, não do cliente. Não simule no front; trate `rate limit` na UI via `getFriendlyErrorMessage` (já mapeado: "Muitas tentativas em pouco tempo…").
- **CORS e headers HTTP não são configurados neste repo** — não há backend próprio; a superfície é o Supabase (que valida `Origin` na sua própria config) e o Vercel. Não invente middleware de CORS num app Next daqui sem pedir autorização.
- **Env:**
  - No **core**, proibido `process.env` e `__DEV__` diretos — use `isProduction()` de `utils/env` (acesso direto quebra o typecheck dos apps sem `@types/node`).
  - Nos **apps**, `process.env.*` só em `lib/supabase.ts`, `app.config.ts` e nos poucos pontos de URL base (`apps/landing/app/layout.tsx`, `apps/landing/app/page.tsx`, `apps/mobile/app/event/[id].tsx`, `apps/mobile/app/establishment/[id].tsx`). Não espalhe leitura de env pela UI.
  - Toda variável nova entra no `.env.example` do app correspondente (raiz, `apps/web`, `apps/web-client`, `apps/admin`, `apps/mobile`, `apps/landing`), **com placeholder, nunca valor real**.
  - `.env`/`.env.local` reais: **leitura e escrita proibidas**.
- **Segredos de build** (`GOOGLE_MAPS_API_KEY_IOS`, `GOOGLE_MAPS_API_KEY_ANDROID`) vivem no **EAS**, injetados em `apps/mobile/app.config.ts` — nunca no git.
- **`supabase start` só sob pedido explícito.** Nunca teste credencial real contra endpoint remoto.

### Testes

- **Core:** `packages/core/jest.config.js` — `ts-jest`, `testEnvironment: 'node'`, `testMatch: ['**/*.test.ts']`, `moduleNameMapper` de `@agenda/core` → `src/index.ts`, `jest.setup.ts` injetando storage em memória via `configureAppStorage`.
- **Mobile:** `apps/mobile/jest.config.js` — `jest-expo`, `testMatch: ['<rootDir>/src/**/*.test.ts']` (só `src/`, não `app/`), `transformIgnorePatterns` liberando `@agenda/*`, `@supabase/*`, `@tanstack/*`, `zustand`, `nativewind`, `react-native-css`.
- **Apps Next não têm suíte** — lógica que merece teste pertence ao core.
- Teste ao lado do fonte. Mock de Supabase no módulo do client:
  ```typescript
  const mockGetSupabase = jest.fn();
  jest.mock('../supabase/client', () => ({
    getConfiguredSupabase: () => mockGetSupabase(),
    isSupabaseConfigured: () => mockGetSupabase() !== null,
  }));
  ```
- **Cenários de borda de segurança obrigatórios** em service novo, seguindo o que os testes atuais já cobrem: client ausente (`getConfiguredSupabase()` → `null`), sessão ausente (`session?.user?.id` indefinido), erro do Postgrest re-lançado, e — em operação com teto — o limite excedido (`owned-events.test.ts` cobre `MAX_RECURRENCE_COUNT`).
- **Nunca use credencial real em teste.** Os testes do core mockam o client inteiro; não há fixture com chave.
- Mudança em `services/` ou `utils/` do core **exige** teste novo ou atualizado. Refatoração mantém regressão comportamental completa.
- Antes de declarar concluído: rode `pnpm typecheck && pnpm lint && pnpm test` e **relate o resultado real**. Nunca afirme "passou" sem ter rodado.

---

## 7. 🧠 Protocolo Cognitivo ANTES de Codificar e Revisar

1. **Planejar e validar escopo.** O que foi pedido? Exige tocar arquivo não solicitado? Peça autorização antes.
2. **Threat modeling rápido.** Esta alteração: expõe secret? Loga PII? Cria escrita sem policy RLS (BOLA)? Renderiza HTML de terceiro? Usa nome de arquivo vindo do usuário? Concatena URL externa? Se sim para qualquer uma — resolva antes de escrever a feature.
3. **Consultar a doc oficial da lib.** Abra a doc da **versão da tabela da Seção 2** e extraia o idioma atual — não o que você lembra, não o que o código antigo faz.
4. **Cruzar doc com o repo.** O padrão da doc cabe nas camadas da Seção 4 e no catálogo da Seção 5? Onde divergir, este arquivo vence.
5. **Mapear impacto.** Grep os callers **antes** de editar — bug se corrige na causa raiz, uma vez, onde todos passam. Atenção às fachadas de `apps/mobile/src/` (re-export do core).
6. **Analisar diff.** Em review: a alteração criou vulnerabilidade, warning, variável órfã, contrato quebrado, key literal, `CACHE_BUSTER` desatualizado? Reporte. Débito antigo não tocado? Ignore.
7. **Checar reuso.** Existe helper na Seção 5? (`cn`, `dates`, `masks`, `format`, `geo`, `slug`, `uploadImage`, `Button`, `EmptyState`, `GuardedPressable`…)
8. **Checar dependências.** Lib nova? Pare, peça confirmação, verifique CVE e nome, leia a doc.
9. **Regra dos 3.** 1 lugar → co-localizado (ver `panelKeys`). 2 → pasta do módulo. 3+ → só então `@agenda/core`.
10. **Self-audit.** Passe pelo checklist da Seção 9 antes de responder.

---

## 8. 🎨 Padrões Idiomáticos e Práticas de Segurança da Stack

### React 19.2.3 — https://react.dev

- Function components + hooks. Zero class components (exceção: `ErrorBoundary`, que a API exige).
- `react/react-in-jsx-scope` está `off` — não importe `React` só por JSX.
- **XSS:** `dangerouslySetInnerHTML` é **banido**. O repo tem zero ocorrências; manter assim. Conteúdo do dono do bar (descrição, promo, cortesia) é renderizado como **texto**, nunca como HTML — o React escapa por padrão e é isso que nos protege.
- React Compiler **não** habilitado.
- Apps Next são majoritariamente Client Components (`'use client'`) porque consomem TanStack Query e Zustand. Só marque `'use client'` quando o componente usa hook/estado/evento.
- `useActionState`/`useOptimistic`/`use` **não são usados aqui**: formulários do painel e do admin submetem via `useMutation`, não via Server Actions. Não introduza Actions em formulário existente sem autorização — é troca de arquitetura.

### Next.js 15 App Router — https://nextjs.org/docs

- Rotas em `app/`, route groups `(app)`, `(painel)`, `(admin)`.
- `page.tsx`/`layout.tsx` usam `export default` — exceção legítima ao export nomeado.
- Fontes via `next/font`, centralizadas em `packages/core/src/fonts/next-fonts.ts` (Inter + Space Grotesk) como CSS var.
- `next.config.ts` tipado com `NextConfig`; `transpilePackages: ['@agenda/core']` obrigatório.
- Nunca `pages/`, nunca `getServerSideProps`.
- **Sem Server Actions e sem Route Handlers neste repo.** Toda leitura/escrita é client-side sobre Supabase. Se um dia precisar de segredo de servidor, ele **não** pode passar por `NEXT_PUBLIC_*` — peça autorização e desenhe a rota antes.
- `revalidatePath`/`revalidateTag` não se aplicam: invalidação é `queryClient.invalidateQueries`.

### Tailwind CSS v4 — https://tailwindcss.com/docs

- **Não existe `tailwind.config.js` e não deve passar a existir.** Tema em `@theme` dentro do `globals.css` de cada app:
  ```css
  @import 'tailwindcss';

  @theme {
    --color-primary: #1dd75e;
    --color-muted-foreground: #a6a6a6;
    --font-heading: var(--font-space-grotesk), system-ui, sans-serif;
    --shadow-neon: 0 10px 40px -10px hsl(141 76% 48% / .45);
  }
  ```
- PostCSS: só `@tailwindcss/postcss`.
- **Token semântico, nunca literal entre colchetes:** `bg-primary`, `font-heading`, `shadow-neon`, `text-muted-foreground` — não `bg-[#1dd75e]`.
- Variantes derivadas usam `@theme inline` (os quatro gradientes do web-client: `--gradient-primary`, `--gradient-night`, `--gradient-card`, `--gradient-promo`).
- Mobile importa por camada (`tailwindcss/theme.css`, `preflight.css`, `utilities.css`) e usa `@media android` / `@media ios`. Cores em **hex**, não `hsl()` moderno — o runtime não parseia.

### NativeWind 5 preview / react-native-css

- Componentes com `className` vêm de `apps/mobile/src/tw/`, não de `react-native`.
- Props sem `className` (cor de ícone, `tintColor`) leem `apps/mobile/src/theme/colors.ts`.
- `react-native-css` está em nightly **com patch**. Não atualize a versão sem autorização — o patch quebra.

### TanStack Query v5 — https://tanstack.com/query/latest

- `isPending` para estado inicial; `gcTime`, não `cacheTime`.
- `onSuccess`/`onError` **só em `useMutation`**. Em `useQuery` foram removidos — trate com `error` + `getFriendlyErrorMessage`.
- `useSuspenseQuery` **não é usado** — não introduza sem autorização (exigiria boundary de Suspense em telas que hoje tratam `isPending` inline).
- Key **sempre** da factory:
  ```typescript
  useQuery({
    queryKey: catalogKeys.events.owned(establishmentId ?? ''),
    queryFn: () => listOwnedEvents(establishmentId ?? ''),
    enabled: Boolean(establishmentId),
  });
  ```
- Invalidação por prefixo: `invalidateQueries({ queryKey: catalogKeys.events.root })` alcança `detail`, `byEstablishment`, `owned` e `attractions`.
- **Segurança do cache persistido:** o cache vai para localStorage/AsyncStorage — armazenamento **não criptografado**. Por isso `PERSIST_ALLOWLIST` só admite catálogo público (`events`, `establishments`, `music-styles`, `cities`, `notifications`) e `shouldDehydrateQuery` rejeita o resto. **Nunca adicione ao allowlist uma key com dado pessoal ou de sessão.**
- Mudou o shape persistido? **Incremente `CACHE_BUSTER`** em `services/cachePolicy.ts` (hoje `'v2'`) — a rehidratação não passa pelo Zod, então `.default([])` não preenche campo ausente e o cache velho chega incompleto à UI.

### Zustand 5 — https://zustand.docs.pmnd.rs

- `create<State>()((set) => ...)`, atualização por spread.
- Persistência com `appJsonStorage` + `registerRehydrator` — nunca `createJSONStorage(() => localStorage)` direto (quebraria no mobile).
- Seletor atômico sempre. Sem token/PII persistidos.

### Zod 3.23.8 — https://zod.dev

- API v3: `z.string().email()`, `z.string().uuid()`, `.datetime()`, `z.enum([...])`. **Não** escreva API de Zod 4 (`z.email()`).
- Tipo derivado do schema, nunca interface duplicada:
  ```typescript
  export const eventStatusSchema = z.enum(['draft', 'published']);
  export type EventStatus = z.infer<typeof eventStatusSchema>;
  ```
- Reuso por composição: `establishmentWriteSchema` deriva de `establishmentSchema`; `eventWriteSchema` é `eventSchema.partial({ id: true })`. Prefira `.extend()`/`.pick()`/`.omit()`/`.partial()` a redeclarar campos.
- **Mass assignment:** o comportamento padrão do Zod v3 é **strip** — campos não declarados são descartados no parse. É o que queremos. **Nunca use `.passthrough()`** em schema de escrita: deixaria o cliente injetar coluna arbitrária no payload. `.strict()` é aceitável quando você quer falhar em vez de descartar.
- `safeParse` quando a falha é esperada e tratável na UI; `parse` dentro de service, onde o `catch` já roteia para `handleServiceError`.
- Campo de URL usa `.url()` (é o que garante que `banner_url`/`logo_url` não recebam `javascript:` ou path arbitrário).

### Supabase JS 2.106 — https://supabase.com/docs/reference/javascript

- Tipos gerados são fonte de verdade: `packages/core/src/types/database.types.ts` (`pnpm --filter @agenda/core gen:types`). Client sempre `SupabaseClient<Database>`.
- `createClient` **só** em `supabase/client.ts`; apps registram via `configureSupabase`.
- **Query builder sempre — proibida interpolação de string em SQL.** O builder parametriza; concatenar valor de usuário em `.filter()`/`rpc` textual reabre injeção.
- Erro do Postgrest: cheque `error` no destructuring e `throw` — o `catch` chama `handleServiceError`.
- `.maybeSingle()` quando ausência de linha é normal; `.single()` só quando ausência é erro.
- **RLS é obrigatória em tabela nova.** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies no mesmo commit. Tabela sem RLS com anon key pública = leitura/escrita aberta ao mundo.
- **RPC `SECURITY DEFINER`** só para operação que o usuário não pode fazer direto, e sempre agindo sobre `auth.uid()` — nunca sobre um id de usuário vindo por parâmetro (seria BOLA). Padrão real: `claim_establishment_owner` promove a conta autenticada, não uma conta arbitrária.
- `@supabase/ssr` **não é usado** — auth é client-side em todos os apps. Não introduza SSR de sessão sem autorização.
- **Escape hatch documentado:** quando `database.types.ts` está atrás do banco (coluna recém-migrada), o repo usa cast localizado e comentado, não `any` espalhado:
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

### Postgres / migrações — `supabase/migrations/`

- Nome `<timestamp>_snake_case.sql`. **Nunca edite migração já aplicada** — crie a próxima.
- SQL dinâmico usa `format()` com `%I`/`%1$I` para identificador (padrão real em `20260629120000_admin_profiles_and_write_rls.sql`), nunca concatenação.
- Função `SECURITY DEFINER` deve ler o papel a partir de `auth.uid()` e existir para quebrar recursão de RLS (`is_admin()`, `owns_establishment()`).
- Policy de leitura pública (`USING (true)`) é intencional no catálogo (bares e eventos são conteúdo público) — **não replique isso em tabela com dado de usuário**. Compare com `user_favorites`, `profiles` e `establishment_owners`, que restringem por `auth.uid()`.

### TypeScript 6 — https://www.typescriptlang.org/docs

- `satisfies` para validar objeto contra tipo sem perder inferência literal.
- `as const` em config; `import type` inline.
- `strict`, `isolatedModules`, `moduleResolution: 'Bundler'`, `target: 'ES2022'` — herde de `@agenda/typescript-config/base.json`, não redefina.
- **Cast inseguro banido.** `as` só para o escape hatch do Supabase acima e para narrowing comprovado. `unknown` exige type guard — o padrão do repo está em `utils/errors.ts` (`isPostgrestError`, `isAuthError`).

### Expo 56 / React Native 0.85 / Expo Router — https://docs.expo.dev

- Roteamento por arquivo em `apps/mobile/app/`; grupo `(tabs)`; `[id].tsx` para param.
- Deep link em `app/+native-intent.tsx` + `src/utils/deepLinks.ts`. **Deep link é entrada não confiável:** valide o parâmetro antes de navegar ou consultar (o repo já tem `nativeIntent.test.ts` e `deepLinks.test.ts` cobrindo isso).
- Sessão em `expo-secure-store` (Keychain/Keystore), não em AsyncStorage — não troque.
- Reanimated 4 + `react-native-worklets`.
- Versão do app tem **fonte única no `package.json`**; `app.config.ts` importa de lá.

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

**Feature flags** (`packages/core/src/config/features.ts`): tela bloqueada renderiza "Em construção"; liberar = trocar a flag. Hoje: `establishmentDetail`, `notifications`, `map` em `true`; `contentModeration` em `false` (implementado e testado, desligado por orçamento de fase). **Flag não é controle de segurança** — ela esconde UI, e a proteção do dado continua sendo a RLS.

---

## 8.1 📝 CHANGELOG Obrigatório em Cada Commit

**Todo commit** que altere código de um app/pacote **deve** incluir, nele mesmo, a descrição da mudança no CHANGELOG da versão seguinte daquele projeto. É a cada commit, não ao fim da tarefa. Esta é a única exceção à proibição de editar `.md` (Regra 9) — não precisa pedir autorização.

**A IA é a única fonte deste arquivo.** `scripts/build-mobile.bash` apenas compila; se a IA não escrever, o release sai sem notas.

| Mudança em | CHANGELOG a atualizar |
|---|---|
| `apps/mobile/` | `apps/mobile/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/web/` | `apps/web/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/web-client/` | `apps/web-client/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/admin/` | `apps/admin/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `apps/landing/` | `apps/landing/CHANGELOG-<branch>-v<próxima-versão>.md` |
| `packages/core/` | `packages/core/CHANGELOG-<branch>-v<próxima-versão>.md` |

Commit que toca mais de um projeto atualiza o CHANGELOG de **cada** um, na perspectiva daquele projeto.

O arquivo é sempre da **versão imediatamente posterior** à do `package.json` (patch, salvo instrução explícita):

```txt
apps/web-client/package.json → "version": "0.0.1"
                            ↓
arquivo: apps/web-client/CHANGELOG-alfa-v0.0.2.md
heading: # Changelog 0.0.2 (alfa)
```

**Durante os commits, não bumpe o `package.json`** — o bump acontece uma vez, ao abrir o PR para `alfa` (Seção 8.2).

Formato: `CHANGELOG-<branch>-v<version>.md` (`branch` = `alfa`/`beta`/`release`), heading `# Changelog <version> (<branch>)`, bullets curtos em pt-BR **na perspectiva do usuário final** — o conteúdo do mobile vai para a loja de apps.

**Acrescente, nunca sobrescreva.** Apagar bullet de commit anterior ainda não publicado é infração.

```markdown
# Changelog 0.0.2 (alfa)

- Painel do dono passa a listar eventos em rascunho junto dos publicados
- Busca de cidades no filtro volta a funcionar no Android e no iOS
```

Descreva o **efeito percebido**, não a implementação. **Nunca descreva detalhe explorável de vulnerabilidade corrigida** no CHANGELOG público — "Corrige falha ao salvar evento" basta; o detalhe fica no commit.

Não exigem CHANGELOG: mudanças restritas a `.md`, ao próprio CHANGELOG, a `scripts/` ou a configuração de CI.

---

## 8.2 🔖 Bump de Versão ao Abrir PR para `alfa`

**Quando o usuário pedir para abrir PR para `alfa`**, o patch de **cada app/pacote alterado na branch** sobe 1 no `package.json`, em commit próprio, **antes** do PR. O pedido de abrir o PR já é a autorização. A base padrão deste repo é **`alfa`**, não `main`.

1. `git diff --name-only alfa...HEAD` → mapeie para `apps/*` e `packages/*`.
2. Incremente o patch no `package.json` de cada projeto afetado. Nada mais — nenhum outro arquivo de versão, nenhum lockfile.
3. A versão deve coincidir com a do `CHANGELOG-<branch>-v<version>.md` que os commits alimentavam. Divergiu? O CHANGELOG é a fonte de verdade.
4. Commit isolado: `Bump <projeto> to <versão>` (ou `Bump versions for alfa release`).
5. Só então abra o PR.

**Bordas:** só patch (minor/major exigem instrução); só projetos tocados; só para `alfa`; não bumpe duas vezes; mudança sem CHANGELOG também não bumpa; **`git push` nunca sem pedido explícito.**

---

## 9. 🛑 Checklist Único de Desenvolvimento e Review (Zero Refactor & SOC 2)

Cada item é **bloqueante**. A IA roda este checklist internamente antes de entregar.

---

### 1. ❌ Secret, API key, senha ou private key hardcoded

- **Regra:** nenhuma credencial literal em código, teste, comentário ou `.md`. Env entra por `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*`, lida só no `lib/supabase.ts` do app. `service_role` key nunca entra em app cliente.
- **Correção:** "Remova o literal, leia da env do app e registre a variável no `.env.example` com placeholder."

```diff
- const client = createSupabaseClient({
-   url: 'https://xyzcompany.supabase.co',
-   anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dGVzdA.fake',
- });
+ const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
+ const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
+ const client = url && anonKey ? createSupabaseClient({ url, anonKey }) : null;
```

---

### 2. ❌ PII ou credencial em log / `ErrorContext.args`

- **Regra:** `args` é serializado inteiro no log. Aceita id opaco e metadado; **nunca** e-mail, telefone, CPF, senha ou token OTP. Lembre: `utils/masks.ts` formata para exibição, **não** faz redaction.
- **Correção:** "Remova o campo sensível de `args`; mantenha só identificador opaco, ou use apenas `method`."

```diff
  } catch (error) {
    return handleServiceError(error, {
      method: 'auth.verifyEmailOtp',
-     args: { email, token },
    });
  }
```

---

### 3. ❌ Exceção bruta, stack trace ou erro de banco exposto na UI

- **Regra:** UI só exibe `getFriendlyErrorMessage(error)`. `PostgrestError.message`/`details`/`hint` expõem tabela, coluna e constraint.
- **Correção:** "Troque a mensagem crua pelo mapeamento seguro de `getFriendlyErrorMessage`."

```diff
- {error && <p className="text-danger">{(error as Error).message}</p>}
+ {error && <p className="text-danger">{getFriendlyErrorMessage(error)}</p>}
```

---

### 4. ❌ BOLA/IDOR: escrita nova sem policy RLS ou RPC correspondente

- **Regra:** autorização é RLS avaliada com `auth.uid()`. Guard de UI é UX. Escrita nova sem policy/RPC no mesmo commit é vulnerabilidade. RPC `SECURITY DEFINER` age sobre `auth.uid()`, nunca sobre id vindo por parâmetro.
- **Correção:** "Adicione a policy (ou a RPC) na migração que acompanha esta escrita e referencie-a no docblock do service."

```diff
  // services/owned-events.ts — escrita direta só é segura sob policy
+ // supabase/migrations/<timestamp>_owner_update_event_capacity.sql
+ CREATE POLICY owner_update_events ON public.events
+   FOR UPDATE USING (public.owns_establishment(establishment_id))
+   WITH CHECK (public.owns_establishment(establishment_id));

- -- ❌ RPC que aceita o dono como parâmetro — qualquer um passa qualquer id
- create function claim_owner(p_user_id uuid) ...
+ -- ✅ age sobre a sessão
+ create function claim_establishment_owner() ... update profiles ... where id = auth.uid();
```

---

### 5. ❌ Sintaxe/API obsoleta da versão instalada

- **Regra:** use a API da versão instalada, validada contra a doc oficial (Seção 8). `isLoading` inicial, `cacheTime`, `onSuccess` em `useQuery`, `tailwind.config.js`, `FlatList`, API de Zod 4 → proibidos.
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

### 6. ❌ Validação sem Zod, ou com `.passthrough()` / sem tratamento gracioso

- **Regra:** dado externo se valida com schema de `schemas/catalog.ts`, tipo por `z.infer`, composição por `.extend()`/`.pick()`/`.omit()`/`.partial()`. **`.passthrough()` proibido em schema de escrita** (mass assignment). `safeParse` quando a falha é tratável na UI.
- **Correção:** "Derive o tipo do schema, componha em vez de redeclarar e mantenha o strip padrão do Zod."

```diff
- interface EventWriteInput {
-   id?: string;
-   name: string;
-   startsAt: string;
- }
- export const eventWriteSchema = eventSchema.passthrough();
+ export const eventWriteSchema = eventSchema.partial({ id: true });
+ export type EventWriteInput = z.infer<typeof eventWriteSchema>;
```

---

### 7. ❌ Reportar débito antigo fora do diff (ou omitir regressão dentro dele)

- **Regra:** só o diff e seu impacto direto. Mas **toda** vulnerabilidade, quebra ou padrão defasado introduzido no trecho alterado DEVE ser reportado. As dívidas conhecidas da Seção 5 não entram em review a menos que o diff as toque.
- **Correção:** "Remova o apontamento sobre código pré-existente não tocado; reporte a regressão introduzida."

```diff
  // Review em apps/web-client/components/EventForm.tsx
- ❌ "auth.ts loga { email, token } em verifyEmailOtp."          (dívida conhecida, fora do diff)
- ❌ "DataTable.tsx do admin tem props sem memo."                (fora do diff)
+ ✅ "A remoção de `capacity` deixou `MAX_CAPACITY` órfão neste arquivo (linha 12)."
+ ✅ "O novo update em `events` não tem policy correspondente na migração."
```

---

### 8. ❌ Alterar arquivo/componente não solicitado sem pedir permissão

- **Regra:** mudança fora do pedido exige autorização prévia no chat, com o quê e o porquê.
- **Correção:** "Reverta a alteração colateral e peça autorização listando arquivo e motivo."

```diff
  // Pedido: ajustar o formulário de evento
  apps/web-client/components/EventForm.tsx        ✅ no escopo
- apps/web-client/components/ui/Button.tsx        ❌ não pedido — pedir antes
- apps/web/components/event/EventCard.tsx         ❌ não pedido — pedir antes
```

---

### 9. ❌ Comentário explicativo poluente

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

### 10. ❌ Instalar biblioteca sem confirmação, auditoria de CVE ou leitura da doc

- **Regra:** nenhuma dependência nova sem autorização; verifique CVE e nome exato (typosquatting); use `pnpm`. Não mexa em `pnpm.overrides` nem em `patchedDependencies`.
- **Correção:** "Reverta a dependência e resolva com `@agenda/core` ou com o que já está instalado."

```diff
- "dependencies": {
-   "date-fns": "^4.1.0"
- }
+ import { shiftDate } from '@agenda/core';
```

---

### 11. ❌ Tipo inseguro, cast forçado ou teste quebrado/desabilitado

- **Regra:** sem `any`, `@ts-ignore`, `@ts-nocheck`, `unknown` sem guard, `!` sem justificativa. Sem `skip`/delete de teste. Cast só no escape hatch documentado do Supabase.
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

### 12. ❌ Recriar utilitário ou primitiva de UI existente

- **Regra:** consulte a Seção 5 antes de escrever helper ou componente básico. Vale também para segurança: upload usa `uploadImage`, não `bucket.upload` solto.
- **Correção:** "Remova a duplicata e reutilize a versão de `@agenda/core` ou do `components/ui/` do app."

```diff
- <button onClick={handleSave} className="bg-[#1dd75e] px-4 py-2 rounded-lg text-black">
-   Salvar
- </button>
+ import { Button } from '@/components/ui/Button';
+ <Button onClick={handleSave}>Salvar</Button>

- const path = `events/${file.name}`;                    // ❌ nome vindo do usuário
- await client.storage.from('catalog-images').upload(path, file);
+ const url = await uploadImage(file, { pathPrefix: 'events' });
```

---

### 13. ❌ Log nativo em vez da abstração de erro

- **Regra:** `console.*` proibido em código novo. Use `handleServiceError` (service) ou `logErrorToTerminal` (log sem re-lance). UI mostra `getFriendlyErrorMessage`.
- **Correção:** "Troque o `console.*` pela abstração de erro do core."

```diff
  } catch (error) {
-   console.error('Erro ao salvar evento:', error);
-   throw error;
+   return handleServiceError(error, { method: 'ownedEvents.saveOwnedEvent' });
  }
```

---

### 14. ❌ Alteração/commit não autorizado de `.md` — ou ausência do CHANGELOG obrigatório

- **Regra:** não edite `.md` existente sem autorização. **Exceção obrigatória:** o CHANGELOG da versão seguinte de cada projeto tocado (Seção 8.1) — sua ausência num commit de código é a infração.
- **Correção:** "Reverta a edição não autorizada; acrescente (sem sobrescrever) o bullet no CHANGELOG da próxima versão de cada projeto afetado."

```diff
- README.md                                       ❌ editado sem pedir
+ apps/web-client/CHANGELOG-alfa-v0.0.2.md        ✅ obrigatório neste commit

  # Changelog 0.0.2 (alfa)

  - Painel do dono passa a listar eventos em rascunho junto dos publicados
+ - Formulário de evento aceita definir lotação máxima
```

---

### 15. ❌ Query key literal, escrita fora do service, `CACHE_BUSTER` desatualizado ou allowlist com dado sensível

- **Regra:** key do catálogo sempre de `catalogKeys` (local só sob Regra dos 3, como `panelKeys`); Supabase só no service; mudou shape persistido → incremente `CACHE_BUSTER`; `PERSIST_ALLOWLIST` só admite catálogo público (o storage não é criptografado).
- **Correção:** "Mova a chamada para um service, use a factory de key, atualize o `CACHE_BUSTER` e mantenha dado pessoal fora do allowlist."

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

  const PERSIST_ALLOWLIST: readonly string[] = [
    'events', 'establishments', 'music-styles', 'cities', 'notifications',
-   'profiles',                                  // ❌ dado pessoal em storage não criptografado
  ];
```

---

### 16. ❌ XSS, path traversal em upload ou URL de saída não validada

- **Regra:** `dangerouslySetInnerHTML`/`innerHTML`/`eval` banidos (o repo está em zero). Nome de arquivo de upload é gerado (`crypto.randomUUID()` + `EXT_BY_MIME`), nunca `file.name`. URL de saída se monta com os builders de `utils/links.ts` sobre base de env.
- **Correção:** "Renderize como texto, gere o nome do arquivo no service e monte a URL pelo builder com base de env."

```diff
- <div dangerouslySetInnerHTML={{ __html: event.description }} />
+ <p>{event.description}</p>

- const shareUrl = `${userProvidedHost}/event/${event.id}`;
+ const shareUrl = buildEventShareUrl({ slugOrId: event.id }, process.env.EXPO_PUBLIC_SHARE_BASE_URL);
```
