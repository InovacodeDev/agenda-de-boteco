# Entrega gradual — telas "Em construção" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquear temporariamente as telas de Mapa (v4), Avisos (v3) e detalhe de Estabelecimento (v2), substituindo-as por uma página "Em construção" caprichada, sem apagar nenhum código existente.

**Architecture:** Uma config de feature flags (`FEATURES`) é a fonte única da verdade. Cada uma das três telas ganha um early-return no topo: se a flag estiver `false`, renderiza o componente reutilizável `UnderConstruction`; senão, o conteúdo original intacto. Reverter na v2/v3/v4 = trocar a flag para `true`.

**Tech Stack:** Expo Router, React Native, NativeWind/Tailwind (`@/tw`), FontAwesome via `Icon`, expo-linear-gradient, Jest + @testing-library/react-native.

---

## Convenções deste repo (ler antes de começar)

- **Diretório de trabalho:** todos os comandos rodam de `apps/mobile/`.
- **Alias de import:** `@/` → `apps/mobile/src/`. `@assets/` → `apps/mobile/assets/`.
- **Componentes de texto/layout:** sempre de `@/tw` (`Text`, `View`, `Image`, `ScrollView`, `Pressable`), nunca de `react-native` direto.
- **Cores em JS** (ícones, gradientes, boxShadow): de `@/theme/colors`. Classes Tailwind para o resto.
- **Testes:** `jest` (via `pnpm test` ou `npx jest <arquivo>`). Padrão dos testes: ver `src/store/usePreferencesStore.test.ts`.
- **Nunca rodar `git commit`** automaticamente neste ambiente — o usuário commita. Os passos "Commit" abaixo são para o executor humano/sessão; **deixe staged com `git add` e pare**, não execute `git commit`.

---

## File Structure

| Arquivo | Responsabilidade |
| --- | --- |
| `src/config/features.ts` (criar) | Fonte única das feature flags de entrega gradual. Constante literal `as const`. |
| `src/config/features.test.ts` (criar) | Trava o contrato: as 3 flags existem e são `false` na v1. |
| `src/components/feedback/UnderConstruction.tsx` (criar) | Componente de apresentação puro da tela "Em construção". Recebe copy por props. |
| `src/components/ui/iconMap.ts` (editar) | Adicionar ícone `screwdriver-wrench` ao mapa centralizado. |
| `src/components/ui/iconMap.test.ts` (editar) | Adicionar `screwdriver-wrench` à lista de nomes esperada. |
| `app/(tabs)/map.tsx` (editar) | Guard `FEATURES.map` → `UnderConstruction` v4. |
| `app/(tabs)/notifications.tsx` (editar) | Guard `FEATURES.notifications` → `UnderConstruction` v3. |
| `app/establishment/[id].tsx` (editar) | Guard `FEATURES.establishmentDetail` → `UnderConstruction` v2. |

Ordem das tasks: config → ícone → componente → integração nas 3 telas → verificação final. Cada task é commitável de forma independente.

---

## Task 1: Feature flags (`FEATURES`)

**Files:**
- Create: `src/config/features.ts`
- Test: `src/config/features.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/config/features.test.ts`:

```ts
import { FEATURES } from './features';

describe('FEATURES', () => {
  it('expõe as três flags de entrega gradual', () => {
    // Trava o contrato: renomear/remover uma flag é breaking change.
    expect(Object.keys(FEATURES).sort()).toEqual(
      ['establishmentDetail', 'map', 'notifications'].sort(),
    );
  });

  it('mantém as três telas bloqueadas na v1 (todas false)', () => {
    expect(FEATURES.establishmentDetail).toBe(false);
    expect(FEATURES.notifications).toBe(false);
    expect(FEATURES.map).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `npx jest src/config/features.test.ts`
Expected: FAIL — `Cannot find module './features'`.

- [ ] **Step 3: Implementação mínima**

Criar `src/config/features.ts`:

```ts
/**
 * Feature flags de entrega gradual. Cada tela bloqueada na v1 renderiza uma
 * página "Em construção" enquanto a flag estiver false. Reverter = trocar para true.
 */
