# Plano de migração de rotas PT → EN (issue #68)

Referência: [InovacodeDev/agenda-de-boteco#68](https://github.com/InovacodeDev/agenda-de-boteco/issues/68)

Este documento só planeja — nenhuma rota é migrada aqui. Migração é caso a caso, uma PR por rota (ou por app, quando o conjunto é pequeno e sem risco cruzado), sempre com redirect de convivência.

## Estratégia geral

1. **Toda rota migrada ganha redirect da URL antiga para a nova**, via `redirects()` no `next.config.ts` do app (Next) ou tela-ponte no Expo Router (mobile). Nenhum dos 5 apps tem `redirects()` configurado hoje — é a primeira vez que a chave aparece em algum `next.config.ts` deste repo.
2. Prazo de convivência sugerido: **permanente** para rotas públicas/SEO indexadas (`privacidade`, `excluir-conta`, `suporte`) — 301 não custa nada e protege contra link indexado/compartilhado que nunca mais é visto. Para rotas atrás de auth (painel/admin), o redirect pode ser removido depois de ~1 ciclo de release, já que não há bookmark de terceiro nem SEO em jogo — mas manter é mais barato que agendar remoção.
3. Cada migração atualiza, no mesmo commit: pasta da rota, todo `href`/`router.push` interno (mapeado abaixo), `redirects()`, e o CHANGELOG do app (Seção 8.1 do AGENTS.md).
4. **Rotas com zero ou um caller interno** (`avaliacoes`, `artistas`, `configuracoes`, `estabelecimentos`, `avisos` do admin, `cidade`) são as mais baratas e de menor risco — bons candidatos a primeira leva.
5. **Rotas citadas em `EventForm.tsx`/`EventCard.tsx`/`Sidebar.tsx`** (`eventos`, `eventos/novo`, `eventos/[id]`) têm mais callers, mas ainda são só dentro do próprio app — sem risco de deep link externo.
6. **Rotas públicas fora do grupo autenticado** (`privacidade`, `excluir-conta`, `suporte`) são as de maior risco: podem estar indexadas no Google e linkadas a partir das lojas (App Store/Play Store exigem link de política de privacidade e de exclusão de conta nas fichas do app). Migrar essas por último, com redirect permanente, e **conferir manualmente os links cadastrados no App Store Connect e no Play Console antes de trocar** (fora do repo, Seção "Apple/Google" abaixo).

## Decisões confirmadas com o usuário

- **`nova-senha` → migra mesmo assim para `new-password`**, com redirect de convivência, como rede de segurança para uma eventual configuração manual no Supabase Dashboard (Auth → Redirect URLs) que o grep não alcança. Nenhum caller interno precisa mudar.
- **`/bares` entra no mesmo lote de `/eventos`**, migrando para `/establishments` (nome já usado nos outros apps). Isso implica: `buildEstablishmentShareUrl` em `packages/core/src/utils/links.ts` passa a gerar `/establishments/{cidade}/{slug}`; `apps/mobile/src/utils/deepLinks.ts` (`mapWebPathToRoute`) precisa aceitar `first === 'establishments'` (mantendo `first === 'bares'` como alias de compatibilidade, já que é link já compartilhado); e o `redirects()` do `apps/web` cobre `/bares/:path*` → `/establishments/:path*`.
- **Lacuna de `INTERNAL_EXACT_ROUTES`** (não trata `/privacidade`/`/excluir-conta`) é corrigida no mesmo commit que migra `privacidade.tsx`/`excluir-conta.tsx` no mobile — adiciona `/privacy` e `/delete-account` (e mantém as entradas antigas como alias), com teste novo.

## Achados que bloqueiam ou alteram o escopo original

- **Nenhum teste cobre nenhuma das rotas em português** (`*.test.ts(x)` em `apps/mobile/src/utils/deepLinks.test.ts` e `nativeIntent.test.ts` só cobrem `/eventos/...`, `/bares/...` como paths de share, e as rotas internas já em inglês). Migrações no mobile devem vir com teste novo cobrindo o redirect/parsing — Regra 11 do AGENTS.md.
- **`/eventos` e `/bares` em `links.ts` não têm rota real correspondente em nenhum app hoje.** `apps/web/app/(app)/event/[id]` e `establishment/[id]` já usam singular inglês — não existe pasta `apps/web/app/(app)/eventos` nem `.../bares`. O único consumidor de `baseUrl` é `apps/mobile` (`event/[id].tsx`, `establishment/[id].tsx`), via `EXPO_PUBLIC_SHARE_BASE_URL`, que está **vazio no `.env.example` e não aparece em `apps/mobile/eas.json`** — ou seja, em produção essas funções hoje provavelmente só geram o deep link nativo (`agenda-de-boteco://event/{id}`), nunca a URL https `/eventos/...`. Risco real menor do que o path sugere, mas não zero: a env pode estar setada como secret só no EAS (fora do repo, não verificável aqui). Migrar o literal do path em `links.ts` para `/establishments` é seguro e não quebra nada hoje; se o usuário confirmar que `EXPO_PUBLIC_SHARE_BASE_URL` está vazio em produção também, a rota `/eventos` de `buildEventShareUrl` pode ser migrada para `/events` no mesmo commit sem redirect algum (nunca existiu link real publicado). Se estiver configurada, tratar como as demais rotas públicas (redirect permanente).

## Tabela por rota

### `apps/web-client` (basePath `/client`)

| Rota atual | Rota nova | Callers internos | Risco |
|---|---|---|---|
| `(painel)/eventos` | `events` | `Sidebar.tsx:23,59`; `EventForm.tsx:214,230`; `app/(painel)/page.tsx:24,62` | Baixo — só interno |
| `(painel)/eventos/novo` | `events/new` | `app/(painel)/eventos/page.tsx:64,85`; `Sidebar.tsx:75`; `app/(painel)/page.tsx:60-62` | Baixo |
| `(painel)/eventos/[id]` | `events/[id]` | `EventCard.tsx:69` | Baixo |
| `(painel)/perfil` | `profile` | `Sidebar.tsx:25`; `app/(painel)/page.tsx:31` | Baixo |
| `(painel)/avaliacoes` | `reviews` | `Sidebar.tsx:27` (único) | Muito baixo |
| `(painel)/artistas` | `artists` | `Sidebar.tsx:24` (único) | Muito baixo |
| `(painel)/configuracoes` | `settings` | `Sidebar.tsx:28` (único) | Muito baixo |
| `nova-senha` | `new-password` | Nenhum (rota sem caller interno; `sendPasswordReset` sempre redireciona para `/client/login`) | Muito baixo — migra como rede de segurança para eventual config manual no Supabase Dashboard |

### `apps/web` (basePath `/app`)

| Rota atual | Rota nova | Callers internos | Risco |
|---|---|---|---|
| `(app)/mapa` | `map` | `navItems.ts:13` (via `NAV_ITEMS`, `BottomNav`/`Sidebar` consomem sem literal próprio) | Baixo |
| `(app)/avisos` | `notices` | `navItems.ts:15`; `BottomNav.tsx:24`; `Sidebar.tsx:41` | Baixo |
| `(app)/perfil` | `profile` | `navItems.ts:16`; e a própria página linka `favoritos`, `cidade`, `privacidade`, `excluir-conta` | Baixo |
| `(app)/favoritos` | `favorites` | `navItems.ts:14`; `perfil/page.tsx:137` | Baixo |
| `(app)/cidade` | `city` | `perfil/page.tsx:143` (único) | Muito baixo |
| `privacidade` | `privacy` | `perfil/page.tsx:149` | **Alto** — pública/SEO, exigida pelas lojas |
| `excluir-conta` | `delete-account` | `perfil/page.tsx:170` | **Alto** — pública/SEO, exigida pelas lojas |

### `apps/admin` (basePath `/admin`)

| Rota atual | Rota nova | Callers internos | Risco |
|---|---|---|---|
| `(admin)/avisos` | `notices` | `Sidebar.tsx:16` (único) | Muito baixo |
| `(admin)/estabelecimentos` | `establishments` | `Sidebar.tsx:14` (único) | Muito baixo |
| `(admin)/eventos` | `events` | `Sidebar.tsx:15` (único) | Muito baixo |
| `privacidade` | `privacy` | `login/page.tsx:152` | Médio — pública, mas só linkada da própria tela de login (não indexada externamente como a do `apps/web`) |

### `apps/landing`

| Rota atual | Rota nova | Callers internos | Risco |
|---|---|---|---|
| `suporte` | `support` | `app/page.tsx:417,501` | **Alto** — landing institucional, provável destino de link em ficha de loja/e-mail de suporte |

### `packages/core/src/utils/links.ts` (fora da lista original da issue, incluído por decisão do usuário)

| Path atual | Path novo | Consumidores | Risco |
|---|---|---|---|
| `/eventos/{cidade}/{slug}` (`buildEventShareUrl`) | `/events/{cidade}/{slug}` | `apps/mobile/app/event/[id].tsx:112` (só quando `EXPO_PUBLIC_SHARE_BASE_URL` setado) | Baixo hoje — env vazia no `.env.example` e ausente do `eas.json`; sem link https real publicado até prova em contrário |
| `/bares/{cidade}/{slug}` (`buildEstablishmentShareUrl`) | `/establishments/{cidade}/{slug}` | `apps/mobile/app/establishment/[id].tsx:110` (mesma condição) | Baixo hoje, mesma ressalva |

### `apps/mobile`

| Item | Novo | Callers internos | Risco |
|---|---|---|---|
| `privacidade.tsx` | `privacy.tsx` | `app/_layout.tsx:154` (`Stack.Screen`); `(tabs)/profile.tsx:24` (`router.push`) | **Alto** — exigida pelas lojas; corrigir lacuna de `INTERNAL_EXACT_ROUTES` junto |
| `excluir-conta.tsx` | `delete-account.tsx` | `app/_layout.tsx:155`; não há `router.push` interno (fluxo de exclusão usa `ConfirmDialog` + `requestAccountDeletion()` direto) | Médio — arquivo parece servir só deep link externo/loja |
| `city.tsx` | — | Já está em inglês em todo lugar (arquivo, `Stack.Screen`, `router.push`, `deepLinks.ts`) | Nenhuma ação necessária |

## Apple / Google — o que checar fora do repo antes de migrar rotas públicas

As rotas de maior risco (`privacidade`/`privacy`, `excluir-conta`/`delete-account`, `suporte`/`support`) são candidatas a estar referenciadas em:

- **App Store Connect**: campo "Privacy Policy URL" da ficha do app e, desde a exigência de exclusão de conta em apps com login, o link/fluxo de "Account Deletion" na revisão do app.
- **Play Console**: "App content → Privacy policy" e a declaração de "Data safety" (que também pode linkar a URL de exclusão de conta).
- Qualquer e-mail transacional ou material de marketing que linke direto para `agenda-de-boteco.../privacidade` ou `.../excluir-conta` (fora do repo — não encontrado em `supabase/emails/*.html`, que usam só variáveis genéricas do Supabase).

**Ação antes de migrar essas três rotas**: usuário confirma manualmente esses campos nas duas plataformas — não é algo que a IA possa verificar ou alterar (acesso a conta de terceiro). Com o redirect 301 permanente em vigor, um link desatualizado nas lojas continua funcionando; o objetivo de checar é apenas poder **atualizar o link nas lojas para a URL canônica nova**, não uma dependência bloqueante.

## Ordem sugerida de execução (menor para maior risco)

1. `web-client`: `avaliacoes`, `artistas`, `configuracoes`, `nova-senha` (single caller ou zero — `nova-senha` migra junto por ser barata e sem risco real)
2. `admin`: `avisos`, `estabelecimentos`, `eventos` (single caller cada)
3. `web-client`: `perfil`, `eventos`, `eventos/novo`, `eventos/[id]` (múltiplos callers, mas só internos)
4. `web`: `mapa`, `avisos`, `favoritos`, `cidade`, `perfil` (múltiplos callers, só internos)
5. `packages/core/src/utils/links.ts`: `/eventos` → `/events`, `/bares` → `/establishments`, mantendo alias `bares`/`eventos` no parser do mobile (`mapWebPathToRoute`) por não custar nada e não haver rota real a redirecionar
6. `admin`: `privacidade` (pública, mas baixa exposição externa)
7. `web`: `privacidade`, `excluir-conta` + `mobile`: `privacidade.tsx`, `excluir-conta.tsx` **no mesmo lote** (mesmo conceito de rota; corrige junto a lacuna de `INTERNAL_EXACT_ROUTES`; checar lojas antes)
8. `landing`: `suporte` (checar referências externas antes)

Cada item da lista acima vira uma migração isolada (1 PR ou 1 commit coerente), não uma tacada só — conforme a própria issue #68 pede.
