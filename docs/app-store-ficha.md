# App Store Connect — Ficha de configuração do app (copiar/colar)

Conteúdo pronto para preencher **todas as etapas** de envio do **Agenda de Boteco**
(`com.agenda.boteco`) na **App Store Connect** da Apple. Tudo abaixo foi derivado do código real do
app e é o equivalente iOS da ficha da Google Play (`docs/play-store-ficha.md`).

> **Premissas confirmadas com o titular do produto (iguais à ficha Android):**
>
> - Política de privacidade publicada na rota web do próprio app:
>   **<https://agenda-do-boteco.inovacode.dev/privacidade>** (criada em `apps/mobile/app/privacidade.tsx`).
> - O app é **descoberta de bares/eventos**, não vende nem facilita compra de álcool.
> - Login opcional; só necessário para sincronizar favoritos.
>
> ⚠️ **Ajuste o e-mail/URLs antes de enviar.** Onde aparecer `contato@inovacode.dev`,
> `agenda-do-boteco.inovacode.dev` ou telefone, troque pelos dados oficiais reais se diferirem.
>
> **Particularidades da Apple vs. Google (leia antes de começar):**
>
> - A Apple exige **Sign in with Apple** sempre que o app oferece outros logins sociais (Google). O
>   app **já implementa** Apple (`src/services/auth.ts:9` — `AuthProvider = 'google' | 'apple'`). ✅
> - "Data safety" do Google vira **App Privacy ("nutrition label")** na Apple — modelo de perguntas
>   diferente, ver seção 1.6.
> - A classificação etária (**Age Rating**) é um questionário próprio da Apple, ver seção 1.4.
> - Há um campo obrigatório de **Export Compliance** (criptografia) — já resolvido no
>   `app.config.ts` (`ios.config.usesNonExemptEncryption: false`), ver seção 1.12.
> - Capturas de tela seguem **tamanhos de dispositivo Apple** (6.7" e 6.5" obrigatórios), ver 1.11.

---

## 0. Verdade do app (resumo factual que ancora todas as respostas)

| Fato | Valor |
| :--- | :--- |
| Nome | Agenda de Boteco |
| Bundle ID | `com.agenda.boteco` |
| SKU (interno, livre) | `agenda-de-boteco-ios` |
| Idioma principal | Português (Brasil) — `pt-BR` |
| Gratuito | Sim (sem compras no app, sem assinatura) |
| Anúncios | **Não** (nenhum SDK de ads) |
| Login | Opcional — e-mail (OTP), Google, **Apple** (Supabase Auth) |
| Login obrigatório? | **Não.** Tudo essencial funciona sem conta; login só para sincronizar favoritos |
| Coleta localização | Sim, **precisa**, foreground apenas (when in use), sob demanda (não em background) |
| Coleta e-mail/nome | Sim, **só** se o usuário fizer login |
| Favoritos/preferências | Local + Supabase (quando logado) |
| Pagamentos / dados financeiros | **Não** |
| Conteúdo gerado por usuário | **Não** (na v1; reviews só na v3) |
| Analytics / crash / device ID | **Não** (nenhum SDK) |
| Rastreamento (App Tracking Transparency) | **Não** — não há tracking, logo **sem** prompt do ATT |
| Processadores terceiros | Supabase (backend/auth), Google Maps Platform (mapas/rotas) |
| Categoria principal | **Food & Drink** (Comida e bebida) |
| Categoria secundária | **Lifestyle** (Estilo de vida) |
| Age Rating pretendido | 17+ (referência a álcool / vida noturna) |

---

## 1. APP STORE CONNECT — Configuração do app

### 1.0 Criar o registro do app (My Apps → "+")

| Campo | Valor |
| :--- | :--- |
| Plataforma | iOS |
| Nome | `Agenda de Boteco` |
| Idioma principal | Portuguese (Brazil) |
| Bundle ID | `com.agenda.boteco` (selecione o que foi criado no Apple Developer / EAS) |
| SKU | `agenda-de-boteco-ios` (qualquer string interna única) |
| Acesso de usuário | Full Access |

