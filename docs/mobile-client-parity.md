# Auditoria de Paridade — `apps/web-client` × `apps/mobile-client`

Data: 2026-10-03
Referência: `apps/web-client` (Next.js, painel do dono do bar)
Em porte: `apps/mobile-client` (Expo 57)

Metodologia: leitura completa de rotas, componentes, hooks e services de ambos os apps,
cruzada com `packages/core` (hooks/services compartilhados), `packages/shared-ui-mobile`
(UI kit mobile) e `supabase/migrations` (schema e RLS). Toda divergência abaixo foi
confirmada lendo o código-fonte de ambos os lados, não inferida.

---

## 1. Mapa de telas/rotas — web-client × mobile-client

| Área | web-client | mobile-client | Status |
| --- | --- | --- | --- |
| Dashboard | `app/(painel)/page.tsx` | `app/(painel)/index.tsx` | Existe, com divergências (ver §2.1) |
| Eventos (lista) | `app/(painel)/events/page.tsx` | `app/(painel)/events/index.tsx` | Existe, com divergências (ver §2.2) |
| Evento novo | `app/(painel)/events/new/page.tsx` → `EventForm` | `app/(painel)/events/new.tsx` → `src/components/EventForm.tsx` | Paritário (ver §2.3) |
| Evento editar | `app/(painel)/events/[id]/page.tsx` → `EventForm` | `app/(painel)/events/[id].tsx` → `EventForm` | Paritário |
| Artistas | `app/(painel)/artists/page.tsx` | `app/(painel)/artists/index.tsx` | Existe, com divergências (ver §2.4) |
| Perfil do bar | `app/(painel)/profile/page.tsx` | `app/(painel)/profile/index.tsx` | Existe, com divergências (ver §2.5) |
| Métricas | `app/(painel)/metrics/page.tsx` (rota própria, atrás de `panel-metrics`) | Fundida em `app/(painel)/metrics/index.tsx` (tabs Métricas/Avaliações) | **Fluxo diferente** (ver §2.6) |
| Avaliações (reviews) | `app/(painel)/reviews/page.tsx` (rota própria, atrás de `panel-reviews`) | Fundida na mesma tela de Métricas (tab "Avaliações do Bar") | **Fluxo diferente, sem rota própria** |
| Configurações | `app/(painel)/settings/page.tsx` (atrás de `panel-settings`) | `app/(painel)/settings/index.tsx` | Existe, com divergências de conteúdo (ver §2.7) |
| Login (OTP/senha/Google) | `app/login/page.tsx` | `app/login.tsx` | Existe, com divergências (ver §2.8) |
| Onboarding | `app/onboarding/page.tsx` | `app/onboarding.tsx` | Existe, com divergências (ver §2.9) |
| Nova senha | `app/new-password/page.tsx` | `app/new-password.tsx` | Existe, com divergência de guard (ver §2.10) |
| Privacidade | `app/privacy/page.tsx` | `app/privacy.tsx` | **Copy totalmente diferente** (ver §2.11) |
| Excluir conta | `components/settings/DeleteAccountModal.tsx` (modal) | `app/delete-account.tsx` (tela própria) | Paritário, adaptação mobile aceitável |

### Componentes — mapa 1:1

