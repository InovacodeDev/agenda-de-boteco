# 📐 Diretrizes do Projeto & Regras de Code Review

## 0. 🚨 REGRAS DE OURO DA IA (DIRETRIZES INVIOLÁVEIS)

1. **DIRETRIZES DE ARQUIVOS MARKDOWN (`.md`):** A IA PODE criar novos arquivos `.md` caso seja necessário para a tarefa ou planejamento. No entanto, a IA NUNCA deve editar arquivos `.md` existentes nem commitar arquivos `.md` sem a solicitação ou autorização prévia e expressa do usuário. É proibida a inclusão de comentários extensos em bloco no código sem solicitação.
2. **PROIBIÇÃO DE NOVAS DEPENDÊNCIAS & CONSULTA À DOCUMENTAÇÃO:** A IA NUNCA deve instalar ou sugerir novos pacotes no arquivo de dependências do projeto (`package.json`) sem autorização prévia e expressa do usuário. Reutilize prioritariamente as bibliotecas e utilitários já existentes em `@agenda/core` (`lib/`, `utils/`, `services/`) e `@/lib/` / `@/utils/`. Se autorizada a instalar uma dependência nova, a IA deve **obrigatoriamente consultar a documentação oficial atualizada** da biblioteca antes de implementá-la, garantindo a aplicação das melhores práticas do ecossistema.
3. **RESPEITO ABSOLUTO AO FLUXO DA ARQUITETURA:** Respeite rigidamente o fluxo unidirecional de dados e a separação de responsabilidades da arquitetura detectada no repositório:
   $$\text{UI (Page/Component)} \longrightarrow \text{Custom Hook (TanStack Query)} \longrightarrow \text{Repository/Service} \longrightarrow \text{httpClient / SupabaseClient} \longrightarrow \text{API / DB}$$
4. **PRESERVAÇÃO DA TIPAGEM E MANUTENÇÃO DE CÓDIGO:** Em qualquer refatoração ou correção, NUNCA remova a tipagem estrita nem converta tipos ou retornos para tipos genéricos/inseguros (`any`, `unknown` não tratado, `@ts-ignore`, `@ts-nocheck`).
5. **EDIÇÃO CIRÚRGICA E LOCALIDADE DA MUDANÇA:** Modifique apenas o estritamente necessário para atender à solicitação. Não refatore código adjacente não relacionado sem permissão expressa do usuário.

---

## 1. Visão Geral da Arquitetura & Ecossistema

O **Agenda de Boteco** é um monorepo gerenciado com **pnpm workspaces** e **Turborepo**. O ecossistema é construído sobre **TypeScript (modo estrito)** e dividido em clientes frontend especializados e um núcleo compartilhado agnóstico:

- **`packages/core` (`@agenda/core`):** Pacote TypeScript puro, platform-agnostic. Contém schemas Zod, tipos gerados do Supabase, camada de serviços/repositórios de catálogo e autenticação, política de cache, geolocalização PostGIS, gerenciadores de storage, factories de query keys, stores Zustand e utilitários globais.
- **`apps/mobile`:** Aplicativo móvel e web estático (SSG) desenvolvido em **Expo (v56)** com **Expo Router**, estilização via **NativeWind** (Tailwind CSS em React Native) e listas de alta performance com `FlashList`.
- **`apps/web`:** Aplicação web consumidor principal em **Next.js (App Router)** com foco em SEO e renderização otimizada.
- **`apps/admin`:** Painel administrativo web em **Next.js / Vite** para gestão de estabelecimentos, eventos e notificações.
- **`apps/landing`:** Landing page institucional em **Next.js**.

### Árvore de Diretórios e Responsabilidades