> Se o Bundle ID `com.agenda.boteco` ainda não existir no portal de Identifiers, o `eas build`/
> `eas submit` o registra automaticamente no primeiro build de produção iOS. Verifique em
> **developer.apple.com → Certificates, IDs & Profiles → Identifiers**.

### 1.1 Política de Privacidade (App Privacy → Privacy Policy URL)

- **URL da política de privacidade:**

  ```txt
  https://agenda-do-boteco.inovacode.dev/privacidade
  ```

  > Mesma página da ficha Android (`apps/mobile/app/privacidade.tsx`). Só fica válida **depois** de
  > publicar o build web (`web.output: 'static'`). Publique o web antes de enviar (ver seção 5).
  > A Apple **rejeita** o envio se a URL não responder.

### 1.2 Sign-In / App Review — credencial de teste para o revisor

O app loga por **OTP (código por e-mail)**, **Google** e **Apple**. O revisor da Apple não recebe o
e-mail OTP nem usa uma conta Google/Apple que não é dele. Como **favoritar exige login**, forneça uma
credencial de teste via **OTP de teste do Supabase** (mesma estratégia da ficha Android — ver seção 4).

Na aba **App Review Information** da versão, preencha:

| Campo | Valor |
| :--- | :--- |
| Sign-in required? | **Yes** (marque "Sign-in required") |
| User name | `teste@gmail.com` |
| Password | `123456` *(use o código OTP de teste aqui — ver nota abaixo)* |
| Notes | ver texto abaixo |

> ⚠️ O formulário da Apple só tem campos "User name" e "Password". Como o app não usa senha (é OTP),
> coloque o **código OTP de teste** (`123456`) no campo Password **e** explique o fluxo nas Notes.

**Texto para o campo "Notes" (App Review Information) — copiar/colar:**

```txt
O login é OPCIONAL. Buscar e visualizar bares e eventos funciona sem conta.
O login só é necessário para salvar favoritos.

Para entrar como revisor (login por e-mail + código, sem senha):
1. Toque no avatar (aba Perfil) e em "Entrar", ou abra qualquer item e toque em favoritar.
2. Escolha "Continuar com e-mail".
3. Informe o e-mail: teste@gmail.com
4. Toque em "Enviar código de acesso".
5. Na tela seguinte, digite o código de acesso: 123456
6. Toque em "Entrar". Você estará logado e poderá salvar favoritos.

Não é preciso receber nenhum e-mail: este é um código de teste fixo, configurado
exclusivamente para a revisão, válido apenas para este endereço.

LOCALIZAÇÃO: o app pede acesso à localização apenas em primeiro plano ("when in use")
e somente quando você toca em "Perto de mim". É possível recusar e escolher a cidade
manualmente — nenhuma funcionalidade essencial é bloqueada.

O app é gratuito, sem anúncios e sem compras no app.
```

> ⚠️ **Pré-requisito:** o par `teste@gmail.com` → `123456` precisa estar cadastrado como **OTP de
> teste** no Supabase de **produção** antes de enviar (passo a passo na seção 4). Mesmo requisito da
> ficha Android.

### 1.3 Anúncios e Rastreamento (ATT)

- O app **não contém anúncios** (nenhum SDK de ads — confirmado em `apps/mobile/package.json`).
- O app **não rastreia** usuários entre apps/sites de terceiros → **não** implementa o prompt de
  **App Tracking Transparency (ATT)** e **não** declara rastreamento na App Privacy (ver 1.6).

### 1.4 Age Rating (Classificação etária — questionário da Apple)

Em **App Information → Age Rating → Edit**, responda o questionário. Estas respostas refletem o app
real:

