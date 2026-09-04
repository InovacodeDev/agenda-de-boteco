# Rate-limiting client-side (anti-spam) — design

Data: 2026-09-03
Status: aprovado, aguardando plano de implementação
Issue: #94 (auditoria) → esta spec é uma das 5 tarefas derivadas

## Contexto

A auditoria #94 confirmou que o **mobile já está protegido**: `Button` e
`CircleIconButton` embutem `useGuardedPress`/`createPressGuard`
internamente (`packages/core/src/utils/pressGuard.ts` +
`packages/core/src/hooks/useGuardedPress.ts`), então toda tela mobile que
usa esses componentes — incluindo login/OTP e favoritar — já tem lock
leading-edge com cooldown de 600ms.

**Nenhum app web (web, web-client, admin) tem proteção equivalente.** Todos
usam `<button onClick>` cru com só um `disabled={busy}` local, que cobre
apenas o tempo da requisição em voo — não duplo-clique síncrono, e nada
impede martelar "reenviar código" assim que uma resposta de erro chega.

Achado crítico: `supabase/config.toml` limita `email_sent = 2` por hora.
Um cooldown de UI de poucos segundos não é suficiente — o 3º clique dentro
da mesma hora já é rejeitado pelo servidor. O cooldown visível precisa ser
dimensionado para o limite real, não um valor arbitrário curto.

## Escopo

1. Levar a proteção de duplo-clique para a web (equivalente ao
   `useGuardedPress` do mobile, adaptado para `<button onClick>`).
2. Cooldown visível de "reenviar código"/"esqueci senha" em todas as telas
   de login/OTP (web, web-client, admin) — mobile já não tem botão de
   reenvio direto (só "Alterar e-mail", que volta pro form, não reenvia).
3. Contador de tentativas antes de bater no rate limit do servidor, com
   aviso amigável antecipado.

## 1. Guard de clique para web — `useGuardedClick`

Extrai a lógica de `createPressGuard` (já é pura, sem dependência de
`Pressable`/React Native) para um hook novo em `packages/core/src/hooks/`,
reaproveitando a mesma função `createPressGuard` — sem duplicar a lógica de
lock, só o wrapper de host:

```ts
// packages/core/src/hooks/useGuardedClick.ts
export function useGuardedClick<Args extends unknown[]>(
  handler: (...args: Args) => void | Promise<void>,
  options?: { cooldownMs?: number },
): (...args: Args) => void
```

Mesma API de retorno de `useGuardedPress`, mas para `onClick` de
`<button>`. Aplicado nos botões identificados sem guarda: Google/Apple
OAuth, "Enviar código", "Entrar" (verify OTP), "Alterar e-mail" (`apps/web`,
`apps/admin`), tabs signIn/signUp e "Esqueci minha senha" (`apps/web-client`),
e favoritar (`EventCard.tsx` em `apps/web`).

Regra dos 3 já satisfeita — 3 apps web usam o mesmo padrão de botão de
auth, então o hook nasce direto em `packages/core`, não local a um app.

## 2. Cooldown de reenvio de OTP — `useResendCooldown`

Hook novo, também em `packages/core/src/hooks/`, para os 3 apps web (mobile
fica de fora — não tem botão de reenvio direto hoje):

```ts
useResendCooldown(cooldownSeconds: number): {
  isReady: boolean;
  remainingSeconds: number;
  start: () => void;
}
```

Dimensionamento do `cooldownSeconds`: com `email_sent = 2/hora`, um cooldown
de 60 segundos entre cliques não evita o usuário estourar o limite se ele
voltar a cada minuto por uma hora — o cooldown de UI serve para impedir
*rajada* (múltiplos cliques em segundos), não para simular o rate limit
real do servidor. Adotar **60 segundos** como cooldown de UI (padrão de
mercado para "reenviar código"), e usar o contador de tentativas (seção 3)
para o aviso de limite de hora.

Aplicado ao fluxo de "Enviar código"/OTP nas 3 telas de login web.

## 3. Contador de tentativas com aviso antecipado

Estado local (`useState`, sem store novo — é efêmero, por sessão de tela,
não precisa persistir) contando envios de OTP na tela atual. Ao atingir 2
tentativas (o limite real de `email_sent`), a UI mostra aviso preventivo
*antes* do servidor rejeitar:

> "Você já solicitou 2 códigos nesta hora. Aguarde antes de tentar
> novamente para não ser bloqueado temporariamente."

Isso não substitui o mapeamento de erro existente em
`getFriendlyErrorMessage` (que já trata a resposta real do Supabase) — é um
aviso antecipatório complementar, evitando que o usuário só descubra o
limite ao ser rejeitado.

## 4. Sem mudança em `getFriendlyErrorMessage`

O mapeamento por string (`'rate limit'`/`'too many requests'`) já existe e
funciona (`packages/core/src/utils/errors.ts:144-146`) — não é tocado nesta
spec, só reforçado pelo aviso antecipatório client-side.

## 5. Testes

`useGuardedClick`/`useResendCooldown` são lógica pura de hook — testes com
`@testing-library/react` (ou equivalente já usado no core) cobrindo: clique
duplo síncrono ignorado, cooldown expira corretamente, contador de
tentativas incrementa e reseta ao trocar de e-mail. Mudança em
`packages/core/src/hooks/` não está listada como obrigatória de teste no
AGENTS_RULES.md (que cita `services/`/`utils/`), mas `createPressGuard` já
tem precedente de teste em `utils/` — replicar o padrão por consistência.

## Fora de escopo

- Rate limiting real (servidor) — já é do Supabase, não mexido aqui.
- Persistir contador de tentativas entre reloads/sessões — é proteção de
  UX, não de segurança; abuso real segue coberto pelo Supabase.
- Alterar os limites de `supabase/config.toml` — fora do pedido, e mudança
  de infra requer análise separada.
