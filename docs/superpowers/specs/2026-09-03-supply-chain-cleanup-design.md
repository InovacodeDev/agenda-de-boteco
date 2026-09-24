# Correção de supply chain, CVEs, knip e avaliação Next 16 — design

Data: 2026-09-03
Status: aprovado, aguardando plano de implementação
Issue: #94 (auditoria) → esta spec é uma das 5 tarefas derivadas

## Contexto

Auditoria #94 rodou `pnpm audit` e `knip` e encontrou: 25 high + 14
moderate (0 critical), todas em dependências **transitivas** (via toolchain
de build — Next, Turbo, Jest, Expo), com fix disponível para todas exceto
`image-size`. Também encontrou overrides potencialmente obsoletos e uma
lista de arquivos/deps apontados como órfãos pelo knip.

Decisão já validada: aplicar os fixes transitivos e a limpeza do knip
**nesta rodada** (baixo risco, não-breaking); avaliar Next 16.3.4 e
"últimas versões estáveis" **só como relatório**, sem aplicar.

## Escopo

1. Aplicar overrides de CVE para as dependências transitivas com fix.
2. Revisar overrides `react`/`react-dom`/`lightningcss` e o patch de
   `react-native-css`.
3. Aplicar limpeza confirmada do knip (arquivos e deps órfãos reais).
4. Relatório de impacto do upgrade Next 15→16.3.4 e de majors disponíveis
   nas demais libs — sem aplicar.

## 1. CVEs — overrides no `package.json` raiz

Adicionar/ajustar em `pnpm.overrides`:

```json
{
  "pnpm": {
    "overrides": {
      "react": "19.2.3",
      "react-dom": "19.2.3",
      "lightningcss": "1.30.1",
      "postcss": ">=8.5.18",
      "js-yaml": ">=4.3.1",
      "brace-expansion": ">=2.0.2",
      "browserslist": ">=4.28.7",
      "sharp": ">=0.35.0",
      "form-data": ">=4.0.6",
      "shell-quote": ">=1.9.0",
      "nanoid": ">=3.3.18",
      "uuid": ">=11.1.1",
      "decode-uri-component": ">=0.5.0",
      "@xmldom/xmldom": ">=0.9.12"
    }
  }
}
```

`image-size` (DoS ICNS/JXL/HEIF, sem fix publicado): **não dá para
override** — registrar como risco aceito no `AGENTS_RULES.md` (Seção 8,
Débitos Conhecidos), com revisão programada junto à próxima auditoria (ver
spec de governança).

Após editar overrides: `pnpm install`, depois rodar `pnpm audit` de novo
para confirmar redução real, e `pnpm typecheck && pnpm lint && pnpm test`
em todos os workspaces — override de versão pode mudar tipos exportados
(especialmente `sharp`, usado em build de imagem do Next).

## 2. Overrides potencialmente obsoletos

- **`react`/`react-dom` 19.2.3`**: a versão override já é a mais recente
  real da linha 19.x — override hoje não fixa nada divergente. Antes de
  remover: checar `pnpm why react` para confirmar que nenhum peerDep pede
  faixa diferente. Se confirmado redundante, remover do `pnpm.overrides` e
  deixar a resolução natural do workspace.
- **`lightningcss` 1.30.1`**: lockfile já mostra `1.32.0` convivendo
  (puxado por nativewind/tailwind v4) — o override não está unificando a
  resolução, seu objetivo original não está sendo cumprido. Decisão:
  atualizar o override para `1.32.0` (alinhar com o que já está em uso) em
  vez de removê-lo, evitando duas versões nativas coexistindo no bundle.
- **`react-native-css@0.0.0-nightly.5ce6396` patch**: confirmado ainda
  necessário — adapta `withReactNativeCSS`/`watcher.emit` para a API
  `{changes, rootDir}` do Metro ≥0.83, e `metro@0.84.4` está de fato
  instalado. **Não mexer.**

## 3. Limpeza do knip — só o confirmado por grep