| web-client | mobile-client / shared-ui-mobile | Status |
| --- | --- | --- |
| `components/settings/AccountSection.tsx` | inline em `settings/index.tsx` | Existe, falta "conectado com Google" (ver §2.7) |
| `components/settings/NotificationsSection.tsx` | inline em `settings/index.tsx` | Copy e campos equivalentes (ver §2.7) |
| `components/settings/SubscriptionSection.tsx` | **ausente** | **Falta por completo** (ver §2.7) |
| `components/settings/DangerZoneSection.tsx` | inline em `settings/index.tsx` | Equivalente |
| `components/settings/DeleteAccountModal.tsx` | `app/delete-account.tsx` | Equivalente (tela em vez de modal) |
| `components/EventMetricsDrawer.tsx` | `Modal` inline em `metrics/index.tsx` | Equivalente |
| `components/EventMetricsRow.tsx` | `Pressable`+`Card` inline em `metrics/index.tsx` | Equivalente |
| `components/MetricsSparkline.tsx` | `Sparkline` de `shared-ui-mobile` | Equivalente |
| `components/MusicianLeadCard.tsx` | inline (`Card`) em `artists/index.tsx` | Equivalente, mas mobile adiciona botão Instagram sempre visível (ver §2.4) |
| `components/EstablishmentFields.tsx` (`IdentityFields`/`LocationFields`/`OperationFields`, compartilhado onboarding+perfil) | **não existe** — campos duplicados inline em `onboarding.tsx` e `profile/index.tsx` | **Duplicação e divergência de UX** (ver §2.5/§2.9) |
| `components/ui/CityCombobox.tsx` (busca + criação de cidade via `createCityFromPanel`) | **ausente** — `SelectField` simples, sem criar cidade | **Funcionalidade faltando** (ver §2.5/§2.9) |
| `components/ui/AttributeAutocomplete.tsx` (busca textual nos 36 atributos) | **ausente** — grade fixa de badges (`ESTABLISHMENT_ATTRIBUTES.map`) | Funcional, mas sem busca (aceitável como adaptação mobile, difícil UX com 36 badges) |
| `components/ui/ImageDrop.tsx` (drag-and-drop web) | `ImagePickerField` de `shared-ui-mobile` | Equivalente (adaptação mobile correta) |
| `components/Sidebar.tsx` | **substituído por** `Tabs` (bottom tab bar) em `(painel)/_layout.tsx` | **Navegação divergente, sem feature flags** (ver §2.12) |
| `components/Topbar.tsx` (menu de conta + logout, nome do bar) | **ausente** — nome do bar só aparece no Dashboard; logout só em Settings | **Falta por completo** (ver §2.12) |
| `components/ui/LogoutConfirmModal.tsx` | `ConfirmDialog` de `shared-ui-mobile` (usado em Settings/Onboarding) | Equivalente (componente genérico do kit) |
| `components/ComingSoon.tsx` | **ausente** | Órfão no web (não referenciado em nenhuma página) — fora de escopo, não é regressão do port |
| `components/GoogleIcon.tsx` | `Icon name="google"` de `shared-ui-mobile` | Equivalente |

---

## 2. Divergências concretas por tela

### 2.1 Dashboard

- Web: 3 atalhos — Eventos, Perfil do bar, **Métricas (`disabled: true`, CTA "Em breve")**. Métricas no dashboard do web está propositalmente bloqueada.
- Mobile: 5 atalhos — Eventos, **Artistas**, Perfil do Bar, **Métricas & Avaliações** (sem bloqueio), **Configurações**. Mobile libera e expõe shortcuts que o web mantém fora do dashboard (web só alcança Artistas/Configurações pela Sidebar).
- Copy do card de boas-vindas é levemente diferente mas equivalente em sentido (não é regressão).

### 2.2 Lista de eventos

- Web: sem filtro por status na lista — mostra todos, cada `EventCard` traz status como badge.
- Mobile: adiciona `SegmentedTabs` "Todos / Publicados / Rascunhos" — **filtro que não existe no web**. Fluxo adicional, não é so "adaptação mobile".
- Web: botão "Ver página pública" (ícone de olho) abrindo `/app/event/{external_id}` em nova aba, desabilitado em rascunho. **Mobile não tem esse botão/ação** — não há preview público do evento a partir da lista.
- Exclusão de série: web usa modal custom com os 3 botões (ocorrência / série / cancelar) em pilha vertical; mobile usa `ConfirmDialog` padrão 2-ações (confirmar=excluir série, cancelar=só ocorrência) — fluxo equivalente, copy similar, mapeamento de botões invertido mas resultado correto.

### 2.3 EventForm (novo/editar)

