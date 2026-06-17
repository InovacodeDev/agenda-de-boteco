# Play Console — Ficha de configuração do app (copiar/colar)

Conteúdo pronto para preencher **todas as etapas** de "Configurar o app", "Lançar o app",
"Pré-registro" e faixas de teste do **Agenda de Boteco** (`com.agenda.boteco`) na Google Play
Console. Tudo abaixo foi derivado do código real do app (ver `docs/plano-de-acao-fase-5.md`).

> **Premissas confirmadas com o titular do produto:**
>
> - Conta Play de **organização / anterior a 13/11/2023** → pode ir de teste interno direto para
>   produção (sem o requisito de 12 testers por 14 dias).
> - Política de privacidade publicada na rota web do próprio app:
>   **<https://agenda-do-boteco.inovacode.dev/privacidade>** (criada em `apps/mobile/app/privacidade.tsx`).
> - IARC: app é **descoberta de bares/eventos**, não foca em venda de álcool.

> ⚠️ **Ajuste o e-mail/URLs antes de enviar.** Onde aparecer `contato@inovacode.dev`,
> `agenda-do-boteco.inovacode.dev` ou telefone, troque pelos dados oficiais reais se diferirem.

---

## 0. Verdade do app (resumo factual que ancora todas as respostas)

| Fato | Valor |
| :--- | :--- |
| Nome | Agenda de Boteco |
| Package | `com.agenda.boteco` |
| Idioma principal | Português (Brasil) — `pt-BR` |
| Gratuito | Sim (sem compras no app, sem assinatura) |
| Anúncios | **Não** (nenhum SDK de ads) |
| Login | Opcional — e-mail (OTP), Google, Apple (Supabase Auth) |
| Login obrigatório? | **Não.** Tudo essencial funciona sem conta; login só para sincronizar favoritos |
| Coleta localização | Sim, **precisa**, foreground apenas, sob demanda (não em background) |
| Coleta e-mail/nome | Sim, **só** se o usuário fizer login |
| Favoritos/preferências | Local + Supabase (quando logado) |
| Pagamentos / dados financeiros | **Não** |
| Conteúdo gerado por usuário | **Não** (na v1; reviews só na v3) |
| Analytics / crash / device ID | **Não** (nenhum SDK) |
| Processadores terceiros | Supabase (backend/auth), Google Maps Platform (mapas/rotas) |
| Categoria | **Comida e bebida** (principal); alternativa: Estilo de vida |
| Classificação etária pretendida | 18+ (vida noturna / álcool) |

---

## 1. CONFIGURAR O APP

### 1.1 Definir Política de Privacidade

- **URL da política de privacidade:**

  ```
  https://agenda-do-boteco.inovacode.dev/privacidade
  ```

  > Página criada em `apps/mobile/app/privacidade.tsx`. Ela só fica ativa **depois** que o build
  > web (`web.output: 'static'`) for publicado nessa URL. Publique o web antes de enviar a ficha,
  > ou o Google rejeita o link.

### 1.2 Detalhes do login (App access)

A navegação principal (buscar e ver bares/eventos) **não** exige conta, mas **favoritar depende de
login**. Como o login é por OTP (código por e-mail) e o revisor do Google não recebe esse e-mail,
fornecemos uma **credencial de teste** via OTP de teste do Supabase (ver seção 4 deste documento).

Selecione: **"Parte da funcionalidade tem acesso restrito"**
(*Some functionality is restricted*) e cadastre **uma** instrução de login:

| Campo | Valor |
| :--- | :--- |
| Nome da instrução | `Login de teste (favoritos)` |
| Nome de usuário / e-mail | `test@gmail.com` |
| Senha | *(deixe em branco — o app não usa senha)* |
| Qualquer outra informação | ver texto abaixo |

**Texto para o campo "Qualquer outra instrução / informação" (copiar/colar):**