| Pergunta (Apple) | Resposta |
| :--- | :--- |
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content or Nudity | None |
| Profanity or Crude Humor | None |
| Horror/Fear Themes | None |
| Mature/Suggestive Themes | None |
| **Alcohol, Tobacco, or Drug Use or References** | **Infrequent/Mild** *(o app referencia bares e eventos onde se consome álcool; não vende nem facilita compra)* |
| Simulated Gambling | None |
| Contests | None |
| Medical/Treatment Information | None |
| Unrestricted Web Access | No |
| Gambling and Contests | No |

Perguntas adicionais:

| Pergunta | Resposta |
| :--- | :--- |
| Made for Kids? | **No** |
| Does your app contain age verification...? | Não aplicável |

> Resultado provável: **17+** por referência a álcool. **Aceite** a classificação retornada. **Não**
> subdeclare a referência a álcool (consistência com a IARC da Play). O app é de vida noturna e **não**
> deve entrar em "Made for Kids".

### 1.5 Categorias (App Information → Category)

- **Primary Category:** **Food & Drink** (Comida e bebida).
- **Secondary Category:** **Lifestyle** (Estilo de vida) — opcional, recomendado.

### 1.6 App Privacy ("nutrition label") — **a etapa mais importante**

Em **App Privacy → Get Started**. Equivalente ao "Data safety" do Google, mas com perguntas próprias
da Apple. Para cada tipo de dado: indique se é **coletado**, a **finalidade**, se é **vinculado à
identidade do usuário** (*linked to you*) e se é usado para **rastreamento** (*tracking*).

#### Pergunta inicial

| Pergunta | Resposta |
| :--- | :--- |
| Do you or your third-party partners collect data from this app? | **Yes** |

#### Tipos de dados a declarar

Marque **exatamente** estes. (Mesmos dados da ficha Android, remapeados para as categorias da Apple.)

| Categoria Apple → Tipo de dado | Coletado | Finalidade | Linked to user? | Usado para tracking? |
| :--- | :---: | :--- | :---: | :---: |
| **Location → Precise Location** | Sim | App Functionality | **Sim** se logado* | **Não** |
| **Contact Info → Email Address** | Sim | App Functionality | **Sim** | **Não** |
| **Contact Info → Name** | Sim | App Functionality | **Sim** | **Não** |
| **Identifiers → User ID** (ID de conta Supabase) | Sim | App Functionality | **Sim** | **Não** |
| **Usage Data → Product Interaction** (favoritos/preferências) | Sim | App Functionality, Personalization | **Sim** quando logado | **Não** |

\* **Sobre Precise Location "linked to you":** quando o usuário está logado, a requisição de
proximidade leva o token da conta, então o caminho mais honesto é declarar a **localização precisa
como vinculada à identidade**. A localização **não** é armazenada (recalculada a cada pedido) e
**nunca** é usada para tracking. Email/Nome só são coletados **se** o usuário fizer login.

> 💡 Na Apple, todos esses dados têm finalidade **"App Functionality"** (e Product Interaction também
> "Personalization"). **Nenhum** é "Third-Party Advertising", "Developer's Advertising or Marketing"
> nem "Analytics". **Nenhum** é usado para **Tracking** → o app **não** precisa do prompt ATT.

#### O que **NÃO** declarar (não marque nenhum destes)

- ❌ Health & Fitness · Financial Info · Payment Info
- ❌ Contacts · Photos/Videos · Audio · Files · Calendar · Reminders
- ❌ Phone Number · Physical Address · Sensitive Info
- ❌ Browsing History · Search History
- ❌ **Diagnostics / Crash Data / Performance Data** (sem SDK)
- ❌ **Advertising Data / Device ID** para ads
- ❌ Qualquer dado marcado como usado para **Tracking**

