# Painel do Estabelecimento — Especificação Completa

> Documento de referência para desenvolvimento do painel de gestão para donos de bar/estabelecimento dentro do ecossistema Agenda de Boteco. Use este arquivo como memória entre sessões — peça etapa por etapa referenciando a fase/seção desejada.

**Fontes:**
- Orçamento comercial: `orcamento-agenda-do-boteco/orcamento-estabelecimentos.html` (Inovacode LTDA)
- Protótipo navegável: `bar-stage-glow.lovable.app` (Fases 1–3 e 7 parcialmente implementadas; Fases 4–6 aparecem como placeholder "Em breve")

---

## 1. Visão Geral

O painel do estabelecimento é a interface pela qual o **dono de um bar/estabelecimento** cadastra e gerencia seu próprio perfil, eventos, avaliações e métricas dentro do ecossistema Agenda de Boteco — o mesmo backend/banco de dados que já alimenta `apps/mobile` e `apps/web` (consumidor final).

### Dois novos workspaces no monorepo

| App | Papel |
|---|---|
| `apps/web-client` | Painel web do estabelecimento (Next.js, App Router) — cobre as Fases 1 a 5 e 7. Prioridade de entrega. |
| `apps/mobile-client` | Versão nativa (Expo) do **mesmo painel**, entregue depois — Fase 6 do orçamento. Equivalente mobile do `web-client`, não um produto paralelo. |

Ambos consomem `@agenda/core` (schemas Zod, services/repositories, query key factories, Supabase client, stores Zustand, utils) — nenhuma lógica de negócio nova deve ser reimplementada se já existir no core. Isso segue o mesmo padrão de reuso já usado por `apps/admin`.

### Princípio de isolamento

Cada conta de estabelecimento só pode ler/escrever os dados do **seu próprio bar**. Isso é garantido via:
1. Vínculo `user_id` ↔ `establishment_id` (tabela de vínculo, análoga ao `profiles.is_admin` do admin, mas aqui é `establishment_owners` ou campo equivalente).
2. RLS no Supabase: policies que restringem `SELECT/INSERT/UPDATE/DELETE` em `events`, `establishments` etc. a `auth.uid()` vinculado ao `establishment_id` da linha.

### Paridade obrigatória

Toda tela do `web-client` deve ter equivalente funcional no `mobile-client` quando a Fase 6 for iniciada. As horas orçadas já contemplam as duas plataformas — não é retrabalho, é entrega simultânea de escopo.

---

## 2. Design System (extraído do protótipo Lovable)

O protótipo usa tema **dark-only**, tokens em HSL via CSS custom properties (compatível com Tailwind + shadcn/ui, mesmo padrão do `apps/admin`).

```css
--background: 0 0% 6%;              /* quase preto */
--foreground: 0 0% 98%;             /* texto principal */
--card: 0 0% 9%;
--card-foreground: 0 0% 98%;
--popover: 0 0% 8%;
--popover-foreground: 0 0% 98%;

--primary: 141 76% 48%;             /* verde neon — cor de marca */
--primary-foreground: 0 0% 6%;
--primary-glow: 141 90% 60%;

--secondary: 0 0% 14%;
--secondary-foreground: 0 0% 98%;
--muted: 0 0% 14%;
--muted-foreground: 0 0% 65%;

--accent: 38 95% 55%;               /* âmbar/dourado — badges, destaques */
--accent-foreground: 0 0% 6%;

--destructive: 340 90% 60%;         /* rosa/vermelho — ações destrutivas (lixeira) */
--destructive-foreground: 0 0% 98%;

--border: 0 0% 16%;
--input: 0 0% 14%;
--ring: 141 76% 48%;
--radius: 1rem;                     /* cantos bem arredondados */

--surface: 0 0% 11%;
--surface-elevated: 0 0% 14%;

--neon-pink: 330 100% 65%;
--neon-cyan: 190 95% 55%;

--gradient-primary: linear-gradient(135deg, hsl(141 76% 48%), hsl(170 80% 50%));
--gradient-night: linear-gradient(160deg, hsl(260 40% 12%) 0%, hsl(0 0% 6%) 60%);
--gradient-card: linear-gradient(180deg, hsl(0 0% 0% / 0) 0%, hsl(0 0% 0% / .85) 100%);
--gradient-promo: linear-gradient(135deg, hsl(38 95% 55%), hsl(330 100% 65%));

--shadow-neon: 0 10px 40px -10px hsl(141 76% 48% / .45);
--shadow-card: 0 12px 30px -10px hsl(0 0% 0% / .6);

/* Sidebar tem paleta própria, levemente diferente do card */
--sidebar-background: 0 0% 8%;
--sidebar-foreground: 0 0% 95%;
--sidebar-primary: 141 76% 48%;
--sidebar-primary-foreground: 0 0% 6%;
--sidebar-accent: 0 0% 14%;
--sidebar-accent-foreground: 0 0% 95%;
--sidebar-border: 0 0% 16%;
--sidebar-ring: 141 76% 48%;
```