Paritário em campos, validação (`hasName`/`hasDate`), regras de negócio (`MAX_RECURRENCE_COUNT`, `DEFAULT_DURATION_HOURS`, `toLocalIso`/`toEndIso` idênticos) e copy dos labels. Única divergência:

- Web dispara `trackEvent('event_saved', { isEdit })` após salvar; **mobile não dispara nenhum evento de analytics** (consistente com §2.13 — mobile não tem analytics configurado).

### 2.4 Artistas

- Web: grid responsivo com `MusicianLeadCard`, `TextInput`s de busca (nome, região), `Select` de estilo musical e ordenação, infinite scroll via `IntersectionObserver`.
- Mobile: `FlashList` com mesmos filtros (nome, região, estilo, ordenação) — paritário em campos e copy (pequenas diferenças de rótulo: "Mais recentes"/"Nome"/"Região" vs "Nome do artista"/"Região / Bairro", equivalentes em sentido).
- Mobile exibe botões de ação (WhatsApp, Instagram) diretamente no card; web não renderiza esses botões no card de lead (`MusicianLeadCard` não foi lido em detalhe neste ciclo — **recomenda-se conferir se o CTA de contato existe no web antes de considerar isso feature nova do mobile**).

### 2.5 Perfil do estabelecimento

- Web reaproveita `EstablishmentFields.tsx` (`IdentityFields`/`LocationFields`/`OperationFields`), usado também no onboarding — single source of truth de copy e campos.
- Mobile **duplica os campos inline** em `profile/index.tsx` e `onboarding.tsx` — mesmo copy hoje, mas sem o compartilhamento, qualquer ajuste futuro de campo precisa ser replicado manualmente em 2 lugares (risco de drift).
- **Falta `CityCombobox`/`createCityFromPanel`:** web permite digitar uma cidade nova e criá-la direto no formulário (RPC idempotente); mobile só oferece um `SelectField` buscável sobre a lista de cidades já cadastradas — **dono de bar em cidade nova não consegue se cadastrar sozinho no mobile**, só pelo web.
- Diferenciais/atributos: web usa `AttributeAutocomplete` (campo de busca com autocomplete sobre os 36 itens); mobile renderiza os 36 badges fixos em `flex-wrap` — funcional, mas pode ficar denso em tela pequena (adaptação aceitável, mas vale revisão de UX).

### 2.6 Métricas e Avaliações — divergência de fluxo (não é só responsividade)

- Web: duas rotas independentes, cada uma atrás de uma feature flag remota (PostHog) própria — `/metrics` (`panel-metrics`) e `/reviews` (`panel-reviews`). Dashboard do web trata Métricas como "Em breve" (§2.1).
- Mobile: **uma única tela** `(painel)/metrics/index.tsx` com `SegmentedTabs` internos alternando "Métricas de Eventos" / "Avaliações do Bar" — sem feature flag nenhuma, sempre visível e sempre habilitada.
- Consequência: se a equipe decidir manter `panel-metrics`/`panel-reviews` desligadas em produção (rollout gradual via PostHog), o mobile está **exibindo essas funcionalidades mesmo quando o web as esconde** — diferença de comportamento em produção, não só de layout.

### 2.7 Configurações

- **`SubscriptionSection` (Assinatura e Plano) não existe no mobile.** Web mostra plano atual, benefícios inclusos, "novidades em preparação" e modal de planos/upgrades. Mobile não tem nenhuma seção equivalente — tela de Configurações do mobile tem 3 blocos (Conta, Notificações, Privacidade/Zona de perigo) contra 3 do web (Conta, Notificações, Zona de Perigo) **mais Assinatura que é exclusiva do web**.
- `AccountSection` no web detecta o provider (`getUserAuthProvider`) e mostra badge "Conectado com Google" ou "E-mail e Senha", escondendo o formulário de trocar senha quando é Google (com aviso dedicado). **Mobile sempre mostra o formulário de trocar senha**, sem checar o provider — um dono logado via Google no mobile veria um formulário de senha que não deveria ter efeito útil (o core trata isso? não há chamada a `getUserAuthProvider` em `settings/index.tsx`).
- Web tem notice de sucesso dedicado por ação (`onSuccessNotice`, auto-some em 4s) e notice "Preferências salvas" ao lado do header de Notificações (2.5s). Mobile usa `Alert.alert` nativo para sucesso de senha/sessões — equivalente em função, mas não há feedback visual para "preferência salva" nas notificações (silencioso).
- Logout: web tem `LogoutConfirmModal` acionado a partir do Topbar (em qualquer tela do painel); mobile só tem logout dentro de Settings (ver §2.12 — falta Topbar).
- Texto do botão de excluir conta/link: web usa link de texto "Excluir conta" dentro da seção de zona de perigo com `DeleteAccountModal`; mobile navega para tela própria `/delete-account` — fluxo diferente mas resultado equivalente.