> **Regra de consistência:** App Privacy, a Política de Privacidade (`/privacidade`) e as strings de
> permissão do `Info.plist` (`NSLocationWhenInUseUsageDescription`, gerada pelo plugin
> `expo-location` em `app.config.ts:63`) **devem bater**. Os três já estão alinhados nesta ficha.

### 1.7 Sign in with Apple (obrigatório)

A Apple exige Sign in with Apple quando o app oferece outros provedores sociais de login (Google).

- O app **já implementa** Apple como provedor (`src/services/auth.ts` — `signInWithProvider('apple')`). ✅
- **Capability:** garanta que o entitlement **"Sign in with Apple"** está habilitado no App ID
  (o EAS adiciona automaticamente quando o provider é usado; confirme em Identifiers → seu App ID →
  Capabilities, ou no `eas.json`/config plugin se aplicável).
- **App Review:** se o revisor não conseguir usar Apple/Google, ele usará o **OTP de teste** (seção
  1.2 / 4). Mantenha o botão "Continuar com e-mail" visível.

### 1.8 In-App Purchases / Financeiro

- **Nenhuma** compra no app, assinatura ou recurso financeiro. Não configure produtos de IAP.
- Preço (Pricing and Availability): **Free**.

### 1.9 Content Rights (Direitos de conteúdo)

Em **App Information → Content Rights**:

- "Does your app contain, show, or access third-party content?" →
  Os dados de bares/eventos são do próprio serviço; **mapas** via Google Maps. Se marcar "contém
  conteúdo de terceiros", confirme que possui os direitos/licenças necessários (Google Maps Platform
  ToS cobre o uso de mapas). Em geral: marque **"No"** se o conteúdo de catálogo é próprio/curado.

### 1.10 Disponibilidade (Pricing and Availability)

- **Price:** Free (Tier 0).
- **Availability:** **Brasil** (mínimo). Adicione outros países lusófonos se desejar, mas o conteúdo
  é pt-BR e focado em cidades brasileiras — recomendo **somente Brasil** no lançamento.

### 1.11 Metadados da versão (Store Listing iOS)

#### Nome (App Name — máx. 30 caracteres)

```txt
Agenda de Boteco
```

(16 caracteres ✅)

#### Subtítulo (Subtitle — máx. 30 caracteres) *(campo exclusivo da Apple)*

```txt
Bares e eventos perto de você
```

(29 caracteres ✅)

#### Texto promocional (Promotional Text — máx. 170 caracteres, editável sem nova revisão)

```txt
Descubra bares, botecos e os melhores eventos de música ao vivo perto de você. Gratuito, sem anúncios.
```

(101 caracteres ✅)

#### Palavras-chave (Keywords — máx. 100 caracteres, separadas por vírgula, SEM espaços)

```txt
bar,boteco,evento,show,música,balada,vida noturna,agenda,happy hour,sertanejo,samba,pagode,rock,perto
```

> ⚠️ Limite de **100 caracteres no total** (contando vírgulas). Não repita palavras do nome/subtítulo
> (a Apple já indexa esses). Conte e ajuste se passar de 100. A string acima tem ~99 caracteres.

#### Descrição (Description — máx. 4000 caracteres)

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

#### Support URL (obrigatória) e Marketing URL (opcional)

| Campo | Valor |
| :--- | :--- |
| Support URL (obrigatória) | `https://agenda-do-boteco.inovacode.dev` *(ou página de suporte/contato)* |
| Marketing URL (opcional) | `https://agenda-do-boteco.inovacode.dev` |

#### Ícone do app

- A Apple usa o ícone **embutido no binário** (não há upload separado na listagem como no Google).
- Gerado de `apps/mobile/assets/icon.png` (1024×1024, sem alfa, sem cantos arredondados — a Apple
  arredonda). Confirme que o `icon.png` está em 1024×1024 PNG.

#### Capturas de tela (obrigatórias — tamanhos Apple)

A Apple exige por **tamanho de tela**, não por quantidade mínima genérica. Forneça pelo menos:

| Dispositivo | Resolução (retrato) | Obrigatório? |
| :--- | :--- | :---: |
| iPhone 6.7" (15/16 Pro Max) | 1290 × 2796 | **Sim** |
| iPhone 6.5" (11 Pro Max / XS Max) | 1242 × 2688 | **Sim** (ou 6.7" cobre as menores em alguns fluxos; suba os dois para segurança) |
| iPad 12.9" | 2048 × 2732 | Só se `supportsTablet` ativo* |

\* `ios.supportsTablet: true` está ligado em `app.config.ts:28`. Se você **não** quer suportar iPad,
mude para `false` e suba só screenshots de iPhone. Se mantiver `true`, a Apple **exige** screenshots
de iPad — gere também as do iPad 12.9".

- **Mínimo 3 screenshots** por tamanho (ideal 4–6), tema dark, app real em uso.
- Sugestão de telas: Feed de eventos · Filtros · Detalhe do evento · Favoritos.
- Formato: PNG ou JPEG, sem transparência, RGB.

#### App Preview (vídeo, opcional)

- Pode deixar em branco no lançamento.

### 1.12 Export Compliance (criptografia — campo obrigatório no envio)

A Apple pergunta sobre uso de criptografia a cada envio. O app só usa **HTTPS padrão** (criptografia
isenta).

- Já declarado no `app.config.ts`: **`ios.config.usesNonExemptEncryption: false`** (linha ~31).
- Com isso, o EAS/Xcode inclui `ITSAppUsesNonExemptEncryption = NO` no `Info.plist` e a Apple **não**
  pergunta novamente no envio.
- Se aparecer a pergunta manual: responda **"No"** (não usa criptografia não isenta / só HTTPS).

### 1.13 Routing App Coverage / Outros

- **Routing App Coverage File:** deixe em branco (o app não é um app de navegação que fornece direções
  ponto a ponto; ele só abre rota no mapa nativo).
- **Game Center / iCloud:** não aplicável.

---

## 2. ENVIAR O BUILD (IPA via EAS) e TestFlight

### 2.1 Gerar o build de produção iOS

> O primeiro build registra Bundle ID, certificados e provisioning profiles na conta Apple
> (gerenciados pelo EAS). Requer conta Apple Developer paga ($99/ano).

```bash
# cwd = apps/mobile
eas build --platform ios --profile production
```

- O EAS produz um **.ipa assinado** para distribuição na App Store.
- O `buildNumber` (equivalente ao versionCode) é gerido no servidor EAS (`autoIncrement`), ou
  defina manualmente se necessário.

### 2.2 Enviar para a App Store Connect

```bash
# cwd = apps/mobile
eas submit --platform ios --profile production --latest
```

- Requer **App Store Connect API Key** (`.p8` + Key ID + Issuer ID) configurada como **segredo no
  EAS** — **nunca** commitar (mesma regra de segredos da Fase 5). Ver `docs/play-store-ficha.md`
  seção análoga e a memória de deploy automatizado.
- Alternativa: upload manual via **Transporter** (app da Mac App Store) usando o `.ipa` baixado.

### 2.3 TestFlight (recomendado antes de produção)

- Após o processamento do build, ele aparece em **TestFlight**.
- **Teste interno:** adicione testers internos (membros da equipe ASC) — sem revisão da Apple.
- **Teste externo (opcional):** grupos externos exigem uma **revisão leve** do TestFlight (mais rápida
  que a revisão de App Store). Útil para validar com beta testers.
- Valide login OTP, localização "when in use", favoritos e Sign in with Apple no TestFlight antes de
  promover para produção.

### 2.4 Selecionar o build na versão e enviar para revisão

1. Em **App Store → iOS App → (versão 1.0)**, na seção **Build**, selecione o build processado.
2. Preencha **App Review Information** (seção 1.2), Export Compliance (1.12) e a App Privacy (1.6).
3. **Version Release:** escolha "Automatically release" ou "Manually release" após aprovação.
4. Clique em **Add for Review → Submit**.