**Decisão de reuso:** o Agenda de Boteco já tem tokens de tema em `@agenda/core/theme`. Antes de introduzir esses valores, comparar com os tokens existentes (colors, gradients, shadows) — se a marca do painel de estabelecimento deve ser visualmente idêntica ao app público, herdar de lá; se deve ter identidade própria (mais "SaaS/dashboard"), estes tokens acima servem de base para um tema novo, escopado ao `web-client`/`mobile-client`.

### Padrões visuais observados

- **Sidebar fixa à esquerda** (largura ~240px no desktop): logo "Agenda de Boteco" no topo, nav vertical com ícone + label, botão "+ Novo evento" fixo no rodapé da sidebar (verde, pill/rounded-full).
- **Topbar**: nome do estabelecimento à esquerda, avatar circular (inicial do e-mail) + e-mail do usuário à direita.
- **Cards**: fundo `--card`, borda sutil `--border`, `border-radius: 1rem`, sombra suave.
- **Card de boas-vindas do Dashboard**: gradiente `--gradient-primary` (verde), texto escuro sobre o gradiente (alto contraste), ícone de "sparkles".
- **Botão primário**: verde `--primary`, texto escuro, `rounded-full` ou `rounded-lg` conforme contexto — CTA principal sempre verde.
- **Botão secundário/"Editar"**: fundo escuro neutro, borda sutil.
- **Botão destrutivo (lixeira)**: ícone rosa/vermelho sobre fundo escuro, sem preenchimento — ação de baixo peso visual até hover.
- **Badge de status** ("Rascunho"): fundo `--muted`, texto `--muted-foreground`, pequeno, `rounded-md`.
- **Telas "Em breve"** (placeholder): card centralizado, ícone grande dentro de círculo com glow verde translúcido, título, descrição, badge "Em breve" (verde), botão "Voltar ao painel".
- **Formulários**: label acima do input, inputs com fundo `--input`, sem bordas fortes, placeholder em `--muted-foreground`. Campos obrigatórios marcados com `*` no label.
- **Upload de imagem**: área com borda pontilhada, ícone de upload centralizado, texto "Clique para enviar".

---

## 3. Fase 1 — Fundação e Onboarding (obrigatória)

**Objetivo:** estrutura de auth e vínculo de conta ↔ estabelecimento.

### Telas
- **Login/Cadastro** (`/` ou `/login`): um único card com tabs "Entrar" / "Criar conta". Campos: E-mail, Senha. Link "Esqueci minha senha". Botão social "Google". Confirmado 1:1 no protótipo.
- **Onboarding wizard** (3 passos, mencionado no orçamento mas **não visível no protótipo atual** — projetar): 1) Identidade (nome do bar), 2) Endereço/contato, 3) Revisão. Barra de progresso no topo.

### Reuso de `@agenda/core`
- Auth: `auth.service.ts` já existente (login por e-mail/código). Login por senha e Google são **acessos adicionais** ao que já existe — não reescrever o fluxo de sessão, estender o service.
- Design de onboarding: reaproveitar padrão de wizard se já existir em `apps/mobile` (ex.: fluxo de boas-vindas).