```txt
agenda-de-boteco/
├── apps/
│   ├── admin/                 # Painel administrativo web (Next.js / Vite + shadcn/ui)
│   │   ├── app/               # Rotas e páginas do App Router (Next.js)
│   │   ├── components/        # Componentes visuais exclusivos do admin
│   │   └── lib/               # Clientes e utilitários específicos do admin
│   ├── landing/               # Landing page institucional (Next.js)
│   │   ├── app/               # Rotas e seções da landing page
│   │   └── components/        # Componentes visuais da landing page
│   ├── mobile/                # App mobile (iOS/Android/Web via Expo v56)
│   │   ├── app/               # File-system routing com Expo Router
│   │   └── src/
│   │       ├── components/    # UI components, layout e primitivas do app mobile
│   │       ├── config/        # Configurações locais (ambientes, constantes)
│   │       ├── hooks/         # Hooks locais específicos do mobile
│   │       ├── screens/       # Views e telas principais do aplicativo
│   │       └── utils/         # Helpers locais de UI e navegação mobile
│   └── web/                   # Aplicação web pública consumidor (Next.js)
│       ├── app/               # Páginas e rotas (App Router, SEO-optimized)
│       ├── components/        # Componentes de feed, filtros, mapas e UI web
│       ├── hooks/             # Custom hooks web
│       └── lib/               # Otimizações web, SEO e helpers locais
├── packages/
│   ├── core/                  # Biblioteca compartilhada platform-agnostic (@agenda/core)
│   │   └── src/
│   │       ├── config/        # Configurações de feature flags e stores
│   │       ├── data/          # Mocks, lookups e fixture data
│   │       ├── hooks/         # Custom hooks agnósticos (queries TanStack)
│   │       ├── lib/           # Instâncias de QueryClient e QueryPersister
│   │       ├── platform/      # Storage abstraction adaptado para cada runtime
│   │       ├── queries/       # Camada pura de busca de dados (catalog)
│   │       ├── schemas/       # Schemas Zod de validação de dados
│   │       ├── services/      # Camada de repositórios/serviços (catalog, auth, realtime)
│   │       ├── stores/        # Stores Zustand (Auth, Favorites, Filters, Notifications)
│   │       ├── supabase/      # Factory do cliente Supabase e adaptadores de storage
│   │       ├── theme/         # Design tokens (colors, gradients, shadows, typography)
│   │       ├── types/         # Definição de tipos TypeScript e Database Supabase
│   │       └── utils/         # Utilitários compartilhados (cn, dates, errors, geo, etc.)
│   └── typescript-config/     # Configurações de tsconfig compartilhadas no monorepo
├── scripts/                   # Scripts de automação e manutenção
└── supabase/                  # Migrações SQL, schemas e funções RPC PostGIS
```

---

## 2. Convenções e Estilo de Código

### Nomenclatura de Arquivos e Símbolos
- **Padrão de Arquivos:** `kebab-case` obrigatório para todos os arquivos e diretórios.
- **Sufixos Explícitos por Camada:**
  - Repositórios e Serviços: `*.repository.ts` ou `*.service.ts` (ex: `catalog.service.ts`, `auth.service.ts`)
  - Modelos e Interfaces: `*.model.ts` (ex: `establishment.model.ts`)
  - DTOs e Schemas Zod: `*.dto.ts` ou `*.schema.ts` (ex: `event.schema.ts`)
  - Stores Zustand: `*.store.ts` ou `use-*.ts` / `use*.ts` (ex: `useAuthStore.ts`, `use-filters.store.ts`)
  - Custom Hooks: `use-*.ts` (ex: `use-active-city.ts`, `use-nearby-establishments.ts`)
  - Rotas e Páginas: `*-route.tsx` ou `*-page.tsx` (ex: `event-detail-page.tsx`)
  - Factories de Query Keys: `*-query-keys.ts` ou `queryKeys.ts`
  - Testes Unitários: `*.test.ts` ou `*.test.tsx` (ex: `dates.test.ts`, `auth.service.test.ts`)
- **Classes, Tipos e Interfaces:** `PascalCase` (ex: `SupabaseStorageAdapter`, `ErrorContext`).
- **Funções e Métodos:** `camelCase` (ex: `getFriendlyErrorMessage`, `coarseLatLng`).
- **Constantes Globais:** `UPPER_SNAKE_CASE` ou objetos imutáveis com `as const` (ex: `catalogKeys`).