Confirmado por grep de path-alias (sem nenhum import, relativo ou por
alias, em `apps/mobile/src` ou `apps/mobile/app`):

Deletar:
- `apps/mobile/src/data/index.ts`
- `apps/mobile/src/data/mock.ts`
- `apps/mobile/src/services/catalog.ts`
- `apps/mobile/src/services/favorites.ts`
- `apps/mobile/src/services/proximity.ts`
- `apps/mobile/src/utils/auth.ts` (a fachada de 30 bytes — **não** o real
  `apps/mobile/src/services/auth.ts`, que tem lógica própria e é usado)
- `apps/mobile/src/utils/images.ts`
- `apps/mobile/src/utils/pressGuard.ts`
- `apps/mobile/src/screens/map/mapStyle.ts` (citado só em prosa no README,
  não em código)

Antes de deletar cada uma: confirmar de novo com grep no momento da
implementação (o código pode ter mudado entre a auditoria e a execução) e
rodar `pnpm typecheck` depois de cada lote.

`eslint-config-expo` (devDependency raiz): remover do `package.json` — está
comentado/inativo em `eslint.config.mjs:88-91`, sem uso real. Se algum dia
for reativado, reintroduzir junto com a config.

**Não mexer** nas demais deps apontadas ("órfãs" `zod`, `zustand`, `clsx`,
`tailwind-merge`, `@supabase/supabase-js`, `@tanstack/query-async-storage-persister`
em admin/mobile/web-client/web): são falso positivo do knip (workspace
hoisting) ou decisão de arquitetura já existente (dependência declarada
localmente mesmo vindo via `@agenda/core`) — mexer aqui é risco
desproporcional ao benefício, e `@tanstack/react-query-persist-client` tem
uso real confirmado em pelo menos 2 apps.

`expo-updates`, `expo-system-ui`, `next/font/local`, binários `eas`/`supabase`:
**não mexer** — sem evidência de uso real nem de ausência real (falso
positivo provável do plugin Expo do knip); `eas` e `supabase` são CLIs
chamados via `pnpm dlx`/scripts sem precisar virar devDependency formal,
padrão aceitável para ferramentas de build ocasionais.

## 4. Relatório — Next 16.3.4 e majors disponíveis (sem aplicar)

Entregável: documento separado (`docs/superpowers/specs/` ou anexo a este,
gerado na fase de implementação) cobrindo:
- Breaking changes Next 15→16 relevantes ao repo: App Router (mudanças em
  `params`/`searchParams` já são assíncronas desde o 15, checar se há novo
  breaking), Turbopack como bundler padrão, versão mínima de Node exigida,
  compatibilidade com `@tailwindcss/postcss` v4 e `next/font`.
  Verificar contra a doc oficial da versão exata 16.3.4, não a memória
  (Regra 9 do AGENTS.md/AGENTS_RULES.md).
- Esforço estimado (arquivos de config a tocar: `next.config.ts` dos 5 apps
  Next, verificação de cada rota).
- Para as demais libs pinadas por decisão deliberada (Zod 3.x, TanStack
  Query 5.x) — **não** incluir no relatório como candidatas a bump; são
  pins intencionais documentados no AGENTS.md, upgrade de major é decisão
  de arquitetura separada, não item de supply-chain hygiene.
- Para as demais libs sem pin deliberado: listar major disponível vs.
  instalado, sem julgamento de "deve ou não atualizar" — é levantamento,
  decisão de aplicar fica para você depois de ler.

## Testes

`pnpm typecheck && pnpm lint && pnpm test` após cada mudança de override e
após cada lote de deleção do knip — reportar resultado real antes de
declarar a tarefa concluída (regra do AGENTS_RULES.md).

## Fora de escopo

- Aplicar o upgrade do Next ou de qualquer major — só relatório.
- Remover `react`/`lightningcss` dos overrides sem confirmar `pnpm why`
  primeiro.
- Mexer nas 6 deps "órfãs" que dependem só de hoisting via `@agenda/core`.