> Confirme que o build aponta para o **Supabase de produção** (senão o app aparece vazio na revisão e
> a Apple reprova por "app incompleto").

---

## 3. CREDENCIAL DE TESTE PARA O REVISOR (OTP de teste no Supabase)

Idêntico à seção 4 da ficha Android — o mesmo par OTP de teste serve para Apple e Google. **Não**
duplicar a configuração: se já cadastrou para a Play, **já está pronto** para a Apple.

### Passo a passo (Supabase de produção)

1. Painel do Supabase do projeto de **produção** (o mesmo que o build de produção usa).
2. **Authentication → (Sign In / Providers ou Configuration) → Email** → habilite **Email OTP**
   (já habilitado, pois o app usa `signInWithOtp`).
3. Seção **"Test OTPs"** (ou *Manual Linking / Test phone numbers and emails*). Adicione:

   | E-mail | Código (OTP) |
   | :--- | :--- |
   | `test@gmail.com` | `123456` |

4. Salve. Ao informar `test@gmail.com` no app e pedir o código, qualquer tentativa com `123456`
   autentica **sem** enviar e-mail real.

> **Como funciona no app:** "Continuar com e-mail" chama `signInWithEmailOtp('test@gmail.com')`
> (`apps/mobile/src/services/auth.ts`) e depois `verifyEmailOtp('test@gmail.com', '123456')`. O
> Supabase reconhece o par de teste e devolve uma sessão válida — sem tratamento especial no app.
>
> **Por que NÃO hardcodar token no app:** mesmos motivos da ficha Android (JWT expira, vaza no
> binário, reprova na revisão de segurança). O OTP de teste vive **só no servidor** e é revogável.

---

## 4. PUBLICAR O WEB DO EXPO (para `/privacidade` e `/excluir-conta`)

Idêntico à seção 5 da ficha Android. As mesmas páginas web servem Apple e Google:

```bash
# cwd = apps/mobile
npx expo export --platform web   # gera dist/ com /privacidade e /excluir-conta
eas deploy                       # preview (URL temporária)
eas deploy --prod                # produção (URL estável *.expo.app)
```

- Domínio próprio (`agenda-do-boteco.inovacode.dev`) configurado pelo **dashboard** do Expo
  Hosting (plano pago) — ver `docs/play-store-ficha.md` seção 5.3.
- **Atalho sem domínio:** use a URL `*.expo.app` do `eas deploy --prod` diretamente no campo Privacy
  Policy URL da App Store. A Apple aceita qualquer URL HTTPS válida.

> A Apple **não** exige uma URL de exclusão de conta como campo separado (diferente do Google), mas
> **exige** que apps com criação de conta ofereçam **exclusão de conta dentro do app** (Guideline
> 5.1.1(v)). O app já atende: **Perfil → Excluir conta** → Edge Function `delete-account`
> (`supabase/functions/delete-account/index.ts`). Mantenha esse fluxo funcional — a Apple **testa**
> isso na revisão.

---

## 5. EXCLUSÃO DE CONTA IN-APP (Guideline 5.1.1(v) — obrigatória na Apple)

A Apple exige que qualquer app que permite criar conta ofereça **exclusão de conta acessível dentro do
app**. Já implementado (mesmo backend da ficha Android):

- **UI:** botão "Excluir conta" no Perfil (`apps/mobile/app/(tabs)/profile.tsx`) com confirmação
  destrutiva → `useAuthStore.deleteAccount()` → `services/auth.ts deleteAccount()`.
- **Backend:** Edge Function `delete-account` valida o JWT do usuário e chama `admin.deleteUser(uid)`
  com a `service_role` key. FK `user_favorites.user_id ... ON DELETE CASCADE` apaga os favoritos.