### Tipagem, Null Safety e Imutabilidade
- **Strict Mode:** `strict: true` ativado em todos os `tsconfig.json`.
- **Tratamento de Nulos (*Null Safety*):** Trate explicitamente valores `null` e `undefined` via optional chaining (`?.`), nullish coalescing (`??`) ou type guards. Proibido o operador de asserção não-nula (`!`) sem justificativa inquestionável.
- **Imutabilidade:** Utilize objetos imutáveis com `as const` para constantes de configuração e `Readonly<T>` para propriedades de estado que não devem sofrer mutação direta.
- **Sintaxe de Importação de Tipos:** Sempre utilize `import type` para importar interfaces, tipos e aliases:
  ```typescript
  import type { Event, Establishment } from '@agenda/core';
  import type { SupabaseClient } from '@supabase/supabase-js';
  ```

---

## 3. Arquitetura, Fluxo de Dados e Responsabilidades

A aplicação respeita uma pipeline de dados unidirecional estrita:

$$\text{UI / Entry Point} \longrightarrow \text{State / Logic Controller} \longrightarrow \text{Repository / Service} \longrightarrow \text{HTTP Client / Data Source} \longrightarrow \text{External API / DB}$$

### Divisão Estrita de Responsabilidades

1. **UI / Entry Point (Pages, Screens & Components):** Responsável apenas por renderização visual e tratamento de eventos de interação do usuário. É proibido realizar chamadas diretas a APIs, banco de dados ou manipular instâncias de clientes HTTP dentro de componentes visuais.
2. **State & Custom Hooks (TanStack Query & Mutations):** Encapsulam requisições assíncronas, oferecendo estado reativo (`data`, `isLoading`, `error`, `refetch`) para a UI. Chaves de consulta DEVEM ser geradas obrigatoriamente por factories hierárquicas (`catalogKeys`).
3. **Repository / Service Layer (`@agenda/core/services`):** Contém as regras de negócio, transformações de DTOs, chamadas ao Supabase/HTTP Client e validações com Zod.
4. **HTTP Client & Supabase Client (`@agenda/core/supabase`):** Instância centralizada e adaptada à plataforma (`createSupabaseClient`), responsável por comunicação remota, renovação de tokens e persistência de sessão via adapters.
5. **Estado Local/Sessão do Cliente (Zustand):** Reservado estritamente para estado de UI local ou sessão do cliente (`useAuthStore`, `useFiltersStore`, `usePreferencesStore`). Dados de servidor pertencem ao TanStack Query.
6. **Internacionalização (i18n):** Nenhuma string visível ao usuário deve ser estática ou hardcoded no código. Utilize sempre a função `t()` do sistema de i18n.

---

## 4. Tratamento de Erros, Logging e Catálogo de Utilitários

### Tratamento de Exceções e Respostas Amigáveis
- **Mapeamento Centralizado:** Exceções em serviços ou chamadas remotas devem ser tratadas pelas abstrações de erro do core (`logErrorToTerminal`, `getFriendlyErrorMessage`, `handleServiceError`).
- **Sanitização de Mensagens para Usuários:** Mensagens brutas de banco de dados (SQL, PostgrestError) nunca devem ser expostas na UI. Converta-as utilizando `getFriendlyErrorMessage(error)`.

### Proibição de Logs Nativo Direto
- É estritamente proibido o uso de `console.log`, `console.warn` ou `console.error` diretos no código da aplicação ou no core.
- Todo log deve utilizar a abstração centralizada `logErrorToTerminal` (que inclui contexto estruturado para debugging e suporte a ambiente).

---

### Catálogo de Utilitários Globais e Primitivas Reutilizáveis

Antes de escrever qualquer nova função helper ou componente visual, **é obrigatório consultar e reutilizar** os módulos já consolidados no projeto:

#### Módulos e Utilitários (`@agenda/core`)