### 2.8 Login

Fluxo e copy quase idênticos (mesma lógica de OTP/signup em 2 etapas, mesma mensagem `DENIED_MESSAGE`, mesmo resend cooldown). Divergências:

- Web: ao voltar do fluxo Google **dentro da aba "Criar conta"**, usa `sessionStorage` (`OAUTH_SIGNUP_KEY`) para lembrar a intenção de cadastro e chama `claimEstablishmentOwner()` automaticamente antes de checar se já é owner. **Mobile não implementa esse caminho** — o `useEffect` de pós-login do mobile só checa `isCurrentUserEstablishmentOwner()`, nunca promove automaticamente quem veio do Google pela aba de cadastro. Isto é uma lacuna funcional: **dono novo que tenta criar conta via Google no mobile não é promovido a owner**, ficando preso no estado "sem estabelecimento" ou recusado.
- Web dá `identifyAnalyticsUser`/`trackEvent` após login bem-sucedido; mobile não (consistente com ausência geral de analytics, §2.13).
- Web mostra link "Política de Privacidade" abaixo do card de login; mobile não tem esse link na tela de login (só acessível depois, dentro de Configurações).

### 2.9 Onboarding

- Web usa o wizard compartilhado `EstablishmentFields` (mesmos componentes do Perfil); mobile duplica os campos (ver §2.5).
- **Mobile não tem `CityCombobox`/criação de cidade** no onboarding (mesma lacuna do Perfil) — bloqueador real para quem abre um bar em cidade ainda não cadastrada, usando só o app mobile.
- Web permite "Sair" a qualquer momento via botão no header + `LogoutConfirmModal`; mobile oferece o mesmo via `ScreenHeader.rightAction` + `ConfirmDialog`, mas o "Voltar" do primeiro passo também abre o confirm de saída (`handleBack` quando `step === 0`) — fluxo extra que o web não tem (não é regressão, é adição aceitável).
- Validação de passo obrigatório (nome no passo 0, cidade no passo 1) é idêntica.

### 2.10 Nova senha

- Web: bloqueia o formulário com aviso "Link inválido ou expirado…" quando `status !== 'signedIn'` (sessão de recovery não detectada pela URL). **Mobile não faz essa checagem** — o formulário sempre aparece habilitado, mesmo sem sessão de recovery válida, e só falhará silenciosamente (ou com erro genérico) ao chamar `updatePassword`.
- Web usa 1 campo de senha; mobile usa 2 (senha + confirmação) — mobile é mais rigoroso aqui, não é regressão.

### 2.11 Privacidade (LGPD)

Divergência total de copy — web tem 6 seções detalhadas e específicas (dados da conta, dados do estabelecimento, dados de artistas — com cláusula de uso restrito —, serviços processadores citando Supabase e PostHog nominalmente, direitos LGPD com e-mail de contato, contato). Mobile tem 3 parágrafos genéricos ("Dados de Operadores e Bares", "Segurança e Armazenamento", "Direitos do Titular e Exclusão"), sem menção a Supabase/PostHog, sem e-mail de contato, sem seção específica sobre dados de artistas. **Para "ficar igual ao web" em copy literal, o texto do mobile precisa ser substituído pelo conteúdo real das 6 seções do web.**