```txt
O login é opcional. Buscar e visualizar bares e eventos funciona sem conta.
O login só é necessário para salvar favoritos.

Para entrar como revisor:
1. Toque no avatar (aba Perfil) e em "Entrar", ou abra qualquer item e toque em favoritar.
2. Escolha "Continuar com e-mail".
3. Informe o e-mail: test@gmail.com
4. Toque em "Enviar código de acesso".
5. Na tela seguinte, digite o código de acesso: 123456
6. Toque em "Entrar". Você estará logado e poderá salvar favoritos.

Não é preciso receber nenhum e-mail: este é um código de teste fixo configurado
exclusivamente para a revisão.
```

> ⚠️ **Pré-requisito:** o par `test@gmail.com` → `123456` precisa estar cadastrado como **OTP de
> teste** no Supabase de **produção** antes de enviar a ficha. Passo a passo na seção 4.

#### 1.2.1 Métodos de criação de conta (questionário "Exclusão de conta e dados")

O app cria contas por **e-mail + OTP** (código por e-mail) e por **OAuth Google/Apple** (Supabase
Auth) — **não há senha**. Na pergunta *"Quais dos seguintes métodos de criação de contas são
oferecidos pelo app?"*, marque:

- ✅ **OAuth** (login com Google e Apple).
- ✅ **Nome de usuário e outras autenticações** (o e-mail + código OTP — "outras autenticações"
  cobre a senha de uso único / OTP).
- ❌ **Não** marque "Nome de usuário e senha" nem as opções com "senha" — o app não usa senha.
- ❌ **Não** marque "Meu app não permite que os usuários criem uma conta" — o app permite.

#### 1.2.2 URL para exclusão de conta (obrigatória)

```
https://agenda-do-boteco.inovacode.dev/excluir-conta
```

> Página criada em `apps/mobile/app/excluir-conta.tsx`. Atende aos 3 requisitos do Google: menciona
> o app, descreve os **passos** para excluir (in-app: Perfil → Excluir conta) e especifica os
> **dados apagados/mantidos** e o prazo. A exclusão real é feita pela Edge Function `delete-account`
> (ver seção 6). Só fica ativa após publicar o web (seção 5).

#### 1.2.3 Exclusão de dados sem excluir a conta (opcional)

A tela pergunta *"Você oferece aos usuários uma maneira de solicitar que alguns ou todos os dados
sejam excluídos, sem exigir a exclusão da conta?"*. O único dado de usuário gravado no servidor são
os **favoritos**, e o usuário já pode **remover cada favorito** dentro do app a qualquer momento.

- Recomendado: marque **"Sim"** e informe a **mesma URL** (ela cobre os dois casos):
  ```
  https://agenda-do-boteco.inovacode.dev/excluir-conta
  ```
- Alternativa válida: marque **"Não"** — o campo é opcional e a exclusão de conta já cobre a remoção
  de todos os dados. Se marcar "Não", deixe a URL de exclusão de dados em branco.

### 1.3 Anúncios (Ads)

Selecione: **"Não, meu app não contém anúncios"**.
(Nenhum SDK de anúncios no projeto — confirmado em `apps/mobile/package.json`.)

### 1.4 Classificação de conteúdo (IARC)

Inicie o questionário. **Categoria do app:** *Referência, notícias ou educação* **ou**
*Social / Estilo de vida* (ambas aceitas; escolha "Estilo de vida / Social").

Respostas-guia (responda com honestidade; estas refletem o app real):

| Pergunta do questionário | Resposta |
| :--- | :--- |
| Violência (realista/fantasia) | Não |
| Conteúdo sexual / nudez | Não |
| Linguagem imprópria | Não |
| Controlled substance / **álcool, tabaco, drogas** — o app **vende ou facilita a compra**? | **Não** (o app só lista/descobre bares e eventos; não vende nem processa pagamento) |
| O app **faz referência** a álcool/tabaco? | **Sim** — referencia bares e eventos onde se consome álcool |
| Jogos de azar / apostas com dinheiro real | Não |
| Compras dentro do app | Não |
| Compartilha localização do usuário com outros usuários | Não |
| Permite interação/comunicação entre usuários (chat, UGC) | Não |
| Conteúdo gerado por usuários compartilhado | Não |

> Resultado provável: classificação para **adolescentes/adultos** por referência a álcool. Aceite a
> classificação retornada pelo IARC. **Não** subdeclare a referência a álcool.

### 1.5 Público-alvo e conteúdo (Target audience)