1. **`cn(...inputs)`** (`@agenda/core/utils/cn`): Fusão de classes CSS/Tailwind/NativeWind com `clsx` e `tailwind-merge`.
2. **`dates`** (`@agenda/core/utils/dates`): Utilitários para formatação, comparação e manipulação de datas e horários.
3. **`env`** (`@agenda/core/utils/env`): Leitura segura de ambiente com `isProduction()`, sem dependência direta do runtime Node.js.
4. **`errors`** (`@agenda/core/utils/errors`): Tratamento e log de erros (`logErrorToTerminal`, `getFriendlyErrorMessage`, `handleServiceError`).
5. **`events`** (`@agenda/core/utils/events`): Validação de status de eventos e atração de público.
6. **`filters`** (`@agenda/core/utils/filters`): Lógica e ordenação de filtros do catálogo de bares e eventos.
7. **`format`** (`@agenda/core/utils/format`): Formatação de valores monetários, telefones e documentos.
8. **`geo`** (`@agenda/core/utils/geo`): Cálculo de distâncias, raio de busca e arredondamento de coordenadas (`coarseLatLng`).
9. **`images`** (`@agenda/core/utils/images`): Tratamento de URLs de imagens e fallbacks visuais.
10. **`links`** (`@agenda/core/utils/links`): Geração de links profundos (deep links) e URLs amigáveis.
11. **`masks`** (`@agenda/core/utils/masks`): Máscaras de entrada para inputs de texto (telefone, CEP, CPF/CNPJ).
12. **`platform`** (`@agenda/core/utils/platform`): Identificação de plataforma (`isWeb`, `isNative`).
13. **`pressGuard`** (`@agenda/core/utils/pressGuard`): Proteção contra cliques duplos/múltiplos disparados em sequência rápida.
14. **`responsiveType`** (`@agenda/core/utils/responsiveType`): Cálculo responsivo de tipografia.
15. **`slug`** (`@agenda/core/utils/slug`): Utilitário para geração de slugs amigáveis para SEO e URLs.
16. **`catalogKeys`** (`@agenda/core/services/queryKeys`): Factory centralizada de query keys hierárquicas.
17. **`createSupabaseClient` / `configureSupabase`** (`@agenda/core/supabase/client`): Factory e gerenciador de clientes Supabase por plataforma.

#### Primitivas de UI do Design System (`@/components/ui/` ou `apps/mobile/src/components/ui/`)

18. **`GradientBadge`**: Destaque visual com gradiente do tema.
19. **`SectionLabel`**: Rótulo padrão para divisão de seções.
20. **`SegmentedTabs`**: Navegação por abas segmentadas.
21. **`Button`**: Botão primário/secundário padronizado com suporte a estados de carregamento.
22. **`Chip`**: Tag interativa para filtros e categorias.
23. **`CircleIconButton`**: Botão circular para ações secundárias.
24. **`ConfirmDialog`**: Modal padronizado para confirmações do usuário.
25. **`EmptyState`**: Componente padrão para telas ou listas sem dados.
26. **`GuardedPressable`**: Componente de clique com proteção nativa contra toques duplos.
27. **`InfoCard`**: Card padrão para apresentação de informações organizadas.
28. **`OfflineBanner`**: Banner exibido quando o dispositivo está offline.
29. **`RatingStars`**: Exibição de pontuação e avaliações em estrelas.
30. **`Icon` / `iconMap` / `icons`**: Conjunto de ícones do Design System.

---

## 5. Segurança, Performance e Testes

### Segurança e Variáveis de Ambiente
- **Leitura Estrita:** A leitura de variáveis de ambiente deve ser realizada exclusivamente através dos utilitários em `@agenda/core/utils/env` ou no arquivo de ambiente seguro de cada app (`EXPO_PUBLIC_*` no Expo, `VITE_*` no Vite/Admin, `NEXT_PUBLIC_*` no Next.js).
- **Proibição de Escrita em `.env.*`:** Arquivos `.env.*` NUNCA devem ser editados ou criados automaticamente por IAs sem solicitação prévia expressa do usuário.
- **Row Level Security (RLS):** A segurança real de dados é garantida no banco Supabase via RLS. Consultas devem respeitar os papéis de usuário (`auth.uid()`).

### Regras de Performance em React e React Native
- **Evitar Chamadas Síncronas em `useEffect`:** NUNCA execute chamadas síncronas diretas de `setState` dentro do corpo principal de um `useEffect`. Utilize a função `queueMicrotask`:
  ```typescript
  useEffect(() => {
    queueMicrotask(() => {
      setLocalState(newValue);
    });
  }, [newValue]);
  ```
- **Exportações Nomeadas:** Todos os componentes, hooks e utilitários devem utilizar exportações nomeadas (`export function ComponentName() {}`), evitando `export default` (exceto em rotas de frameworks baseados em sistema de arquivos).
- **Listas Longas em React Native:** Em `apps/mobile`, utilize sempre `FlashList` (`@shopify/flash-list`) em vez do `FlatList` nativo.
- **Cancelamento de Requisições:** Passe o `signal` do TanStack Query (`queryFn: ({ signal }) => fetcher(signal)`) para cancelamento de requisições pendentes ao desmontar componentes.

