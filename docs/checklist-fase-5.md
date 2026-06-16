# Checklist — Fase 5: Publicação nas Lojas

Runbook executável. Detalhes e fontes em [plano-de-acao-fase-5.md](file:///Users/titorm/git/agenda-de-boteco/docs/plano-de-acao-fase-5.md).
Marque cada caixa em ordem. **Não pular** — a ordem evita re-trabalho de revisão.
Todos os comandos `eas` rodam com `cwd` em `apps/mobile`.

---

## 🔴 Bloqueadores — resolver ANTES de buildar

- [ ] **Privacy Policy** publicada em URL HTTPS (ex.: rota `/privacidade` do build web), cobrindo localização precisa + Google Maps + Supabase como processadores.
- [ ] **`usesNonExemptEncryption: false`** adicionado em `ios.config` no `app.config.ts` (senão build trava em "Missing Compliance" e não vai ao TestFlight).
- [ ] **Prominent disclosure de localização in-app** existe (aviso antes do prompt do SO) — exigência Google. A string do `expo-location` **não** conta.
- [ ] Build de produção aponta para **Supabase de produção** (não dev/staging) e RLS libera leitura pública de eventos `published`.

## 🤖 Deploy automatizado (setup único)

> Setup completo em [deploy-automatizado-fase-5.md](file:///Users/titorm/git/agenda-de-boteco/docs/deploy-automatizado-fase-5.md). Depois disso, `git push` em `alfa`/`beta`/`release` publica sozinho.

**GitHub → Settings → Secrets and variables → Actions:**
- [ ] **Secret** `EXPO_TOKEN` (gerado em expo.dev → Access Tokens). Único segredo.
- [ ] **Variable** `EAS_PROJECT_ID` (do `eas init`).
- [ ] **Variable** `ASC_APP_ID` (Apple ID do app no ASC).

**Credenciais no EAS (`eas credentials`, tudo gerenciado — nada no git):**
- [ ] iOS: Distribution Cert + Provisioning Profile + ASC API Key (`.p8`).
- [ ] Android: Keystore (backup!) + Google Service Account Key.

**Env vars do app no EAS** (`eas env:create`, por environment):
- [ ] `development` (canal alfa), `preview` (canal beta), `production` (canal release).
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (sensitive), `GOOGLE_MAPS_API_KEY_IOS`/`_ANDROID` (sensitive), `EXPO_PUBLIC_SHARE_BASE_URL`.
- [ ] `eas env:list --environment production` confere os valores.
- [ ] **Nada** de `.env`, JSON de Service Account ou keystore commitado.

**Antes do 1º deploy automático:**
- [ ] 1º upload **manual** do AAB no Play Console (limitação da API Google).
- [ ] `git push alfa` valida o pipeline ponta a ponta (verify → deploy → TestFlight/Internal).

## T5.1 — Empacotamento Seguro (6h)

- [ ] `pnpm dlx eas-cli@latest login` + `whoami` OK.
- [ ] `eas init` → colar `extra.eas.projectId` no `return` do `app.config.ts` (não há `app.json`).
- [ ] `eas credentials` (iOS): Distribution Certificate + Provisioning Profile gerados (login Apple 1x).
- [ ] `eas credentials` (Android): keystore gerado e **backup guardado** (nunca regenerar após publicar).
- [ ] `eas credentials` (Android) → Google Service Account configurada (ou `serviceAccountKeyPath` via env var em CI).
- [ ] Google Maps API key **restrita** no Google Cloud (package + SHA-1 / bundle ID + APIs específicas).
- [ ] `eas build --platform all --profile production` conclui → `.aab` (Android) + `.ipa` (iOS). *(versão remota inicia em 1)*
- [ ] Binário testado em **device físico** (app exibe conteúdo, mapa funciona, sem crash).

## T5.2 — Identidade de Loja (8h)

**No binário (`app.config.ts`):**
- [ ] Splash dark com `splash-icon.png` + bloco `dark` (#0F0F0F).
- [ ] `adaptiveIcon.monochromeImage` referenciado.
- [ ] `android-icon-foreground.png` reexportado **com alfa** e arte dentro do círculo de 66 dp.
- [ ] `sips -g hasAlpha apps/mobile/assets/icon.png` → **`hasAlpha: no`** (evita ITMS-90717).

**Listagem (manual nos consoles — `eas submit` NÃO sobe estes):**
- [ ] Ícone Play **512×512 PNG 32-bit**, ≤ 1024 KB.
- [ ] Feature graphic Play **1024×500**, PNG 24-bit **sem alfa** (ou JPEG).
- [ ] Screenshots **iPhone 6.9"** (dimensão confirmada no media manager do ASC), tema dark, app em uso.
- [ ] Screenshots **iPad 13" (2064×2752)** — obrigatório (`supportsTablet: true`).
- [ ] Screenshots **Android** ≥ 4 em ≥ 1080 px, sem alfa.

## T5.3 — Submissão (12h)

**iOS — App Store Connect:**
- [ ] App criado (Bundle ID `com.agenda.boteco`, PT-BR, nome ≤ 30 chars) — ou auto-criado via `eas submit`.
- [ ] App Privacy: Precise Location / App Functionality / Not tracking / Linked = **Yes** (dados sob `auth.uid()`).
- [ ] **Age Rating (novo sistema)** preenchido — álcool declarado honestamente (≈16+).
- [ ] Privacy Policy URL + categoria (Food & Drink / Lifestyle).
- [ ] `eas submit -p ios --profile alfa --latest` → build **ativo no TestFlight** (sem "Missing Compliance").

**Android — Play Console:**
- [ ] App criado; **1º upload MANUAL do AAB** feito (trava o package).
- [ ] Service Account JSON criado, API habilitada, permissão de release no track internal (≈24 h p/ ativar).
- [ ] `eas submit -p android --profile alfa --latest` → build no **Internal testing**.
- [ ] App content completo: **Data safety** (Precise location + Maps), **Content rating** (IARC), **Target audience** (só adultos), **Ads** (No), **App access** (sem login), **Privacy policy**.
- [ ] **Pre-launch report** sem crashes bloqueantes.

**Promoção → Produção:**
- [ ] iOS: ASC > App Store > **Submit for Review**.
- [ ] Android: **Closed testing ≥ 12 testers por 14 dias** concluído *se conta pessoal pós-13/11/2023* → depois Promote para Production.

## ✅ Antes de declarar concluído

- [ ] `turbo run test` passa (testes de `services`/`utils` cobrem qualquer mudança).
- [ ] `pnpm lint` sem avisos na raiz.
- [ ] App Privacy (Apple) e Data Safety (Google) **batem** com as permissões reais e entre si.

---

## ⚠️ Comandos que NÃO existem / quebram (decorar)

| ❌ | ✅ |
| :--- | :--- |
| `--auto-submit-profile <p>` | `--auto-submit-with-profile <p>` (flag real) |
| `eas build ... --auto-submit` (com `--profile production`) | usar perfil de canal (`alfa`/`beta`) explícito |
| `eas secret:create` | `eas env:create --type file --visibility secret` |
| `eas submit:list` | `eas build:list` / dashboard expo.dev |
| valores de env/segredos no git | `eas env:create` · GitHub Secrets · `eas credentials` |
| editar `Info.plist`/`AndroidManifest.xml` | editar `app.config.ts` (fluxo CNG) |