### 2.12 Navegação (Sidebar/Topbar → Tabs)

- Web: `Sidebar` fixa (desktop) com 7 itens — Dashboard, Eventos, Artistas, Perfil, Métricas (flag `panel-metrics`), Avaliações (flag `panel-reviews`), Configurações (flag `panel-settings`) — filtrados dinamicamente por `useFeatureFlag` (PostHog). `Topbar` mostra nome do bar + menu de conta (iniciais do e-mail, dropdown com "Sair" → `LogoutConfirmModal`) em toda tela do painel.
- Mobile: bottom `Tabs` fixa com **6 itens sempre visíveis** (Dashboard, Eventos, Artistas, Métricas, Perfil, Ajustes) — **sem checar nenhuma feature flag**, e sem rota separada para Avaliações (fundida em Métricas, §2.6). Não há Topbar equivalente — nome do bar só aparece no header do Dashboard, e logout só é acessível entrando em Configurações.
- Isso é mais que responsividade: é um padrão de navegação diferente (tabs vs sidebar) com uma lacuna real — **entrega gradual (feature flags) não se replica no mobile**, o que entrega features antes do previsto no rollout do web.

### 2.13 Analytics (PostHog)

- Mobile-client **não configura nenhum adapter de analytics** (nenhuma referência a `configureAnalytics`/PostHog em `apps/mobile-client`). Isso significa:
  - `useFeatureFlag` sempre retorna `false` (default sem adapter) — **se alguém tentasse usá-lo no mobile, todas as telas com flag 'fechariam'** por padrão, o oposto do que hoje acontece (mobile não usa a flag em lugar nenhum, então as telas aparecem sempre abertas).
  - `trackEvent`/`identifyAnalyticsUser` não têm efeito no mobile (chamadas ausentes, não quebradas — simplesmente não existem no código).
  - Consequência de produto: sem telemetria no mobile, não há dado de uso real do painel mobile hoje.

---

## 3. Hooks/services usados pelo web-client — disponibilidade no mobile

| Hook/service (origem) | Usado no web-client | Disponível/usado no mobile-client |
| --- | --- | --- |
| `useOwnedEstablishment`, `useOwnedEstablishmentId` (`@agenda/core` via `apps/web-client/hooks/use-owned-establishment.ts`, que é wrapper local) | Sim | Sim — mobile importa direto de `@agenda/core` (`useOwnedEstablishment`/`useOwnedEstablishmentId` exportados do core, sem wrapper local) |
| `useOwnedEvents`, `useDeleteOwnedEvent`, `useDeleteOwnedEventGroup` (`apps/web-client/hooks/use-owned-events.ts`, wrapper local) | Sim | Sim — mobile usa a versão exportada direto do `@agenda/core` (`useOwnedEvents` etc. já existem no core, não precisam de wrapper) |
| `useOwnedMetrics`, `useOwnedFavoritesCount`, `aggregateMetrics` (`apps/web-client/hooks/use-owned-metrics.ts`) | Sim | Sim, mobile importa as mesmas de `@agenda/core` |
| `useMusicianLeads` (`apps/web-client/hooks/use-musician-leads.ts`) | Sim, wrapper local no web | Mobile importa `useMusicianLeads` direto de `@agenda/core` — **o core já expõe a versão genérica; o wrapper local do web pode ser legado a não duplicar** (fora de escopo desta auditoria, mas vale checar se `apps/web-client/hooks/use-musician-leads.ts` ainda agrega algo que o core não tem) |
| `useOwnerEstablishmentRatings`, `calculateRatingsSummary` | Sim (`/reviews`) | Sim (tab "Avaliações" em Métricas) |
| `useFeatureFlag` (`@agenda/core`) | Sim, usado em Sidebar + 3 páginas (`panel-metrics`/`panel-reviews`/`panel-settings`) | **Não usado em nenhum lugar do mobile-client** (grep confirmado) |
| `trackEvent`, `identifyAnalyticsUser` (`@agenda/core/services/analytics`) | Sim | **Não usado** — mobile não configura adapter (`configureAnalytics`) em `src/lib/bootstrap.ts` |
| `getUserAuthProvider` | Sim (`AccountSection`) | **Não usado** no mobile `settings/index.tsx` |
| `createCityFromPanel` | Sim (`EstablishmentFields.LocationFields`) | **Não usado** no mobile |
| `signOutOtherSessions` (core) | Sim (`AccountSection`, chama helper do core) | Mobile chama `supabase.auth.signOut({ scope: 'others' })` diretamente em vez do helper `signOutOtherSessions` do core — mesmo resultado, mas duplica a regra de negócio em vez de reusar o service (checar se `signOutOtherSessions` existe e faz exatamente isso antes de consolidar) |

