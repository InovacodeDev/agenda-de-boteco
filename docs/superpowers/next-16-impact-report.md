# Relatório de impacto — upgrade Next 15.5.19 → 16.3.4

Data: 2026-09-04
Status: investigação, nenhuma mudança aplicada
Issue: #94

## Versão atual

- Instalada: `15.5.19` (resolvida de `^15.1.0`)
- Apps afetados: web, admin, landing, web-artists, web-client (5)
- Node local: v24.11.0. CI (`.github/workflows/ci.yml`, `actions/setup-node@v4`): Node 22.
- TypeScript instalado: `6.0.3`.

## Breaking changes relevantes a este repo

Fonte: [guia oficial de upgrade para v16](https://nextjs.org/docs/app/guides/upgrading/version-16) (consultado hoje, `lastUpdated: 2026-08-25`, doc para `16.3.4`) e [Next.js 16 blog post](https://nextjs.org/blog/next-16).

| Mudança | Este repo é afetado? | Por quê |
| --- | --- | --- |
| **Node.js mínimo 20.9.0** (Node 18 não é mais suportado) | Não | CI usa Node 22; ambiente local usa Node 24. Já acima do mínimo. |
| **TypeScript mínimo 5.1.0** | Não | Repo está em `6.0.3`. |
| **Turbopack é o bundler padrão** em `next dev` e `next build` | Baixo risco, mas exige verificação | Nenhum dos 5 `next.config.ts` declara `webpack` customizado (confirmado por grep) — o build não vai falhar por essa causa. `@tailwindcss/postcss` v4 é PostCSS puro, não webpack loader, então não há conflito direto conhecido. Ainda assim, a v16 muda onde a config do Turbopack vive (`experimental.turbopack` → `turbopack` top-level) — nenhum app deste repo usa `experimental.turbopack` hoje, então não há chave para migrar. |
| **Async Request APIs — sync totalmente removido** (`cookies`, `headers`, `draftMode`, `params`, `searchParams`) | Não | Grep não encontrou `cookies()`, `headers()`, `draftMode()`, nem acesso síncrono a `params`/`searchParams` em código de rota — o repo não usa essas APIs (não há Server Actions/Route Handlers, e as poucas rotas dinâmicas não leem `params` de forma síncrona). Sem regressão adicional além do que a v15 já exigiu. |
| **`middleware` → `proxy`** (rename obrigatório, edge runtime não suportado em `proxy`) | Não | Nenhum `middleware.ts`/`proxy.ts` existe em nenhum app (confirmado por `find`). Não há middleware no repo — client-side only sobre Supabase. |
| **PPR experimental removida → `cacheComponents`** | Não | Nenhum app usa `experimental.ppr`, `experimental.dynamicIO` ou `experimental.useCache` (grep vazio). |
| **`revalidateTag` exige segundo argumento; `unstable_` removido de `cacheLife`/`cacheTag`** | Não | Repo não usa nenhuma dessas APIs de cache (sem Server Actions). |
| **`next lint` removido** | Não | Todos os 5 apps já rodam `eslint .` direto no script `lint` (confirmado em cada `package.json`), não `next lint`. Nenhuma migração necessária. |
| **ESLint Flat Config como padrão do `@next/eslint-plugin-next`** | Não | `eslint.config.mjs` da raiz já é flat config (ESLint 9). |
| **`next/font`** (usado via `packages/core/src/fonts/next-fonts.ts`) | Não | A doc de upgrade não lista breaking change para `next/font` na v16. Uso via `next/font` (Inter + Space Grotesk) é padrão e não muda. |
| **`transpilePackages`** (usado pelos 5 apps para `@agenda/core`/`@agenda/shared-ui`) | Não | Opção não sofreu mudança de API na v16. |
| **`experimental.optimizePackageImports`** (usado em web/admin/web-client para `@phosphor-icons/react`) | Não | Não listada como breaking change; segue em `experimental`. |
| **`basePath` + `redirects()`** (usados em web, admin, web-client, web-artists) | Não | Nenhuma mudança de API documentada para `basePath` ou `redirects()` na v16. |
| **`next/image` — `minimumCacheTTL` default 60s → 4h** | Baixo impacto | Repo não configura `images.minimumCacheTTL` em nenhum `next.config.ts` (grep confirma ausência de bloco `images` nos 5 configs) — passaria a usar o novo default de 4h. Imagens vêm do Supabase Storage; cache mais longo é aceitável, mas é uma mudança de comportamento não solicitada caso o time dependa de revalidação rápida de imagem trocada. |
| **`next/image` — `imageSizes` remove `16`, `qualities` default `[75]` só** | Baixo impacto | Sem config customizada, os 5 apps passam a usar os novos defaults. Pode mudar levemente o `srcset` gerado; visualmente imperceptível na prática. |
| **`next/image` — query string em imagem local exige `images.localPatterns.search`** | Não | Grep não encontrou `<Image src="/...?...">` com querystring em nenhum app. |
| **`next/legacy/image`, `images.domains` deprecados** | Não | Nenhum app usa `next/legacy/image` nem `images.domains` (grep vazio; nenhum config declara `images` de todo). |
| **Parallel routes exigem `default.js`** | Não | Nenhuma pasta `@slot` existe em `app/` de nenhum app (só `node_modules/@agenda`, que não é rota). |
| **AMP removido** | Não | Zero uso de `next/amp`/`useAmp` no código-fonte (as únicas ocorrências são em `tsconfig.tsbuildinfo`, artefato de build, não código). |
| **`serverRuntimeConfig`/`publicRuntimeConfig` removidos** | Não | Não usados — env é lida via `NEXT_PUBLIC_*` em `lib/supabase.ts`, como já manda a Regra 6 do AGENTS.md. |
| **React 19.2 (canary) obrigatório no App Router** | Requer atenção | v16 usa uma release canary de React que inclui React 19.2 (View Transitions, `useEffectEvent`, `Activity`). O repo pina `react`/`react-dom` em `19.2.3` via `pnpm.overrides` — precisa confirmar que esse pin é compatível com o canary exigido pelo Next 16 antes de migrar; não é incompatibilidade confirmada, é ponto de verificação obrigatório do Step 3 (`pnpm install`) caso o upgrade seja aplicado. |
| **React Compiler suporte estável (`reactCompiler` config)** | Não | Feature opcional, não habilitada por padrão. Repo não usa React Compiler (documentado no AGENTS.md: "não habilitado"). Sem ação. |
| **Enhanced Routing/Navigation (prefetch incremental)** | Nenhuma ação de código | Mudança interna sem API nova a adotar; pode alterar o padrão de requests de prefetch observado em rede. |

**Resumo:** dos ~20 breaking changes documentados para a v16, só dois têm efeito real *neste* repo — os novos defaults de `next/image` (nenhum requer config nova para manter o comportamento atual ser aceitável) e a obrigação de confirmar que o pin de React 19.2.3 continua resolvendo sob o canary da v16. Nenhum força mudança de código.

## CVEs resolvidos pelo upgrade

O plano original (#94) citava 5 CVEs de `next` com fix disponível em `>=15.5.21`. A investigação nesta task encontrou o quadro completo via os security advisories oficiais do `vercel/next.js`:

| Release | Data | CVEs cobertos | Severidade |
| --- | --- | --- | --- |
| `15.5.21` / `16.2.11` | 2026-07-21 | SSRF em `rewrites` (GHSA-p9j2-gv94-2wf4), payload de Server Action sem limite no Edge runtime (GHSA-4c39-4ccg-62r3), SSRF em Server Actions em servidor customizado (GHSA-89xv-2m56-2m9x), cache confusion em respostas com body (GHSA-68g3-v927-f742), bypass de Middleware/Proxy no App Router com Turbopack (GHSA-6gpp-xcg3-4w24), DoS em Server Actions (GHSA-m99w-x7hq-7vfj) | High/Moderate |
| `15.5.24` / `16.3.3` | 2026-08-25 | **RCE não-autenticado no Image Optimization API via AVIF** (GHSA-2xp9-vwfh-vxw4, CVSS v4 9.5) e RCE não-autenticado em servidores Windows (GHSA-p293-qw3h-jr36) | Critical |

**A versão instalada hoje (`15.5.19`) está desatualizada mesmo dentro da linha 15 — antes de ambos os patches acima.** Isso é mais grave do que "avaliar migrar para 16": o repo está exposto aos CVEs corrigidos em `15.5.21` e `15.5.24`/`16.3.3`, independente da decisão sobre o major 16.

Mitigante real para o CVE crítico (AVIF RCE, GHSA-2xp9-vwfh-vxw4): ele só se aplica quando o app declara `image/avif` em `images.formats` no `next.config.ts`. **Nenhum dos 5 `next.config.ts` deste repo configura `images` de forma alguma** (confirmado por grep) — logo nenhum app habilita AVIF explicitamente, e a exposição real a esse CVE específico é baixa. Os demais CVEs (SSRF em `rewrites`/Server Actions, bypass de Middleware) não se aplicam porque o repo não usa Server Actions, Route Handlers nem middleware — mas isso não é garantia formal de terceiros, é leitura do código deste repo.

`16.3.4` (a versão "latest" hoje) é posterior a `16.3.3` e já inclui os dois patches de agosto. Migrar para `16.3.4` resolveria tudo. **Mas o mesmo conjunto de CVEs de julho/agosto também está corrigido dentro da própria linha 15, em `15.5.24`** — ou seja, não é necessário o major 16 para fechar os CVEs conhecidos.

Nenhum CVE novo conhecido foi encontrado especificamente para `16.3.4` nesta investigação.

## Esforço estimado

**Se for para 16.3.4 (major):**
- 5× `next.config.ts` — revisar (não necessariamente editar) defaults de `images` e confirmar ausência de `experimental.turbopack`/`ppr`/`dynamicIO`.
- 5× `package.json` de app — bump de `next: ^15.1.0` → `^16.3.4` (ou faixa equivalente).
- `package.json` raiz — `react`/`react-dom` no `pnpm.overrides` precisam ser revalidados contra o canary de React exigido pela v16 (risco de conflito de peer dependency com o override existente).
- `pnpm-lock.yaml` — regenerado.
- Rodar `pnpm typecheck && pnpm lint && pnpm test && pnpm build` nos 5 apps e validar visualmente `next/image` (novos defaults de qualidade/cache) e as rotas com `basePath`/`redirects()`.
- Sem Route Handlers/Server Actions/middleware no repo, a superfície de breaking change real é pequena — o esforço é majoritariamente **verificação**, não reescrita.

**Se for só fechar os CVEs dentro da v15 (patch, não major):**
- 5× `package.json` de app — bump de `next` para `^15.5.24` (ou faixa que resolva `>=15.5.24 <16`).
- `pnpm-lock.yaml` regenerado.
- Mesma bateria de `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, sem nenhum dos pontos de atenção do major (Turbopack default, React canary, defaults de imagem).
- Esforço sensivelmente menor e sem breaking change a absorver.

## Recomendação

**Vale fazer agora o patch dentro da v15 (`^15.5.24`), não o major para 16.** Os CVEs corrigidos em `15.5.21`/`15.5.24` são o motivo real da urgência (issue #94), e ficam resolvidos sem nenhum dos riscos do major (Turbopack default, revalidação do pin de React 19.2.3 contra canary, novos defaults de `next/image`). O upgrade para 16.3.4 pode ficar para uma rodada própria, sem pressão de CVE, já que este repo não usa nenhuma das APIs que a v16 remove ou quebra — o levantamento acima serve de referência para quando essa rodada for decidida.

## Outros majors disponíveis (fora do Next)

Levantado via `pnpm outdated -r --format json` em 2026-09-04. Lista só pacotes com **major** novo (não minor/patch).

**Excluídos deliberadamente da lista de candidatos** (pins documentados no AGENTS.md, Regra 10 — não é desatualização, é decisão de arquitetura):
- `zod` — pinado em `3.23.8`; a v4 (`4.5.4` disponível) tem API incompatível (`z.email()` vs `.email()`) e não é usada neste repo.
- `react`/`react-dom` — já resolvidos em `19.2.3` via `pnpm.overrides` deliberado; não aparecem como outdated porque já estão na versão mais recente estável adotada pelo repo.
- `react-native-css` — aparece no outdated (`0.0.0-nightly.5ce6396` → `3.0.7` estável), mas está em nightly **com patch** (`patchedDependencies`) necessário para compatibilidade com Metro `0.84.4`; atualizar quebra o patch, conforme a Regra 10 do AGENTS.md e a Task 3 deste mesmo plano.

**Candidatos reais com major novo:**

| Pacote | Atual → Latest | Apps afetados | Nota |
| --- | --- | --- | --- |
| `next` | `15.5.19` → `16.3.4` | web, admin, landing, web-artists, web-client | Coberto em detalhe nas seções acima. |
| `typescript` | `6.0.3` → `7.0.2` | todos os workspaces | Base do repo (`@agenda/typescript-config`); upgrade de major da linguagem, exige avaliação própria antes de qualquer bump. |
| `expo` | `56.0.12` → `57.0.20` | `@agenda/mobile` | Major do Expo puxa toda a família `expo-*` (17 pacotes na lista) e `expo-router`/`jest-expo` junto — upgrade coordenado, não pacote a pacote. |
| `expo-router`, `expo-apple-authentication`, `expo-application`, `expo-constants`, `expo-device`, `expo-file-system`, `expo-font`, `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-localization`, `expo-location`, `expo-secure-store`, `expo-splash-screen`, `expo-status-bar`, `expo-web-browser` | `56.x` → `57.x` | `@agenda/mobile` | Seguem a mesma major do Expo SDK; não fazem sentido isolados do bump de `expo`. |
| `jest-expo` | `56.0.5` → `57.0.5` | `@agenda/mobile` | Acompanha o major do Expo SDK. |
| `jest` | `29.7.0` → `30.5.1` | `@agenda/mobile`, `@agenda/core` | Major do runner de teste — avaliação própria (breaking changes de config/matchers). |
| `jest-environment-jsdom` | `29.7.0` → `30.5.1` | `@agenda/core` | Acompanha o major do Jest. |
| `@types/jest` | `29.5.14` → `30.0.0` | `@agenda/mobile`, `@agenda/core` | Acompanha o major do Jest. |
| `@react-native-async-storage/async-storage` | `2.2.0` → `3.1.1` | `@agenda/mobile` | Major isolado do RN async-storage. |
| `react-native-url-polyfill` | `3.0.0` → `4.0.0` | `@agenda/mobile` | Major isolado. |
| `tailwind-merge` | `2.6.1` → `3.6.0` | admin, mobile, web, web-client, core | Consumido via `cn.ts` do core — mudança de major na API de merge de classes exige revisão da função utilitária central. |
| `eslint` | `9.39.4` → `10.9.1` | raiz (dev) | Major do linter; puxa `@eslint/js` (`9.39.4` → `10.0.1`) junto. |
| `eslint-plugin-simple-import-sort` | `13.0.0` → `14.0.0` | raiz (dev) | Acompanha o major do ESLint. |
| `@types/node` | `22.19.19` → `26.4.1` | admin, landing, web, web-artists, web-client, core | Tipos do Node — bump de major grande (22→26), avaliar contra a versão real do Node usada (CI: 22; local: 24). |

Nenhum destes foi avaliado quanto a esforço/breaking changes nesta task — o escopo aqui era só listar. Cada um, se priorizado, merece seu próprio relatório de impacto como este.