### Testes Unitários e Regressão de Contrato
- **Testes Obrigatórios para Services e Utils:** É obrigatória a criação e atualização de testes unitários (`*.test.ts`/`*.test.tsx`) para qualquer alteração em arquivos sob `services/` ou `utils/`.
- **Testes como Fonte de Verdade:** Refatorações e otimizações devem manter 100% de regressão comportamental. Se uma função recebe uma `string` e retorna um `number`, ela deve continuar retornando exatamente o mesmo tipo e o mesmo valor para os parâmetros testados.

---

## 6. 🧠 Protocolo Cognitivo de Raciocínio da IA

Antes de escrever ou alterar qualquer linha de código no repositório, a IA deve obrigatoriamente aplicar o seguinte protocolo mental:

1. **Mapeamento de Impacto:** Rastreie a árvore de dependências. Quais componentes, hooks ou testes dependem da função ou tipo que será modificado?
2. **Checagem de Reuso:** Verifique o **Catálogo de Utilitários Globais e Primitivas** (Seção 4). Existe algum helper (`dates`, `geo`, `cn`, `masks`, `format`) ou componente (`Button`, `EmptyState`, `GuardedPressable`) que já resolve o problema?
3. **Regra de Co-localização vs Abstração (Regra dos 3):**
   - Se uma função ou tipo é utilizado em apenas **1 único componente/arquivo**, mantenha-o co-localizado no mesmo arquivo ou na pasta local.
   - Se for utilizado em **2 lugares**, mantenha local na pasta do módulo.
   - Apenas abstraia para `@agenda/core/utils` ou `@agenda/core/services` se houver reutilização comprovada em **3 ou mais lugares** no monorepo.

---

## 7. 🎨 Padrões Idiomáticos Avançados da Stack Detectada

### Discriminated Unions e Type Guards
Utilize uniões discriminadas com propriedades tagged para gerenciar múltiplos estados ou retornos de erros de forma type-safe:
```typescript
type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function processResult(result: OperationResult<Event>) {
  if (result.success) {
    // result.data é tipado estritamente como Event
    logEvent(result.data.title);
  } else {
    // result.error é tipado estritamente como string
    logErrorToTerminal(new Error(result.error), { method: 'processResult' });
  }
}
```

### Pattern Matching Idiomático
Substitua múltiplos `if-else` ou `switch` legados por seletores de dicionário ou `switch(true)`:
```typescript
const STATUS_COLORS: Record<EventStatus, string> = {
  published: 'bg-green-500',
  draft: 'bg-yellow-500',
  cancelled: 'bg-red-500',
};

const badgeColor = STATUS_COLORS[event.status] ?? 'bg-gray-500';
```

### Query Key Factories e Invalidação Granular
Consuma obrigatoriamente as factories de query keys (`catalogKeys`) para garantir invalidação hierárquica por prefixo:
```typescript
import { catalogKeys } from '@agenda/core';
import { useQuery } from '@tanstack/react-query';

export function useEstablishmentDetail(id: string) {
  return useQuery({
    queryKey: catalogKeys.establishments.detail(id),
    queryFn: () => getEstablishment(id),
  });
}
```

### Seletores Atômicos Zustand
Ao consumir stores do Zustand, utilize seletores atômicos para prevenir re-renders desnecessários:
```typescript
// ❌ Re-renderiza em qualquer mudança do estado global de auth
const authStore = useAuthStore();

// ✅ Re-renderiza exclusivamente se a propriedade 'user' for alterada
const user = useAuthStore((state) => state.user);
```

### Inferência Automática de Schemas Zod
Evite duplicar definições de interfaces manuais quando houver schema Zod correspondente:
```typescript
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(3),
  startDate: z.string().datetime(),
  establishmentId: z.string().uuid(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
```

---

## 8. 🛑 Checklist Bloqueante para Code Reviews & Guias de Correção