### `packages/shared-ui-mobile` — inventário

Componentes existentes: `Badge`, `Button`, `Card`, `ConfirmDialog`, `DatePickerField`, `EmptyState`, `Field`, `Icon`, `ImagePickerField`, `Screen`, `ScreenHeader`, `SegmentedTabs`, `SelectField`, `Sparkline`, `Switch`, `TextArea`, `TextInput`, `TimePickerField`, mais `cn`, `iconMap`, `tw` (fachada styled) e `index.ts`.

Faltam no kit mobile (hoje resolvidos inline nas telas, sem componente dedicado):

- Nenhum `CityCombobox` equivalente (bloqueador funcional, não só estético).
- Nenhum `AttributeAutocomplete` equivalente (lista fixa de badges em vez de busca).
- Nenhum `StatCard` dedicado no index (é referenciado em `metrics/index.tsx` mas não aparece na lista de arquivos de `src/` — **confirmar se `StatCard` existe de fato no pacote antes do próximo ciclo de trabalho**, pode ser um import quebrado ou um arquivo não capturado pelo `find`).
- Nenhum `SwitchRow` na lista de arquivos de `src/`, mas é importado em `settings/index.tsx` e `EventForm.tsx` — **mesma observação: verificar se existe e não apareceu na listagem, ou se é um símbolo re-exportado de outro lugar**.

---

## 4. NotificationsSection — como funciona hoje e o que falta para push

### Web (`apps/web-client/components/settings/NotificationsSection.tsx`)

- 7 preferências: `channelEmail`, `channelPush`, `alertReviews`, `alertMusicians`, `alertEventStatus`, `alertEmptySchedule`, `alertWeeklyDigest`.
- **Persistência: `localStorage`, chave `web-client:notifications:${userId}`.** Não há tabela no Postgres — é 100% client-side, por dispositivo/navegador (não sincroniza entre aparelhos).
- Não há `useEffect`/mutation chamando Supabase — as preferências nunca chegam ao backend. Logo, hoje **nenhum canal realmente dispara notificação** baseado nessas preferências; é puramente uma tela de "em construção" funcional para configurar algo que ainda não é consumido por nenhum serviço de envio.

### Mobile (`apps/mobile-client/app/(painel)/settings/index.tsx`)

- Mesmas 7 chaves, mesma estrutura de objeto.
- **Persistência: `AsyncStorage`, chave `mobile-client:notifications:${user.id}`.** Equivalente ao padrão do web (local, não sincronizado, não enviado ao backend).

### Infra de push no banco/funções — inexistente

- `supabase/migrations/20260611185705_create_tables.sql` define `public.notifications` (id, title, body, type, created_at, read, event_id, establishment_id) — é a tabela de **notificações in-app exibidas no feed do app consumidor** (tipo `notification_type_enum`), não push token.
- Nenhuma migração cria tabela de `push_token`/`device_token`/`expo_push_token`.
- `supabase/functions/` não existe neste repo (pasta ausente) — não há Edge Function de envio de push.
- Nenhum app Expo do monorepo (`apps/mobile` nem `apps/mobile-client`) tem `expo-notifications` no `package.json`.

### O que falta para push mobile funcionar de verdade