export const FEATURES = {
  /** Detalhe do estabelecimento — libera na v2 */
  establishmentDetail: false,
  /** Aba de avisos/notificações — libera na v3 */
  notifications: false,
  /** Aba de mapa — libera na v4 */
  map: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run: `npx jest src/config/features.test.ts`
Expected: PASS — 2 testes verdes.

- [ ] **Step 5: Commit (stage e parar)**

```bash
git add src/config/features.ts src/config/features.test.ts
# NÃO rodar git commit — deixar staged para o usuário.
```

---

## Task 2: Ícone `screwdriver-wrench` no iconMap

**Files:**
- Modify: `src/components/ui/iconMap.ts`
- Test: `src/components/ui/iconMap.test.ts:18-49` (lista de nomes) e cobertura existente

> O ícone `screwdriver-wrench` existe em `@fortawesome/free-solid-svg-icons/faScrewdriverWrench`
> (confirmado: resolve em `node_modules/@fortawesome/free-solid-svg-icons/faScrewdriverWrench.js`).

- [ ] **Step 1: Atualizar o teste de contrato (vai falhar)**

Em `src/components/ui/iconMap.test.ts`, no array do teste `'exposes the full set of names used across the app'`, adicionar `'screwdriver-wrench'`. O array, em ordem, fica (inserir a nova entrada entre `'right-from-bracket'` e `'share-nodes'` — a ordem não importa porque o teste faz `.sort()`, mas mantenha alfabético para clareza):

```ts
    expect([...ICON_NAMES].sort()).toEqual(
      [
        'apple',
        'arrow-left',
        'at',
        'bell',
        'calendar',
        'check',
        'chevron-right',
        'circle-info',
        'clock',
        'comment',
        'envelope',
        'google',
        'heart',
        'house',
        'location-arrow',
        'location-dot',
        'magnifying-glass',
        'music',
        'right-from-bracket',
        'screwdriver-wrench',
        'share-nodes',
        'sliders',
        'star',
        'store',
        'ticket',
        'user',
        'wand-magic-sparkles',
        'xmark',
      ].sort(),
    );
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `npx jest src/components/ui/iconMap.test.ts`
Expected: FAIL no teste de nomes — o array esperado tem `screwdriver-wrench` mas `ICON_NAMES` ainda não.

- [ ] **Step 3: Adicionar o ícone ao mapa**

Em `src/components/ui/iconMap.ts`:

1. Adicionar o import junto aos demais solid (em ordem alfabética, após `faRightFromBracket` e antes de `faShareNodes`):

```ts
import { faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons/faScrewdriverWrench';
```

2. Adicionar a entrada no `ICON_MAP` (após `'right-from-bracket'` e antes de `'share-nodes'`):

```ts
  'screwdriver-wrench': { solid: faScrewdriverWrench },
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run: `npx jest src/components/ui/iconMap.test.ts`
Expected: PASS — todos os testes (nomes, resolução válida, etc.) verdes.

- [ ] **Step 5: Commit (stage e parar)**

```bash
git add src/components/ui/iconMap.ts src/components/ui/iconMap.test.ts
# NÃO rodar git commit.
```

---

## Task 3: Componente `UnderConstruction`

**Files:**
- Create: `src/components/feedback/UnderConstruction.tsx`

> Componente de apresentação puro (sem estado, sem fetch, sem lógica). A regra do projeto
> (AGENTS.md) exige unit test apenas para `services`/`utils` — componentes não. Não criar teste
> unitário aqui. A verificação visual acontece rodando o app (Task 7).

- [ ] **Step 1: Criar o componente**

Criar `src/components/feedback/UnderConstruction.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { gradientNight } from '@/theme/gradients';
import { shadows } from '@/theme/shadows';
import { headingLetterSpacing } from '@/theme/typography';
import { Text, View } from '@/tw';

export interface UnderConstructionProps {
  /** Rótulo da versão de retorno, ex.: 'v2'. Exibido no badge "Chega na vX". */
  version: string;
  /** Ícone temático exibido no selo com glow (ex.: <Icon name="store" .../>). */
  icon: ReactNode;
  /** Título chamativo em font-heading. */
  title: string;
  /** Parágrafo descritivo em font-body. */
  description: string;
  /** true = tela-aba (logo no header, CTA volta ao feed); false = detalhe (botão voltar). */
  isTab?: boolean;
}

/**
 * Página intermediária "Em construção" para entrega gradual. Mantém o padrão
 * visual do app: fundo gradiente noturno, selo de ícone com glow neon, badge de
 * versão e CTA. Conteúdo 100% estático — sem estado nem rede.
 */
export function UnderConstruction({
  version,
  icon,
  title,
  description,
  isTab = false,
}: UnderConstructionProps) {
  const router = useRouter();

  const goToFeed = () => router.replace('/');
  const goBack = () => router.back();

  return (
    <Screen background={<LinearGradient {...gradientNight} style={StyleSheet.absoluteFill} />}>
      <ScreenHeader showLogo={isTab} showBack={!isTab} />
      <View className="flex-1 items-center justify-center gap-6 px-8">
        <View
          accessibilityRole="image"
          accessibilityLabel="Funcionalidade em construção"
          className="bg-surface h-24 w-24 items-center justify-center rounded-3xl"
          style={{ boxShadow: shadows.neon }}
        >
          {icon}
        </View>

        <GradientBadge label={`Chega na ${version}`} />

        <View className="gap-3">
          <Text
            className="font-heading text-foreground text-center text-[26px]"
            style={{ letterSpacing: headingLetterSpacing(26) }}
          >
            {title}
          </Text>
          <Text className="font-body text-muted-foreground text-center text-[15px] leading-6">
            {description}
          </Text>
        </View>

        <Button
          label="Explorar o feed"
          icon={<Icon name="house" color={colors.primaryForeground} size={16} />}
          onPress={isTab ? goToFeed : goBack}
          style={{ boxShadow: shadows.neon }}
        />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros relacionados a `UnderConstruction.tsx` (props, imports e tipos resolvem).

- [ ] **Step 3: Commit (stage e parar)**

```bash
git add src/components/feedback/UnderConstruction.tsx
# NÃO rodar git commit.
```

---

## Task 4: Guard na aba Mapa (v4)

**Files:**
- Modify: `app/(tabs)/map.tsx`

> Arquivo atual (completo):
> ```tsx
> import { MapScreen } from '@/screens/map/MapScreen';
>
> export default function MapTab() {
>   return <MapScreen />;
> }
> ```

- [ ] **Step 1: Adicionar o guard**

Substituir o conteúdo de `app/(tabs)/map.tsx` por:

```tsx
import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { Icon } from '@/components/ui/Icon';
import { FEATURES } from '@/config/features';
import { MapScreen } from '@/screens/map/MapScreen';
import { colors } from '@/theme/colors';

export default function MapTab() {
  if (!FEATURES.map) {
    return (
      <UnderConstruction
        isTab
        version="v4"
        icon={<Icon name="location-dot" color={colors.primary} size={36} />}
        title="O mapa da noite está sendo desenhado"
        description="Em breve você vê todos os rolês perto de você num mapa só, com a rota certinha até a mesa. Vem na v4 — até lá, o feed te guia pela cidade."
      />
    );
  }
  return <MapScreen />;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros. (O TS estreita `FEATURES.map` como `false` literal; o `return <MapScreen />` fica inalcançável mas válido — não há warning de unreachable no tsc.)

- [ ] **Step 3: Commit (stage e parar)**

```bash
git add "app/(tabs)/map.tsx"
# NÃO rodar git commit.
```

---

## Task 5: Guard na aba Avisos (v3)

**Files:**
- Modify: `app/(tabs)/notifications.tsx`

> A tela original `NotificationsScreen` permanece **inteira** abaixo do guard. Só adicionamos
> imports no topo e um early-return como primeira instrução do componente.

- [ ] **Step 1: Adicionar imports**

Em `app/(tabs)/notifications.tsx`, adicionar aos imports existentes (manter os atuais):

```tsx
import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { Icon } from '@/components/ui/Icon';
import { FEATURES } from '@/config/features';
import { colors } from '@/theme/colors';
```

- [ ] **Step 2: Adicionar o early-return**

Como primeira instrução dentro de `export default function NotificationsScreen() {`, **antes** das chamadas a `useNotificationsStore`/`useNotificationsQuery`:

```tsx
  if (!FEATURES.notifications) {
    return (
      <UnderConstruction
        isTab
        version="v3"
        icon={<Icon name="bell" color={colors.primary} size={36} />}
        title="Os avisos estão a caminho"
        description="Logo logo a gente te cutuca quando seu bar favorito soltar um show, uma promo ou um happy hour imperdível. Chega na v3 — deixa que a gente avisa, você só aparece."
      />
    );
  }
```

> **Regra dos hooks:** como `FEATURES.notifications` é constante de módulo (nunca muda em
> runtime), a contagem de hooks é estável em toda a vida do app. O early-return antes dos hooks
> é seguro e não viola as Rules of Hooks. O resto do componente (hooks + JSX) fica intacto.

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit (stage e parar)**

```bash
git add "app/(tabs)/notifications.tsx"
# NÃO rodar git commit.
```

---

## Task 6: Guard no detalhe de Estabelecimento (v2)

**Files:**
- Modify: `app/establishment/[id].tsx`

> A tela `EstablishmentDetailScreen` permanece **inteira** abaixo do guard. O early-return é a
> primeira instrução do componente, **antes** de `useLocalSearchParams`, `useRequireAuth`,
> `useState` e das queries — para a contagem de hooks permanecer estável (a flag é constante).

- [ ] **Step 1: Adicionar imports**

Em `app/establishment/[id].tsx`, adicionar aos imports existentes:

```tsx
import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { FEATURES } from '@/config/features';
```

> `Icon` e `colors` já são importados neste arquivo — reutilizar, não duplicar.

- [ ] **Step 2: Adicionar o early-return**

Como primeira instrução dentro de `export default function EstablishmentDetailScreen() {`,
antes de `const { id } = useLocalSearchParams(...)`:

```tsx
  if (!FEATURES.establishmentDetail) {
    return (
      <UnderConstruction
        version="v2"
        icon={<Icon name="store" color={colors.primary} size={36} />}
        title="Os botecos estão se arrumando"
        description='Em breve você explora cada bar por dentro: cardápio, fotos, agenda completa e aquele papo de "bora pra cá hoje?". Tá vindo na v2 — aguenta firme que a rodada tá chegando.'
      />
    );
  }
```

> `isTab` omitido (default `false`) → mostra o botão voltar, que leva o usuário de volta ao
> card de onde veio. Atenção às aspas: a descrição contém aspas duplas, por isso a string usa
> aspas simples (`'...'`).

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit (stage e parar)**

```bash
git add "app/establishment/[id].tsx"
# NÃO rodar git commit.
```

---

## Task 7: Verificação final (testes, lint, typecheck, smoke visual)

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte de testes completa**

Run: `pnpm test` (de `apps/mobile/`, ou `npx jest`)
Expected: PASS em tudo. Em especial `features.test.ts` (2) e `iconMap.test.ts` (com o novo nome). Nenhum teste existente quebrado.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero erros.

- [ ] **Step 3: Lint**

Run: `npx eslint .`
Expected: zero erros. (Atenção ao `simple-import-sort` — os imports adicionados devem respeitar a ordem; se o lint reclamar, deixar o autofix `npx eslint . --fix` reordenar e re-stageá-los.)

- [ ] **Step 4: Smoke visual no app**

Rodar o app (`pnpm dev` / Expo) e confirmar manualmente:
- Aba **Mapa** → mostra "O mapa da noite está sendo desenhado", badge "Chega na v4", botão "Explorar o feed" leva ao Feed.
- Aba **Avisos** → mostra "Os avisos estão a caminho", badge "Chega na v3".
- Tocar num **card de estabelecimento** (Feed/Favoritos) → mostra "Os botecos estão se arrumando", badge "Chega na v2", botão voltar retorna ao card.
- Feed, Favoritos, Perfil, Login e detalhe de **Evento** continuam funcionando normalmente.
- O botão "Ver estabelecimento" no detalhe de evento agora cai na página "Em construção — v2" (comportamento esperado).

- [ ] **Step 5: Stage final**

```bash
git add -A apps/mobile
git status --short   # conferir os 8 arquivos do plano. NÃO rodar git commit.
```

---

## Reversão futura (referência)

- **v2:** `FEATURES.establishmentDetail = true` + ajustar `features.test.ts` (expectativa dessa flag) e re-rodar `npx jest src/config/features.test.ts`.
- **v3:** `FEATURES.notifications = true` + teste.
- **v4:** `FEATURES.map = true` + teste.

Nenhuma outra mudança — o conteúdo original volta a renderizar automaticamente.