Abaixo estão listadas as 10 infrações bloqueantes. Qualquer alteração de código que violar um destes itens deve ter seu merge/commit **imediatamente bloqueado** até a aplicação da devida correção.

---

### 1. ❌ Violação de acoplamento ou chamada direta a cliente HTTP/Banco fora da camada apropriada

- **Regra:** A camada de UI ou hooks nunca deve chamar `fetch`, `axios` ou clientes de API/banco diretamente. Toda comunicação remota deve ser encapsulada na camada de repositório/serviço (`packages/core/src/services`).
- **Prompt para Solução:** "Mova a chamada HTTP/API da view para um método dedicado na camada de repositório (`@agenda/core/services`) e consuma-o via Custom Hook do TanStack Query."
- **Preview da Mudança (Diff):**

```diff
// ❌ Na tela ou componente visual (UI)
- useEffect(() => {
-   fetch('/api/events').then(res => res.json()).then(setEvents);
- }, []);

// ✅ Na camada de UI (usando Hook + Service do core)
+ const { data: events, isLoading } = useEventsQuery();
```

---

### 2. ❌ Uso de tipos genéricos/burlar o sistema de tipos da linguagem (`any`, `@ts-ignore`, `@ts-nocheck`)

- **Regra:** É proibida a utilização de `any`, anotações de supressão de tipo (`@ts-ignore`, `@ts-nocheck`) ou coerção insegura de tipos.
- **Prompt para Solução:** "Substitua a anotação `any` ou `@ts-ignore` pela interface/tipo TypeScript estrito correto importado via `import type`."
- **Preview da Mudança (Diff):**

```diff
// ❌ Uso de any ou ts-ignore
- const handleSelect = (item: any) => {
-   // @ts-ignore
-   console.log(item.name);
- };

// ✅ Tipagem estrita
+ import type { EventItem } from '@agenda/core';
+ const handleSelect = (item: EventItem) => {
+   logSelectedEvent(item.name);
+ };
```

---

### 3. ❌ Violação de internacionalização / Strings estáticas na UI sem `t()`

- **Regra:** Nenhuma string exibida diretamente ao usuário na interface pode ser estática (hardcoded). Todas devem utilizar a função de internacionalização `t()`.
- **Prompt para Solução:** "Extraia a string estática para o arquivo de dicionário i18n e utilize a chamada `t('chave_da_mensagem')` no componente."
- **Preview da Mudança (Diff):**

```diff
// ❌ String estática na UI
- <Text>Confirmar Presença</Text>

// ✅ String via i18n
+ <Text>{t('events.confirm_presence')}</Text>
```

---

### 4. ❌ Identificadores, chaves ou rotas declaradas em formato hardcoded (fora de enum, constantes ou factories)

- **Regra:** É proibido declarar query keys com arrays ou strings soltas (ex: `['events', id]`). Utilize sempre as factories de query keys em `catalogKeys`.
- **Prompt para Solução:** "Substitua o array literal de query key pela chamada correspondente na factory `catalogKeys` de `@agenda/core`."
- **Preview da Mudança (Diff):**

```diff
// ❌ Query key solta em array literal
- useQuery({ queryKey: ['events', eventId], queryFn: () => getEvent(eventId) });

// ✅ Query key via factory centralizada
+ import { catalogKeys } from '@agenda/core';
+ useQuery({ queryKey: catalogKeys.events.detail(eventId), queryFn: () => getEvent(eventId) });
```

---

### 5. ❌ Uso de prints/logs nativos em vez do `logger` centralizado

- **Regra:** Uso direto de `console.log`, `console.warn` ou `console.error` é proibido. Utilize os utilitários de erro e logging de `@agenda/core/utils/errors`.
- **Prompt para Solução:** "Remova as chamadas diretas a `console.*` e utilize a abstração `logErrorToTerminal` ou o serviço de logger do projeto."
- **Preview da Mudança (Diff):**

```diff
// ❌ Console.log direto
- console.log('Erro ao carregar catálogo:', error);

// ✅ Logger centralizado do core
+ import { logErrorToTerminal } from '@agenda/core';
+ logErrorToTerminal(error, { method: 'fetchCatalog' });
```

---

### 6. ❌ Manipulação inadequada de estado ou efeito colateral assíncrono sem tratamento de ciclo de vida (`setState` síncrono em `useEffect`)