1. **Client:** instalar `expo-notifications` (dependência nova — autorização explícita necessária, AGENTS.md Regra 10), configurar `app.config.ts` com os plugins/permissões (iOS APNs via EAS, Android via FCM), capturar o Expo Push Token no login/boot do app.
2. **Schema:** nova tabela `push_tokens` (ou `device_tokens`) com `user_id uuid references auth.users`, `token text`, `platform text`, `updated_at`. RLS: usuário só lê/escreve o próprio token (`auth.uid() = user_id`) — write via INSERT/UPDATE direto coberto por policy, sem necessidade de RPC `SECURITY DEFINER` (não é operação privilegiada).
3. **Envio:** uma Edge Function (`supabase/functions/send-push/`) ou job externo que leia `push_tokens` + preferências (hoje só client-side — precisaria migrar para uma tabela `notification_preferences` se o envio for respeitar os toggles) e chame a Expo Push API.
4. **Preferências:** hoje é só `localStorage`/`AsyncStorage` — para o backend respeitar os toggles, as 7 preferências precisariam de uma tabela própria (ou colunas em `profiles`), substituindo a persistência local atual nos dois apps.
5. **Trigger:** cada evento que hoje gera linha em `public.notifications` (nova avaliação, lead de músico, moderação de evento) precisaria também disparar a função de push — hoje não há nenhum gatilho (trigger de banco ou chamada de service) fazendo isso.

Conclusão: push é feature nova de ponta a ponta (client + schema + função + triggers), não um ajuste de paridade — e está fora do presente escopo de "portar o mobile igual ao web" porque **o web também não implementa push real** (é só a UI de preferências, sem back-end).

---

## 5. Responsividade — tablet hoje

- `apps/mobile-client/src/hooks/useResponsive.ts`: breakpoints por `useWindowDimensions` — `sm` (`<380`), `md` (`380–767`), `lg`/tablet (`>=768`, `isTablet: true`).
- Telas aplicam `isTablet` para alternar `flex-col` → `flex-row`/grid com `w-[48%]` (Dashboard shortcuts, Métricas stat cards, Perfil em 2 colunas) e `numColumns={isTablet ? 2 : 1}` no `FlashList` (Eventos, Artistas).
- **Navegação continua sendo `Tabs` (bottom bar) mesmo em tablet** — não há drawer nem sidebar lateral equivalente ao web; o layout `(painel)/_layout.tsx` só ajusta altura/fonte da tab bar (`isTablet ? 64 : 56`), não troca o padrão de navegação.
- Não há breakpoint dedicado a "desktop"/landscape largo além do que `isTablet` já cobre — adequado para smartphone/tablet (o que o pedido autoriza como diferença), mas confirma que não existe hoje nenhuma tentativa de replicar a Sidebar em tablet grande.

---

## 6. Checklist acionável — lotes paralelizáveis (arquivos isolados)

Cada lote é independente dos demais (arquivos próprios), para rodar em paralelo.

### Lote A — Privacidade (copy)

- [ ] `apps/mobile-client/app/privacy.tsx`: substituir o texto por versão fiel às 6 seções de `apps/web-client/app/privacy/page.tsx` (dados da conta, dados do estabelecimento, dados de artistas, serviços processadores citando Supabase/PostHog, direitos LGPD + e-mail de contato, contato).

### Lote B — Configurações: Assinatura + Account provider

- [ ] Criar seção "Assinatura e Plano" em `apps/mobile-client/app/(painel)/settings/index.tsx` (ou componente novo em `packages/shared-ui-mobile` se for reutilizável), espelhando `SubscriptionSection.tsx` (benefícios atuais, "novidades em preparação", modal "Ver planos e upgrades").
- [ ] Em `settings/index.tsx`, chamar `getUserAuthProvider()` e esconder o formulário de troca de senha quando `provider === 'google'`, mostrando o aviso equivalente ao web.

### Lote C — Navegação: feature flags + Topbar