- **Faixas etárias-alvo:** marque **apenas 18 anos ou mais**. **Não** marque nenhuma faixa infantil.
- "Seu app atrai crianças não intencionalmente?" → **Não** (conteúdo de vida noturna).
- Resultado: app **não** entra na Families Policy (correto — é incompatível com localização precisa
  e tema de bares).

### 1.6 Segurança dos dados (Data safety) — **a etapa mais importante**

#### Visão geral (respostas de topo)

| Pergunta | Resposta |
| :--- | :--- |
| Seu app coleta ou compartilha algum dos tipos de dados de usuário exigidos? | **Sim** |
| Todos os dados em trânsito são criptografados? | **Sim** (HTTPS) |
| Você fornece uma forma de o usuário solicitar a exclusão dos dados? | **Sim** — exclusão de conta in-app (Perfil → Excluir conta) + URL `https://agenda-do-boteco.inovacode.dev/excluir-conta` |
| Os dados coletados são necessários para o app ou o usuário pode escolher? | Misto — ver por tipo abaixo |

#### Tipos de dados a declarar

Marque **exatamente** estes tipos. Para cada um, as colunas são:
**Coletado** (sai do dispositivo p/ seu servidor) · **Compartilhado** (vai p/ terceiro) ·
**Finalidade** · **Obrigatório/Opcional** · **Vinculado à identidade**.

| Tipo de dado | Coletado | Compartilhado | Finalidade | Obrigatório? | Vinculado à identidade? |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **Localização → Localização precisa** | Sim | **Sim** (Google Maps) | Funcionalidade do app | **Opcional** (usuário pode recusar) | Não, se anônimo / **Sim** se logado* |
| **Informações pessoais → Endereço de e-mail** | Sim | Não | Funcionalidade do app; Gerenciamento de conta | Opcional (só se fizer login) | **Sim** |
| **Informações pessoais → Nome** | Sim | Não | Funcionalidade do app; Gerenciamento de conta | Opcional (só se fizer login) | **Sim** |
| **Atividade no app → Outras ações no app** (favoritos/preferências) | Sim | Não | Funcionalidade do app; Personalização | Opcional | **Sim** quando logado |
| **IDs do usuário** (ID de conta Supabase) | Sim | Não | Funcionalidade do app; Gerenciamento de conta | Opcional | **Sim** |

\* **Sobre "vinculado à identidade" na localização:** o app envia coordenadas para a RPC de
proximidade do Supabase. Quando o usuário está logado, a requisição traz o token da conta, então o
caminho mais seguro/honesto é declarar a **localização precisa como vinculada à identidade**.
A localização **não** é armazenada (recalculada a cada pedido) e **nunca** é usada para rastreamento.

#### O que **NÃO** marcar (declare ausência destes — comuns de errar)

- ❌ Telefone, foto, endereço físico do usuário
- ❌ Dados financeiros / informações de pagamento
- ❌ Dados de saúde e fitness
- ❌ Mensagens, contatos, calendário, arquivos/fotos do dispositivo
- ❌ **Histórico de navegação/pesquisa na web**
- ❌ **Apps instalados**
- ❌ Informações de diagnóstico / **registros de falhas** / desempenho (sem SDK)
- ❌ **Identificadores de publicidade / dispositivo** para ads
- ❌ Qualquer dado usado para **rastreamento** ou **publicidade**

#### Práticas de segurança (checkboxes finais)

- ✅ Dados criptografados em trânsito.
- ✅ Usuário pode solicitar a exclusão dos dados.
- ✅ Comprometido com a Families Policy? → **Não aplicável** (público 18+).
- ✅ Houve revisão independente de segurança? → Opcional, pode deixar "Não".

> **Regra de consistência:** Data safety, a Política de Privacidade (`/privacidade`) e as permissões
> do `AndroidManifest.xml` (FINE/COARSE_LOCATION, INTERNET) **devem bater**. Os três já estão
> alinhados nesta ficha.

### 1.7 Apps governamentais

Selecione: **"Não"** (não é um app de órgão governamental).

### 1.8 Recursos financeiros (Financial features)

