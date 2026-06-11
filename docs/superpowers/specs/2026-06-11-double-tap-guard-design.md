# Design: Bloqueio de double-tap em todas as ações (mobile)

**Data:** 2026-06-11
**Status:** Aprovado (abordagem A — cobertura total, escopo apenas `apps/mobile`)

## Problema

Nenhum ponto de interação do app mobile tem proteção contra toque duplo. Com lag
de UI, um double-tap dispara a ação duas vezes:

- `router.push()` empilha a mesma tela duas vezes (caso mais comum — cards de
  evento/estabelecimento, headers, busca, notificações).
- `toggleEvent` (favoritar) liga e desliga em sequência, parecendo falha.
- Handlers async futuros (Supabase) podem disparar mutações duplicadas.

## Solução

Guard de pressão **leading edge, por instância de componente**: a primeira
chamada executa imediatamente; chamadas subsequentes são ignoradas enquanto o
lock durar. O lock dura o **maior** entre:

1. **Janela de cooldown** — default **600ms**, configurável por call site.
2. **Handler async em andamento** — se o handler retornar Promise, o lock
   permanece até a Promise resolver/rejeitar (cobre chamadas lentas ao Supabase).

O guard é por instância: botões diferentes nunca se bloqueiam entre si.

## Componentes

| Unidade | Caminho | Responsabilidade |
|---|---|---|
| `createPressGuard` | `apps/mobile/src/utils/pressGuard.ts` | Lógica pura do lock (cooldown + promise em andamento). Sem React. |
| Testes do util | `apps/mobile/src/utils/pressGuard.test.ts` | Contrato completo (obrigatório por AGENTS.md). |
| `useGuardedPress` | `apps/mobile/src/hooks/useGuardedPress.ts` | Hook que instancia o guard por componente e mantém referência estável. |
| `GuardedPressable` | `apps/mobile/src/components/ui/GuardedPressable.tsx` | Mesma API do `Pressable`, com `onPress` protegido. Substitui os Pressables crus. |
| `Button`, `Chip`, `CircleIconButton` | `apps/mobile/src/components/ui/` | Passam a usar o guard internamente — todo consumidor protegido por padrão. |

## Call sites migrados (Pressable cru → GuardedPressable)

`EventCard` (card + favoritar), `EstablishmentCard`, `AgendaItem`, `SearchBar`,
`FeedHeader`, `NotificationCard`, `StyleCard`, `SegmentedTabs`, `EmptyState`.

## Contrato do `createPressGuard`

```ts
type GuardedHandler<A extends unknown[]> = (...args: A) => void;

function createPressGuard(options?: { cooldownMs?: number }): {
  guard<A extends unknown[]>(handler: (...args: A) => unknown): GuardedHandler<A>;
};
```

- Chamada 1 executa na hora, com os mesmos argumentos.
- Chamadas dentro do cooldown são no-ops (retorno void, sem fila, sem trailing).
- Handler que retorna Promise mantém o lock até settle; se settle ocorrer antes
  do fim do cooldown, o cooldown ainda vale (maior dos dois).
- Exceções síncronas e rejeições não deixam o guard travado permanentemente.

## Decisões

- **Leading edge, nunca trailing:** zero latência adicional no primeiro toque.
- **600ms default:** cobre a transição de tela do expo-router (~300–500ms) sem
  bloquear interações legítimas em sequência (elementos distintos não compartilham guard).
- **Sem prop de opt-out por enquanto (YAGNI):** se algum caso legítimo de
  repetição rápida surgir (ex: stepper +/-), adiciona-se `guardPress={false}` depois.
- **`apps/admin` fora do escopo:** é esqueleto estático sem ações reais.
- **`Marker` do mapa sem guard (trade-off deliberado):** tocar rapidamente em
  marcadores distintos é interação legítima e um guard compartilhado a bloquearia;
  o custo é tolerar sobreposição de animações do `scrollToIndex` do carrossel,
  que não navega nem muta estado.
- **Sem dependência externa:** lógica própria de ~40 linhas, testada.

## Testes

Unit tests com `jest.useFakeTimers()` no padrão dos testes existentes de utils:
dupla chamada bloqueada, liberação após cooldown, lock por Promise pendente
(maior que cooldown), rejeição não trava o guard, passthrough de argumentos,
instâncias independentes não interferem entre si.

Validação final: `pnpm --filter mobile typecheck && pnpm --filter mobile lint && pnpm --filter mobile test`.