- **Regra:** A atualização de estado dentro de um `useEffect` deve ser agendada via `queueMicrotask` para evitar re-renderizações síncronas em cascata e alertas de concorrência do React.
- **Prompt para Solução:** "Envolva a chamada do `setState` dentro de `queueMicrotask(() => { ... })` no corpo do `useEffect`."
- **Preview da Mudança (Diff):**

```diff
// ❌ setState síncrono no corpo do useEffect
- useEffect(() => {
-   setFilteredList(filterItems(items, query));
- }, [items, query]);

// ✅ setState agendado em queueMicrotask
+ useEffect(() => {
+   queueMicrotask(() => {
+     setFilteredList(filterItems(items, query));
+   });
+ }, [items, query]);
```

---

### 7. ❌ Edição ou leitura direta não autorizada em arquivos de configuração de ambiente (`.env`, secrets, etc.)

- **Regra:** Arquivos de variáveis de ambiente (`.env`, `.env.example`, `.env.local`) não devem ser modificados ou criados automaticamente sem solicitação e autorização prévia expressa do usuário.
- **Prompt para Solução:** "Reverta alterações em arquivos `.env.*` e solicite autorização ao usuário para definir as variáveis de ambiente necessárias."
- **Preview da Mudança (Diff):**

```diff
// ❌ Modificar .env sem autorização
- EXPO_PUBLIC_NEW_API_KEY=secret_key_123

// ✅ Consumir via utilitário de ambiente seguro existente
+ import { isProduction } from '@agenda/core';
```

---

### 8. ❌ Nomenclatura de arquivos ou classes fora da convenção da stack

- **Regra:** Arquivos devem obrigatoriamente seguir o padrão `kebab-case` com sufixos por camada, e importações de tipo devem utilizar `import type`.
- **Prompt para Solução:** "Renomeie o arquivo para utilizar `kebab-case` com o sufixo apropriado da camada e ajuste as importações para `import type`."
- **Preview da Mudança (Diff):**

```diff
// ❌ Nome de arquivo CamelCase e importação sem type
// Arquivo: EventRepository.ts
- import { Event, Establishment } from './types';

// ✅ Nome em kebab-case com sufixo da camada e import type
// Arquivo: event.repository.ts
+ import type { Event, Establishment } from './types';
```

---

### 9. ❌ Recriação de utilitários ou componentes primitivos já existentes no codebase

- **Regra:** É proibido reimplementar funções utilitárias ou componentes visuais básicos que já existam em `@agenda/core` ou no Design System (`@/components/ui/`).
- **Prompt para Solução:** "Remova o utilitário/componente duplicado e reutilize a versão existente de `@agenda/core` (`cn`, `dates`, `geo`, `format`, `slug`, `masks`, etc.) ou `@/components/ui/` (`Button`, `EmptyState`, `ConfirmDialog`, `GuardedPressable`, etc.)."
- **Preview da Mudança (Diff):**

```diff
// ❌ Marcação de botão duplicada
- <TouchableOpacity onPress={handlePress} className="bg-primary p-4 rounded-lg">
-   <Text>Salvar</Text>
- </TouchableOpacity>

// ✅ Reutilização do componente primitivo do Design System
+ import { Button } from '@/components/ui/Button';
+ <Button label={t('common.save')} onPress={handlePress} />
```

---

### 10. ❌ Modificação ou commit não autorizado de arquivos `.md` ou instalação não autorizada de dependências

- **Regra:** A IA nunca deve editar arquivos `.md` existentes nem instalar novos pacotes via `package.json` sem autorização prévia e expressa do usuário. Caso autorizada a instalação, a documentação oficial da dependência deve obrigatoriamente ser consultada.
- **Prompt para Solução:** "Cancele a edição do arquivo `.md` ou a instalação do pacote e solicite a autorização expressa do usuário antes de prosseguir."
- **Preview da Mudança (Diff):**

```diff
// ❌ Adicionar pacote sem autorização no package.json
- "dependencies": {
-   "axios": "^1.7.0"
- }

// ✅ Utilizar as dependências e clientes de transporte já existentes no core (@agenda/core / Supabase)
+ import { getConfiguredSupabase } from '@agenda/core';
```