Selecione: **"Meu app não oferece nenhum recurso financeiro"**.
(Sem pagamentos, empréstimos, cripto, investimentos.)

### 1.9 Saúde (Health)

Selecione: **"Não"** — o app não é de saúde e não coleta dados de saúde.
(Se aparecer questionário Health Apps Declaration, responda "Não" a todas.)

### 1.10 Selecionar categoria e detalhes de contato

- **Categoria do app:** **Comida e bebida** (*Food & Drink*).
  - Alternativa aceitável: **Estilo de vida** (*Lifestyle*).
- **Tags:** bares, eventos, vida noturna, agenda, música ao vivo (escolha entre as sugeridas).
- **E-mail de contato:** `contato@inovacode.dev` *(ajuste se necessário)*.
- **Telefone:** opcional — preencha se tiver um número de suporte.
- **Site:** `https://agenda-do-boteco.inovacode.dev` *(ajuste se necessário)*.

### 1.11 Configurar a página "Detalhes do app" (Store listing)

#### Nome do app (máx. 30 caracteres)

```txtx
Agenda de Boteco
```

(16 caracteres ✅)

#### Descrição breve (máx. 80 caracteres)

```txt
Descubra bares, botecos e os melhores eventos de música ao vivo perto de você.
```

(78 caracteres ✅)

#### Descrição completa (máx. 4000 caracteres)

```txt
A Agenda de Boteco é o seu guia da noite. Descubra os melhores bares, botecos e eventos de música ao vivo da sua cidade — tudo em um só lugar, sem complicação.

O QUE VOCÊ ENCONTRA

• Eventos perto de você: shows, happy hours, sertanejo, samba, pagode, rock e muito mais, com data, horário e local.
• Bares e botecos: explore os pontos da cidade pelo estilo musical, pela vibe e pela distância.
• Perto de mim: ative a localização e veja o que está rolando ao seu redor agora.
• Filtros inteligentes: busque por estilo de música, data, faixa de preço, avaliação e "aberto agora".
• Favoritos: salve os eventos e lugares que você não quer perder e leve sua lista para qualquer dispositivo.
• Direto ao ponto: chame o bar no WhatsApp ou trace a rota no mapa com um toque.

FEITO PARA QUEM AMA A NOITE

Escolha sua cidade e tenha a programação na palma da mão. A Agenda de Boteco reúne a cena local para você decidir rápido onde a noite vai ser boa.

GRATUITO E SEM ANÚNCIOS

O app é totalmente gratuito, sem anúncios e sem compras dentro do app. Pedimos sua localização apenas quando você quer ver o que está perto — você sempre pode recusar e escolher a cidade manualmente.

Baixe agora e descubra a melhor agenda de boteco da sua cidade.

Aviso: conteúdo destinado a maiores de 18 anos. Beba com responsabilidade.
```

#### Ícone do app (na listagem)

- **512×512 PNG 32-bit com alfa**, ≤ 1 MB, fundo `#0F0F0F`, sem cantos/sombra manuais.
- Gere a partir de `apps/mobile/assets/icon.png` (1024×1024). Ver `docs/plano-de-acao-fase-5.md` 5.2.3.

#### Gráfico de destaque / Feature graphic

- **1024×500**, JPEG ou **PNG 24-bit SEM canal alfa** (obrigatório para publicar).

#### Capturas de tela (telefone)

- Mínimo **2**, ideal **≥ 4**, em **≥ 1080 px**; JPEG/PNG 24-bit sem alfa; tema dark; app real em uso.
- Sugestão de telas: Feed de eventos, Filtros, Detalhe do evento, Favoritos.

#### Vídeo (opcional)

- Pode deixar em branco no lançamento.

---

## 2. LANÇAR O APP — faixas de teste e versão

> Como a conta é de organização/antiga, o caminho recomendado é:
> **Teste interno → (validar) → Produção.** Faixa aberta e teste fechado são opcionais.

### 2.1 Selecionar países e regiões

- **Brasil** (mínimo). Adicione outros países lusófonos se desejar (Portugal etc.), mas o conteúdo
  é pt-BR e focado em cidades brasileiras — recomendo **somente Brasil** no lançamento.