### Novo (não existe ainda)
- Vínculo `establishment_owners` (ou campo em `establishments`) ligando `auth.uid()` ao estabelecimento.
- RLS policies de isolamento por estabelecimento.
- Login com senha + Google (hoje o Agenda de Boteco autentica só por código via e-mail).

---

## 4. Fase 2 — Perfil do Estabelecimento (obrigatória)

**Objetivo:** tela de edição de tudo que aparece no perfil público do bar (app + site).

### Tela `/perfil` (confirmada 1:1 no protótipo)

Formulário em 3 seções (`region`), sem tabs, scroll único:

**Seção "Identidade"**
| Campo | Tipo | Placeholder |
|---|---|---|
| Logo | upload de imagem | "Clique para enviar" |
| Imagem de capa | upload de imagem | "Clique para enviar" |
| Nome do estabelecimento * | text | "Bar do Zé" |
| Descrição | textarea | "Conta a história do seu boteco..." |

**Seção "Localização & Contato"**
| Campo | Tipo | Placeholder |
|---|---|---|
| Endereço completo | text | "Rua, número" |
| Cidade * | text | "São Paulo" |
| Bairro | text | "Vila Madalena" |
| WhatsApp | text (máscara) | "(11) 99999-9999" |
| Instagram | text | "@bardoze" |

**Seção "Operação"**
| Campo | Tipo | Opções/Placeholder |
|---|---|---|
| Horário de funcionamento | text | "Seg a Sáb, 18h às 02h" |
| Faixa de preço | select | `$ — Econômico`, `$$ — Moderado`, `$$$ — Caro`, `$$$$ — Premium` |
| Tipo de ambiente | select | Boteco tradicional, Pub, Bar moderno, Restaurante-bar, Cervejaria, Choperia, Casa de shows, Lounge |
| Link do cardápio | text (url) | "https://..." |
| Diferenciais do local | multi-select (chips) | ver lista abaixo |

Botão único no fim: **"Salvar alterações"** (submit).

⚠️ **Divergência a resolver:** o protótipo mostra 12 diferenciais (Música ao vivo, Happy hour, Pet friendly, Mesa de sinuca, Telão, Área externa, Cerveja artesanal, Petiscos, Drinks autorais, Estacionamento, Acessível, Open bar). A memória do projeto e o `AGENTS.md` indicam que o Agenda de Boteco já tem uma **lista oficial de 36 atributos/diferenciais** em `@agenda/core`, usada nos filtros do app/site, com regra de filtro em **AND** (todos os marcados precisam bater). **Usar a lista oficial de 36 do core, não os 12 do protótipo** — o protótipo é só um mockup ilustrativo, a fonte de verdade é o enum já existente.

### Reuso de `@agenda/core`
- Upload de logo/capa: storage adapter já existente (usado em `apps/mobile`/`apps/web`).
- Cidade: lista oficial de cidades já existente (mesma usada no filtro do feed).
- WhatsApp: máscara de telefone em `utils/masks`.
- Diferenciais: enum oficial de 36 atributos já existente — **não recriar**.
- Cardápio estruturado (item extra, +5h no orçamento): schema de cardápio (itens, preços, fotos, PDF) já existe no banco — esta fase só constrói a tela de edição.

### Campos que são novos
- Faixa de preço, tipo de ambiente: confirmar se já existem no schema atual de `establishments`; se não, são colunas novas.

---

## 5. Fase 3 — Agenda de Eventos (obrigatória)

**Objetivo:** CRUD de eventos do estabelecimento com estado rascunho/publicado.

### Tela `/eventos` — Listagem (confirmada 1:1)

- Header: título "Eventos", subtítulo "Gerencie a programação do seu bar.", botão "+ Novo evento" no canto superior direito (e replicado fixo no rodapé da sidebar).
- Grid de cards (2 colunas no desktop testado), cada card:
  - Thumbnail de imagem (placeholder com ícone se sem banner)
  - Nome do evento + badge de status ("Rascunho" / presumidamente "Publicado")
  - Data formatada: `"Qui., 22 De Out."` ou com horário: `"Sex., 25 De Set. • 18:00"`
  - Botões: "Editar" (com ícone lápis), ícone de olho (visualizar/preview público), ícone de lixeira (excluir, cor destrutiva)