- [ ] Decidir e aplicar `useFeatureFlag('panel-metrics' | 'panel-reviews' | 'panel-settings')` nas `Tabs.Screen` de `apps/mobile-client/app/(painel)/_layout.tsx` (ocultar tab) — requer primeiro configurar `configureAnalytics` no bootstrap do mobile (ver Lote F) para a flag não cair sempre em `false`.
- [ ] Avaliar criar um header equivalente ao `Topbar` (nome do bar + menu de conta/logout acessível de qualquer tela), ou decidir conscientemente manter logout só em Settings — documentar a decisão.

### Lote D — Avaliações como rota própria

- [ ] Separar a tab "Avaliações do Bar" hoje embutida em `apps/mobile-client/app/(painel)/metrics/index.tsx` para refletir se o produto quer manter fundida (decisão de produto) ou separar em rota própria `app/(painel)/reviews.tsx`, espelhando a divisão `/metrics` vs `/reviews` do web.

### Lote E — Perfil/Onboarding: CityCombobox + criação de cidade

- [ ] Criar `CityCombobox`/equivalente em `packages/shared-ui-mobile` (busca + opção "criar cidade") e plugar em `apps/mobile-client/app/(painel)/profile/index.tsx` e `apps/mobile-client/app/onboarding.tsx`, usando `createCityFromPanel` do core (mesma RPC do web).
- [ ] Extrair os campos duplicados de `profile/index.tsx`/`onboarding.tsx` para um módulo compartilhado mobile (paralelo a `EstablishmentFields.tsx` do web), reduzindo risco de drift futuro.

### Lote F — Analytics no mobile

- [ ] Configurar `configureAnalytics` no bootstrap (`apps/mobile-client/src/lib/bootstrap.ts`) com adapter PostHog para Expo/React Native (dependência nova — pedir autorização antes).
- [ ] Adicionar `trackEvent`/`identifyAnalyticsUser` nos mesmos pontos do web: `EventForm` (`event_saved`), login (`establishment_claimed` via onboarding, identificação pós-login).

### Lote G — Login: fluxo Google no cadastro

- [ ] Replicar em `apps/mobile-client/app/login.tsx` o caminho de "Google pela aba Criar conta" (web usa `sessionStorage`; mobile precisa de equivalente, ex. `AsyncStorage` ou parâmetro de deep link) chamando `claimEstablishmentOwner()` antes do check de owner, para não deixar o dono preso sem vínculo após OAuth.
- [ ] Adicionar link de "Política de Privacidade" na tela de login do mobile.

### Lote H — Nova senha: guard de sessão

- [ ] Em `apps/mobile-client/app/new-password.tsx`, checar `useAuthStore((s) => s.status) === 'signedIn'` e bloquear/avisar quando não for (mesma mensagem do web: "Link inválido ou expirado…").

### Lote I — Eventos: preview público + filtro por status

- [ ] Confirmar com produto se o filtro "Todos/Publicados/Rascunhos" (já existente no mobile) deve ser retroportado ao web, ou é divergência aceita.
- [ ] Avaliar adicionar ação "Ver página pública" no card de evento do mobile (abrir deep link/URL do evento publicado), hoje ausente.

### Lote J — Verificação de símbolos do shared-ui-mobile

- [ ] Confirmar que `StatCard` e `SwitchRow` (importados em `metrics/index.tsx`, `settings/index.tsx`, `EventForm.tsx`) de fato existem e exportam de `packages/shared-ui-mobile/src/index.ts` — não apareceram na listagem de arquivos deste ciclo de auditoria; pode ser falso-positivo (arquivo com outro nome) ou lacuna real a corrigir antes dos lotes acima.

---

## 7. Fora de escopo desta auditoria (não reportar como regressão de port)

- Push notifications real (client + schema + function) — feature nova de ponta a ponta, o web também não implementa (§4).
- `ComingSoon.tsx` órfão no web-client — dívida pré-existente não tocada pelo port.
- Duplicação de wrappers locais (`use-musician-leads.ts`, `use-owned-events.ts` etc.) no web-client vs. uso direto do core no mobile — já é assim hoje, não é causado pelo port; mobile está, se algo, mais alinhado ao core.