### 2.2 Criar e lançar uma versão (AAB)

> ⚠️ **O 1º upload do AAB é manual** no Play Console (limitação da API do Google). Só depois o
> `eas submit` automatiza. Gere o binário com:
>
> ```bash
> # cwd = apps/mobile
> eas build --platform android --profile production
> ```
>
> O EAS produz um **.aab assinado** (novos apps só aceitam AAB). O `versionCode` é gerido no
> servidor EAS (começa em 1).

- **Nome da versão (release name):** `1.0.0 (1)` ou apenas `1.0.0`.
- **Notas da versão (`pt-BR`):**

  ```txt
  Primeira versão da Agenda de Boteco: descubra bares, botecos e eventos de música ao vivo perto de você, salve seus favoritos e filtre por estilo, data e distância.
  ```

### 2.3 Visualizar, confirmar e enviar para revisão

- Revise o **Pre-launch report** (testes em devices reais) antes de promover.
- Confirme que o build aponta para o **Supabase de produção** (senão o app aparece vazio na revisão).

---

## 3. PRÉ-REGISTRO (opcional)

Só faz sentido se você quiser construir uma base de interessados **antes** do lançamento. Etapas:

1. **Fazer upload de um pacote de apps ou APK:** suba o **AAB** de produção numa faixa.
2. **Selecionar países e regiões:** Brasil.
3. **Recompensa de pré-registro (opcional):** pode deixar em branco — o app é gratuito e não há
   item premium para oferecer.
4. **Enviar a versão ao Google para revisão.**

> **Recomendação:** se o objetivo é só publicar a v1, **pule o pré-registro** e vá direto para
> Teste interno → Produção. Use pré-registro apenas se for fazer campanha de lançamento.

---

## 4. CREDENCIAL DE TESTE PARA O REVISOR (OTP de teste no Supabase)

O app loga por OTP (código por e-mail) ou OAuth. O revisor do Google não recebe o e-mail nem faz
OAuth de uma conta que não é dele. A solução oficial — **sem alterar uma linha do código do app** e
**sem nenhum risco de segurança** — é cadastrar um par e-mail/código fixo no Supabase Auth. Esse
código só funciona para esse e-mail específico e não aparece no binário.

### Passo a passo (Supabase de produção)

1. Acesse o painel do Supabase do projeto de **produção** (o mesmo que o build de produção usa).
2. Vá em **Authentication → (Sign In / Providers ou Configuration) → Email**.
3. Habilite **Email OTP** (já deve estar, pois o app usa `signInWithOtp`).
4. Localize a seção **"Test OTP"** (em alguns painéis: *Manual Linking / Test phone numbers and
   emails* ou em **Auth → Configuration → "Test OTPs"**).
5. Adicione o par:

   | E-mail | Código (OTP) |
   | :--- | :--- |
   | `test@gmail.com` | `123456` |

6. Salve. A partir daí, ao informar `test@gmail.com` no app e pedir o código, **qualquer** tentativa
   com `123456` autentica sem enviar e-mail real.

> **Como funciona no app:** o fluxo "Continuar com e-mail" chama `signInWithEmailOtp('test@gmail.com')`
> (`apps/mobile/src/services/auth.ts:92`) e depois `verifyEmailOtp('test@gmail.com', '123456')`
> (`auth.ts:107`). O Supabase reconhece o par de teste e devolve uma sessão válida — o app não
> precisa de nenhum tratamento especial.

### Por que NÃO hardcodar um token no app

- Um token de sessão Supabase é um JWT **assinado pelo servidor e expira** — não há token "fixo" válido.
- Um bypass hardcodado iria para o **APK de produção**: qualquer um que descompilasse o app entraria
  na conta de teste, e a revisão de segurança do Google reprovaria.
- O OTP de teste vive **só no servidor**, é revogável a qualquer momento e não vaza no binário.

> Se um dia precisar de bypass para testes locais/E2E (sem depender da rede), a alternativa segura é
> um atalho protegido por env var (`EXPO_PUBLIC_QA_LOGIN`) que **só** existe em builds de QA/preview e
> some no build de produção. Não é necessário para a revisão da loja.

---