- Estado vazio: não capturado no protótipo (bar de teste tinha eventos) — reaproveitar componente `EmptyState` do design system quando não houver eventos.

### Tela `/eventos/novo` e `/eventos/[id]/editar` — Formulário (idêntico nos dois modos, confirmado 1:1)

| Campo | Tipo | Obrigatório | Placeholder/Opções |
|---|---|---|---|
| Banner do evento | upload de imagem | não | "Clique para enviar" |
| Nome do evento | text | **sim** | "Ex: Sexta do Sertanejo" |
| Data | date | **sim** | — |
| Horário | time | não | — |
| Descrição | textarea | não | "Conte o que vai rolar nesse evento..." |
| Atração principal | text | não | "Banda, DJ, artista..." |
| Estilo musical | select | não | Sertanejo, Pagode, Samba, MPB, Rock, Pop, Funk, Eletrônica, Forró, Reggae, Jazz/Blues, Outros |
| Entrada (R$) | number | não | "0,00" |
| Capacidade | number | não | "Ex: 200" |
| Cortesia | text | não | "Ex: Mulheres free" |
| Promoção | text | não | "Ex: Chopp em dobro até 22h" |

Dois botões no rodapé do formulário: **"Salvar rascunho"** (secundário) e **"Publicar evento"** (primário, verde).

### Reuso de `@agenda/core`
- Banner, galeria de fotos, validação de datas: já existem.
- Cortesia/Promoção: já são campos existentes no banco e já aparecem destacados no feed público — só falta a tela de edição pelo dono.
- Listagem/estado vazio: componentes de tabela e `EmptyState` já prontos.

### Novo (não existe ainda)
- **Estado rascunho/publicado**: hoje todo evento cadastrado já nasce visível ao público. Precisa de:
  - Coluna `status` (`draft` | `published`) na tabela de eventos.
  - Filtro no feed público (`apps/mobile`/`apps/web`) para exibir apenas eventos `published`.
  - Validação de campos obrigatórios antes de permitir "Publicar" (nome + data no mínimo).
- **Eventos recorrentes** (item opcional, +10h): repetição semanal/mensal (ex: happy hour toda sexta) — gerar múltiplas instâncias de evento ou modelar recorrência (RRULE-like) — decisão de arquitetura a discutir quando chegar essa etapa.
- **Moderação de conteúdo** (item opcional, +8h): triagem automática de termos impróprios + fila de revisão antes da publicação, tanto no cadastro do bar quanto de eventos.

---

## 6. Fase 4 — Avaliações e Reputação (opcional, placeholder no protótipo)

**Objetivo:** avaliações do público (nota + comentário), com nota entrando direto na média e comentário passando por aprovação do dono.

> No protótipo, `/avaliacoes` é só uma tela "Em breve" com ícone de estrela, título, descrição e botão "Voltar ao painel" — mesmo padrão visual de placeholder das Fases 5 e 6.

### Modelo de dados (novo — hoje só existe nota média agregada)
- Tabela de avaliações individuais: `rating` (estrelas), `comment` (texto, nullable), `author_id`, `establishment_id`, `comment_status` (`pending` | `approved` | `rejected`), timestamps.
- Trigger/lógica de recálculo de média/contagem no momento da avaliação (independente do status do comentário).
- RLS: dono só modera comentários do seu próprio estabelecimento.

### Telas do painel (`/avaliacoes`)
- Listagem com busca, ordenação por nota/data, paginação.
- Abas ou filtro: Pendentes / Aprovados / Recusados.
- Ação de aprovar/recusar comentário (nota nunca é excluível pelo estabelecimento).
- Resposta pública do estabelecimento a cada avaliação, visível a todos.
- Indicador/notificação de novos comentários pendentes.

### Telas no app/site público (novo)
- Tela de avaliação: nota em estrelas + comentário, com aviso de que o texto passa por conferência antes de ficar visível.
- Leitura dos comentários já aprovados na página do estabelecimento.

### Reuso
- `RatingStars` (componente já existente no design system) para exibição e input de nota.