- **Deploy da função** (se ainda não feito):

  ```bash
  # cwd = repo root, Supabase CLI logado no projeto de produção
  supabase functions deploy delete-account
  ```

> ⚠️ A exclusão é **definitiva**. A Apple **vai exercitar** o botão "Excluir conta" durante a revisão
> — garanta que ele funciona de ponta a ponta no build de produção.

---

## 6. CHECKLIST DE BLOQUEADORES (resolver antes de enviar)

- [ ] **Conta Apple Developer** ativa (paga, $99/ano) e acesso à App Store Connect.
- [ ] **Bundle ID `com.agenda.boteco`** registrado nos Identifiers (EAS cria no 1º build iOS).
- [ ] **Sign in with Apple capability** habilitada no App ID (obrigatória por haver login Google).
- [ ] **Política de privacidade publicada** em `https://agenda-do-boteco.inovacode.dev/privacidade`
      (build web no ar — seção 4).
- [ ] **Credencial de teste do revisor** (OTP `test@gmail.com` → `123456`) no Supabase de produção
      (seção 3) — necessária porque favoritar exige login.
- [ ] **Exclusão de conta in-app** funcional (Guideline 5.1.1(v)) + Edge Function `delete-account`
      deployada (seção 5) — a Apple testa.
- [ ] **App Privacy ("nutrition label")** preenchida e consistente com `Info.plist` e a política
      (seção 1.6).
- [ ] **Age Rating** respondida com honestidade (álcool = Infrequent/Mild → 17+) (seção 1.4).
- [ ] **Export Compliance** resolvido (`usesNonExemptEncryption: false` já no `app.config.ts`) (1.12).
- [ ] **Build de produção iOS** assinado, apontando para **Supabase de produção**.
- [ ] **Capturas de tela** iPhone 6.7"/6.5" (e iPad 12.9" se `supportsTablet: true`), tema dark.
- [ ] **App Store Connect API Key** (`.p8`) configurada no **EAS** para `eas submit` (nunca commitar).
- [ ] **Restringir a Google Maps API key (iOS)** no Google Cloud (Bundle ID + restrição de app iOS).
- [ ] **App Review Notes** preenchidas com o fluxo de login OTP e o aviso de localização (seção 1.2).

---

## 7. RESPOSTA RÁPIDA (cola de uma linha por etapa)

| Etapa | Resposta |
| :--- | :--- |
| Nome | `Agenda de Boteco` |
| Subtítulo | `Bares e eventos perto de você` |
| Bundle ID | `com.agenda.boteco` |
| SKU | `agenda-de-boteco-ios` |
| Idioma principal | Portuguese (Brazil) |
| Categoria | Primária: Food & Drink · Secundária: Lifestyle |
| Preço | Free (Tier 0) |
| Países | Brasil |
| Política de Privacidade | `https://agenda-do-boteco.inovacode.dev/privacidade` |
| Support URL | `https://agenda-do-boteco.inovacode.dev` |
| Login de teste (App Review) | `test@gmail.com` / código `123456` (OTP de teste do Supabase) |
| Sign in with Apple | Habilitado (obrigatório — há login Google) |
| App Privacy | Coleta: localização precisa, e-mail, nome, ID de usuário, interação (favoritos); **sem** tracking/ads/crash; tudo "App Functionality"; criptografado em trânsito |
| App Tracking Transparency | Não aplicável (sem rastreamento) |
| Age Rating | 17+ (referência a álcool: Infrequent/Mild) |
| Compras no app | Nenhuma |
| Recursos financeiros | Nenhum |
| Export Compliance | `usesNonExemptEncryption: false` → "No" (só HTTPS) |
| Exclusão de conta | In-app: Perfil → Excluir conta (Guideline 5.1.1(v)) |
| Build/Submit | `eas build -p ios --profile production` → `eas submit -p ios --profile production --latest` |