## 5. PUBLICAR O WEB DO EXPO EM UM DOMÍNIO (para a URL `/privacidade`)

A Política de Privacidade vive em `apps/mobile/app/privacidade.tsx` e só fica acessível depois que o
**target web** do app for publicado. O app já está configurado para SSG (`web.output: 'static'` em
`app.config.ts:50`). O caminho mais direto é o **EAS Hosting** (mesma conta `inovacode` do EAS).

### 7.1 Exportar o site estático

```bash
# cwd = /Users/titorm/git/agenda-de-boteco/apps/mobile
npx expo export --platform web
```

Gera a pasta **`dist/`** com o site estático (inclui a rota `/privacidade`).

### 7.2 Publicar no EAS Hosting

```bash
# cwd = apps/mobile  (precisa estar logado: eas login)
eas deploy            # cria um deploy de PREVIEW com URL temporária (https://<hash>--<project>.expo.app)
eas deploy --prod     # publica na URL de PRODUÇÃO estável (https://<project>.expo.app)
```

- `eas deploy` → URL de preview (boa para validar antes).
- `eas deploy --prod` → promove para a URL de produção raiz do projeto.
- Promover um deploy já existente para produção:
  `eas deploy:alias --prod --id=<deploymentId>`.

> Cada publicação exige rodar o `npx expo export --platform web` antes (o deploy sobe o conteúdo de
> `dist/`).

### 7.3 Domínio customizado (`agenda-do-boteco.inovacode.dev`)

Domínio customizado em EAS Hosting é **plano pago** e configurado pelo **dashboard** (não pela CLI):

1. No dashboard do Expo → projeto → **Hosting → Settings → Custom domain**, informe
   `agenda-do-boteco.inovacode.dev`.
2. O dashboard mostra **3 registros DNS** — crie-os no seu provedor de DNS, **na ordem apresentada**
   (para troca sem downtime):
   - **TXT** de verificação em `_cf-custom-hostname.agenda-do-boteco.inovacode.dev` (prova de posse).
   - **CNAME** de SSL em `_acme-challenge.agenda-do-boteco.inovacode.dev` (validação do certificado).
   - **CNAME** de roteamento em `agenda-do-boteco.inovacode.dev` → `origin.expo.app`.
3. No dashboard, clique em atualizar/refresh até todas as verificações passarem (alguns minutos).
4. Pronto: a política fica em `https://agenda-do-boteco.inovacode.dev/privacidade`.

> **Sem domínio próprio (atalho):** se não quiser configurar DNS agora, use a URL `*.expo.app` do
> `eas deploy --prod` (ex.: `https://agenda-de-boteco.expo.app/privacidade`) **diretamente** nos
> campos de Política de Privacidade dos consoles. É uma URL HTTPS válida e o Google/Apple aceitam.
> Depois você pode trocar pela do domínio próprio. **Se usar a URL `*.expo.app`, ajuste o link da
> política na seção 1.1 e na rota para a URL real publicada.**

### 7.4 Alternativas de hosting (se não quiser EAS Hosting)

Qualquer host de estático serve o conteúdo de `dist/`:

- **Vercel:** `npx expo export --platform web` e aponte o output dir para `dist/` (ou use o adapter
  de Expo). Configure o domínio na Vercel.
- **Cloudflare Pages / Netlify / GitHub Pages:** suba o conteúdo de `dist/`.

> Em qualquer host, garanta o **fallback de SPA** para rotas (servir `index.html` em 404) ou que o
> arquivo estático de `/privacidade` seja gerado — com `output: 'static'` a rota vira um HTML próprio,
> então normalmente funciona sem config extra.

---

## 6. EXCLUSÃO DE CONTA (in-app + Edge Function)

A Play Console exige uma URL de exclusão de conta e que ela seja **funcional**. Implementamos a
exclusão **real** (não só um e-mail manual):

- **UI:** botão "Excluir conta" no Perfil (`apps/mobile/app/(tabs)/profile.tsx`) com confirmação
  destrutiva → chama `useAuthStore.deleteAccount()` → `services/auth.ts deleteAccount()`.