---

## 7. Fase 5 — Métricas e Desempenho (opcional, placeholder no protótipo)

**Objetivo:** painel analítico de cliques/visualizações por evento, somando app + web.

> No protótipo, `/metricas` é placeholder "Em breve" com ícone de gráfico de barras, mesma estrutura visual da Fase 4.

### Rastreamento (novo)
- Registro de ação por tipo: abertura do evento, clique no banner, WhatsApp, mapa/rota, cardápio, Instagram, favoritar.
- Contagem de visualizações no feed.
- Proteção contra cliques repetidos do mesmo usuário (para números refletirem interesse real) — decisão de implementação (debounce por sessão/usuário) a definir na etapa.

### Dashboard de métricas (tela `/metricas`)
- Total de cliques por tipo de ação, por evento.
- Gráficos por período.
- Comparação entre eventos.
- Exportação de relatório PDF/CSV do desempenho mensal.

### Instrumentação
- Os botões de WhatsApp, mapa, cardápio, Instagram, favoritar **já existem** em `apps/mobile`/`apps/web` — o trabalho é adicionar o registro de clique a cada um, não recriar os botões.

---

## 8. Fase 6 — App Mobile Nativo do Estabelecimento (opcional)

**Objetivo:** `apps/mobile-client` — versão nativa (Expo) do painel web, para o dono gerenciar pelo celular.

> Esta fase só é necessária se o painel não ficar restrito à web. Se `web-client` for a entrega final, esta fase inteira (e a Fase 7 correspondente) é descartável.

### Escopo (equivalente nativo do `web-client`)
- Fundação: navegação (Expo Router), autenticação, design system adaptado — reaproveitando a base já existente em `apps/mobile` (login, padrão visual, Expo Router já configurado).
- Perfil e Cardápio: mesmas telas da Fase 2, com upload de imagem via câmera do celular (vantagem nativa sobre a web).
- Agenda de eventos: mesmas telas da Fase 3, com notificações push quando houver nova avaliação/comentário pendente.
- Métricas e Avaliações: versões mobile das Fases 4 e 5.

### Reuso
- Toda a lógica de `@agenda/core` (services, schemas, query keys) é 100% compartilhada com `web-client` — só a camada de UI é nativa.
- Navegação, auth e design tokens de `apps/mobile` servem de referência de implementação Expo.

---

## 9. Fase 7 — Testes, Homologação e Publicação (obrigatória)

**Objetivo:** qualidade e processos de lançamento.

### Itens sempre obrigatórios
- Responsividade, tratamento offline, testes automatizados/manuais de fluxo.
- Build final assinado digitalmente (web e/ou lojas) — reaproveitar pipeline de build/publicação já automatizado no Agenda de Boteco (ver [[fase5-deploy-automatizado]] na memória do projeto).

### Itens condicionais (só se Fase 6 — app nativo — estiver no escopo)
- Identidade de loja: ícones, splash screens, materiais visuais das lojas (reaproveitar identidade visual existente do Agenda de Boteco).
- Acompanhamento e submissão: configurações de privacidade e suporte durante avaliação da Apple/Google.

---

## 10. Mapa de Rotas do Painel (`web-client`)

| Rota | Tela | Status no protótipo |
|---|---|---|
| `/` ou `/login` | Auth (login/cadastro) | ✅ funcional |
| `/dashboard` | Home do painel — cards de atalho + boas-vindas | ✅ funcional |
| `/eventos` | Listagem de eventos | ✅ funcional |
| `/eventos/novo` | Criar evento | ✅ funcional |
| `/eventos/[id]/editar` | Editar evento | ✅ funcional |
| `/perfil` | Editar perfil do estabelecimento | ✅ funcional |
| `/metricas` | Dashboard de métricas | ⏳ placeholder "Em breve" |
| `/avaliacoes` | Moderação de avaliações | ⏳ placeholder "Em breve" |
| `/configuracoes` | Preferências de conta, notificações, privacidade, assinatura | ⏳ placeholder "Em breve" |

### Sidebar (ordem confirmada)
Dashboard → Eventos → Perfil → Métricas → Avaliações → Configurações, com "+ Novo evento" fixo no rodapé.

### Dashboard — Home (`/dashboard`, confirmada 1:1)
- Card de boas-vindas full-width com gradiente verde: "Bem-vindo, {Nome do Bar}!", subtítulo, botão "Cadastrar primeiro evento" (some após o primeiro evento, presumidamente).
- 3 cards de atalho em grid: **Eventos** ("Crie e gerencie suas agendas" → "Gerenciar eventos"), **Perfil do bar** ("Edite informações e mídia" → "Editar perfil", botão em âmbar/dourado — única exceção de cor no protótipo), **Métricas** ("Acompanhe visualizações e cliques" → "Em breve", desabilitado).

---

## 11. Arquitetura — Como isso se encaixa no fluxo do monorepo

Seguindo a Seção 3 do `AGENTS.md`, todo dado remoto passa por:

```
UI (apps/web-client, apps/mobile-client)
  → Custom Hook (TanStack Query, query keys via catalogKeys ou nova factory establishmentKeys)
  → Repository/Service (@agenda/core/services — estender os já existentes, ex: catalog.service.ts, ou criar establishment-panel.service.ts se a Regra dos 3 justificar)
  → Supabase Client (@agenda/core/supabase)
  → Postgres (RLS por establishment_id)
```

- **Query keys**: se o painel precisa de chaves próprias (ex: `establishmentKeys.events.list(establishmentId)`), avaliar se cabe dentro de `catalogKeys` existente ou se justifica uma factory nova — só abstrair para o core se usado em 3+ lugares (Regra dos 3 do `AGENTS.md`).
- **Zustand**: estado de sessão do dono do bar (estabelecimento ativo, rascunho em edição) fica em store local do `web-client`/`mobile-client`, não em `@agenda/core`, a menos que precise ser compartilhado com os apps públicos (não é o caso).
- **i18n**: toda string visível segue via `t()`, mesmo que o protótipo Lovable tenha tudo hardcoded em pt-BR — é só referência visual, não referência de código.

---

## 12. Checklist de Execução (peça por item)

### Fase 1 — Fundação
- [ ] Setup dos workspaces `apps/web-client` (Next.js) e estrutura inicial de pastas
- [ ] Tela de login/cadastro (e-mail+senha, Google, recuperação de senha)
- [ ] Vínculo conta ↔ estabelecimento + RLS de isolamento
- [ ] Onboarding wizard (3 passos)

### Fase 2 — Perfil
- [ ] Tela `/perfil` — seção Identidade
- [ ] Tela `/perfil` — seção Localização & Contato
- [ ] Tela `/perfil` — seção Operação (incluindo os 36 diferenciais oficiais)
- [ ] Tela de cardápio estruturado

### Fase 3 — Eventos
- [ ] Listagem `/eventos` (grid + estado vazio)
- [ ] Formulário criar/editar evento
- [ ] Estado rascunho/publicado (schema + filtro no feed público)
- [ ] Cortesia/Promoção na tela de evento
- [ ] Eventos recorrentes (opcional)
- [ ] Moderação de conteúdo (opcional)

### Fase 4 — Avaliações
- [ ] Schema de avaliações individuais + RLS
- [ ] Tela `/avaliacoes` (listagem, filtros, paginação)
- [ ] Aprovação/recusa de comentários
- [ ] Resposta pública
- [ ] Tela de avaliação no app/site público

### Fase 5 — Métricas
- [ ] Instrumentação de cliques nos botões existentes
- [ ] Schema de armazenamento de cliques/views
- [ ] Dashboard `/metricas`
- [ ] Exportação de relatório

### Fase 6 — App nativo
- [ ] Setup `apps/mobile-client` (Expo)
- [ ] Portar telas de Perfil/Cardápio
- [ ] Portar Agenda de eventos + push notifications
- [ ] Portar Métricas/Avaliações

### Fase 7 — Publicação
- [ ] Responsividade + testes
- [ ] Build assinado
- [ ] Identidade de loja (se Fase 6 aplicável)
- [ ] Submissão às lojas (se Fase 6 aplicável)