- **Backend:** Edge Function `delete-account` (`supabase/functions/delete-account/index.ts`). A anon
  key do app **não** pode apagar `auth.users`; a função valida o JWT do usuário e chama
  `admin.deleteUser(uid)` com a **service_role** key (segredo só no servidor). A FK
  `user_favorites.user_id ... ON DELETE CASCADE` apaga os favoritos junto.
- **Página pública:** `apps/mobile/app/excluir-conta.tsx` → URL da seção 1.2.2.

### 6.1 Deploy da Edge Function

```bash
# cwd = /Users/titorm/git/agenda-de-boteco  (Supabase CLI, projeto de produção linkado)
supabase functions deploy delete-account
```

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente
  pelo runtime do Supabase — **não** precisa configurar segredo manualmente para essas três.
- Teste rápido (logado no app, ou via curl com um JWT de usuário válido):
  ```bash
  curl -X POST "https://<project>.supabase.co/functions/v1/delete-account" \
    -H "Authorization: Bearer <jwt-do-usuário>" -H "apikey: <anon-key>"
  # -> {"success":true}
  ```

> ⚠️ A exclusão é **definitiva**. Em produção, garanta que a função aponta para o projeto Supabase
> correto antes de testar com uma conta real.

---

## 7. CHECKLIST DE BLOQUEADORES (resolver antes de enviar)

- [X] **Política de privacidade publicada** em `https://agenda-do-boteco.inovacode.dev/privacidade`
      (build web no ar — ver seção 5). Rota já criada em `apps/mobile/app/privacidade.tsx`.
- [X] **Credencial de teste do revisor** cadastrada: OTP de teste `teste@gmail.com` → `123456` no
      Supabase de produção (ver seção 4). Necessária porque favoritar exige login.
- [X] **URL de exclusão de conta publicada** em `https://agenda-do-boteco.inovacode.dev/excluir-conta`
      (build web no ar — ver seção 5). Rota criada em `apps/mobile/app/excluir-conta.tsx`.
- [X] **Edge Function `delete-account` deployada** no Supabase de produção (ver seção 6.1) — exige
      que o botão "Excluir conta" do Perfil funcione de verdade.
- [X] **Aviso de localização in-app (prominent disclosure)** antes do prompt do SO, com opção de
      recusar — exigência do Google. A string do `expo-location` **não** substitui isso.
      *(Pendência de implementação se ainda não existir na UI de onboarding/feed.)*
- [X] **AAB de produção** assinado, apontando para **Supabase de produção**.
- [X] **Assets de loja:** ícone 512, feature graphic 1024×500, ≥ 2 screenshots (ideal 4) em tema dark.
- [X] **1º upload manual do AAB** feito (depois `eas submit -p android --profile alfa --latest`).
- [X] **Service Account JSON** configurada para automação (nunca commitar — usar EAS).
- [X] **Restringir a Google Maps API key** no Google Cloud (package + SHA-1).
- [X] Data safety, Política de Privacidade e `AndroidManifest.xml` **consistentes** entre si.

---

## 8. RESPOSTA RÁPIDA (cola de uma linha por etapa)

| Etapa | Resposta |
| :--- | :--- |
| Política de Privacidade | `https://agenda-do-boteco.inovacode.dev/privacidade` |
| Detalhes do login | Acesso restrito; credencial `teste@gmail.com` / código `123456` (OTP de teste do Supabase) |
| Métodos de criação de conta | OAuth + "Nome de usuário e outras autenticações" (e-mail+OTP); **sem** senha |
| URL exclusão de conta | `https://agenda-do-boteco.inovacode.dev/excluir-conta` |
| Anúncios | Não contém anúncios |
| Classificação de conteúdo | Estilo de vida/Social; **referencia** álcool, **não vende** |
| Público-alvo | Apenas 18+; não atrai crianças |
| Segurança dos dados | Coleta: localização precisa, e-mail, nome, favoritos, ID de usuário; **sem** ads/tracking/crash; criptografado; exclusão disponível |
| Apps governamentais | Não |
| Recursos financeiros | Nenhum |
| Saúde | Não |
| Categoria | Comida e bebida |
| Idioma | Português (Brasil) |
| Países | Brasil |
| Monetização | Gratuito, sem compras |
