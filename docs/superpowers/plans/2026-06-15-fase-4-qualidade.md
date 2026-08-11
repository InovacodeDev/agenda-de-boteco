# Fase 4 — Testes de Qualidade e Adaptações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a camada de experiência offline, a responsividade fina, a persistência de favoritos no servidor e o fechamento de gaps de teste/QA do app Expo v56, partindo da fundação técnica já entregue na Fase 3.

**Architecture:** Hooks puros + componentes focados no `apps/mobile`. Funções de cálculo (breakpoint, escala tipográfica) e serviços (favorites) são puros/testáveis isoladamente; a UI consome via hooks finos. Favoritos ganham backend Supabase (tabela + RLS) com fila offline no store Zustand e sync disparado por reconexão/login. Testes em Jest (TDD) acompanham cada service/util novo, conforme `AGENTS.md`.

**Tech Stack:** TypeScript strict, React 19, React Native 0.85, Expo Router v56, TanStack Query v5 (`onlineManager`), Zustand v5 (`persist`), `react-native-reanimated` v4, `react-native-safe-area-context`, Supabase JS, Zod, Jest (`jest-expo`).

**Spec:** [docs/superpowers/specs/2026-06-15-fase-4-qualidade-design.md](../specs/2026-06-15-fase-4-qualidade-design.md)

---

## Convenções deste repo (ler antes de começar)

- **pnpm/turbo na raiz.** Rodar testes do mobile: `pnpm --filter @agenda/mobile test`. Suite completa: `turbo run test`.
- **Jest:** `testMatch: ['<rootDir>/src/**/*.test.ts']` — testes ficam em `src/`, sufixo `.test.ts`, ao lado do arquivo. Alias `@/` → `src/`.
- **Sem `any`.** Sem comentários supérfluos em código novo (JSDoc de contrato no estilo do repo é aceito).
- **Nunca rodar `git commit`** — os passos de "Commit" abaixo significam apenas `git add` (staging); o commit é gerenciado externamente. Faça o stage com a mensagem sugerida documentada.
- **`@/tw`** exporta `View`, `Text`, `Image`, `ScrollView` com suporte a `className` (NativeWind). Cores via `@/theme/colors`.

## File Structure

**Bloco A — Responsividade**
- Create: `apps/mobile/src/hooks/useResponsive.ts` — breakpoint a partir de `useWindowDimensions`; exporta função pura `resolveBreakpoint`.
- Create: `apps/mobile/src/hooks/useResponsive.test.ts`
- Create: `apps/mobile/src/utils/responsiveType.ts` — `scaleFontSize` pura.
- Create: `apps/mobile/src/utils/responsiveType.test.ts`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` — insets na tab bar.
- Modify: `apps/mobile/src/components/layout/ScreenHeader.tsx` — título escalável.

**Bloco B — Offline**
- Create: `apps/mobile/src/hooks/useConnectivity.ts` + `.test.ts`
- Create: `apps/mobile/src/components/ui/OfflineBanner.tsx`
- Create: `apps/mobile/src/components/ErrorBoundary.tsx`
- Modify: `apps/mobile/app/_layout.tsx` — montar ErrorBoundary + OfflineBanner.
- Modify: `apps/mobile/app/event/[id].tsx` — estado de erro/retry.
- Create: `supabase/migrations/20260615120000_user_favorites.sql`
- Create: `apps/mobile/src/services/favorites.ts` + `.test.ts`
- Modify: `apps/mobile/src/store/useFavoritesStore.ts` — fila offline + sync.
- Modify: `apps/mobile/src/store/useFavoritesStore.test.ts`

**Bloco C — Testes/QA**
- Create: `apps/mobile/app/+native-intent.test.ts`
- Modify: `apps/mobile/src/services/proximity.ts` — guarda de coordenadas inválidas.
- Modify: `apps/mobile/src/services/proximity.test.ts`
- Create: `docs/qa/checklist-fase-4.md`

---

# Bloco A — Tarefa 4.1: Adaptação para Telas

## Task A1: Hook de breakpoint responsivo

**Files:**
- Create: `apps/mobile/src/hooks/useResponsive.ts`
- Test: `apps/mobile/src/hooks/useResponsive.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/mobile/src/hooks/useResponsive.test.ts`:

```typescript
import { resolveBreakpoint } from './useResponsive';

describe('resolveBreakpoint', () => {
  it('retorna "sm" abaixo de 380', () => {
    expect(resolveBreakpoint(0)).toBe('sm');
    expect(resolveBreakpoint(320)).toBe('sm');
    expect(resolveBreakpoint(379)).toBe('sm');
  });

  it('retorna "md" entre 380 (inclusivo) e 768 (exclusivo)', () => {
    expect(resolveBreakpoint(380)).toBe('md');
    expect(resolveBreakpoint(414)).toBe('md');
    expect(resolveBreakpoint(767)).toBe('md');
  });

  it('retorna "lg" a partir de 768', () => {
    expect(resolveBreakpoint(768)).toBe('lg');
    expect(resolveBreakpoint(1024)).toBe('lg');
  });

  it('sempre retorna uma string do union', () => {
    const value = resolveBreakpoint(500);
    expect(['sm', 'md', 'lg']).toContain(value);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agenda/mobile test -- useResponsive`
Expected: FAIL — `Cannot find module './useResponsive'` ou `resolveBreakpoint is not a function`.

- [ ] **Step 3: Write minimal implementation**

`apps/mobile/src/hooks/useResponsive.ts`:

```typescript
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'sm' | 'md' | 'lg';

const SM_MAX = 380;
const LG_MIN = 768;

/** Faixa de viewport a partir da largura em dp. Pura — testável isoladamente. */
export function resolveBreakpoint(width: number): Breakpoint {
  if (width < SM_MAX) {
    return 'sm';
  }
  if (width < LG_MIN) {
    return 'md';
  }
  return 'lg';
}

export interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isSmall: boolean;
  isLarge: boolean;
}

/** Informações de viewport reativas a rotação/redimensionamento. */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const breakpoint = resolveBreakpoint(width);
  return {
    width,
    height,
    breakpoint,
    isSmall: breakpoint === 'sm',
    isLarge: breakpoint === 'lg',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agenda/mobile test -- useResponsive`
Expected: PASS — 4 testes verdes.

- [ ] **Step 5: Commit (stage only)**

```bash
git add apps/mobile/src/hooks/useResponsive.ts apps/mobile/src/hooks/useResponsive.test.ts
# mensagem sugerida: feat(mobile): add responsive viewport hook
```

---

## Task A2: Escala tipográfica responsiva

**Files:**
- Create: `apps/mobile/src/utils/responsiveType.ts`
- Test: `apps/mobile/src/utils/responsiveType.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/mobile/src/utils/responsiveType.test.ts`:

```typescript
import { scaleFontSize } from './responsiveType';

describe('scaleFontSize', () => {
  it('mantém o tamanho base em "md"', () => {
    expect(scaleFontSize(24, 'md')).toBe(24);
    expect(scaleFontSize(14, 'md')).toBe(14);
  });

  it('reduz ~8% em "sm" com arredondamento', () => {
    expect(scaleFontSize(24, 'sm')).toBe(22);
    expect(scaleFontSize(28, 'sm')).toBe(26);
  });

  it('aumenta ~8% em "lg" com arredondamento', () => {
    expect(scaleFontSize(24, 'lg')).toBe(26);
    expect(scaleFontSize(28, 'lg')).toBe(30);
  });

  it('aplica clamp mínimo de 12', () => {
    expect(scaleFontSize(12, 'sm')).toBe(12);
    expect(scaleFontSize(11, 'sm')).toBe(12);
  });

  it('sempre retorna number', () => {
    expect(typeof scaleFontSize(20, 'lg')).toBe('number');
  });
});
```

> Verificação de valores (não vai no código): `Math.round(24*0.92)=22`, `Math.round(28*0.92)=26`, `Math.round(24*1.08)=26`, `Math.round(28*1.08)=30`, `Math.round(12*0.92)=11`→clamp 12, `Math.round(11*0.92)=10`→clamp 12.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agenda/mobile test -- responsiveType`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

`apps/mobile/src/utils/responsiveType.ts`:

```typescript
import type { Breakpoint } from '@/hooks/useResponsive';

const FACTORS: Record<Breakpoint, number> = {
  sm: 0.92,
  md: 1,
  lg: 1.08,
};

const MIN_FONT_SIZE = 12;

/** Escala um tamanho de fonte base conforme o breakpoint, com clamp mínimo. */
export function scaleFontSize(base: number, breakpoint: Breakpoint): number {
  const scaled = Math.round(base * FACTORS[breakpoint]);
  return Math.max(MIN_FONT_SIZE, scaled);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agenda/mobile test -- responsiveType`
Expected: PASS — 5 testes verdes.

- [ ] **Step 5: Commit (stage only)**

```bash
git add apps/mobile/src/utils/responsiveType.ts apps/mobile/src/utils/responsiveType.test.ts
# mensagem sugerida: feat(mobile): add responsive font scaling util
```

---

## Task A3: SafeArea na tab bar

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

> Sem teste unitário: é um componente de layout sem lógica extraível (`AGENTS.md` exige testes para services/utils; layout puro não se enquadra). Validação fica no checklist de QA (Task C4).

- [ ] **Step 1: Aplicar insets ao tabBarStyle**

Substituir o corpo de `apps/mobile/app/(tabs)/_layout.tsx` por (mudanças: importar `useSafeAreaInsets`, calcular `paddingBottom`/`height`):

```tsx
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { fontFamilies } from '@/theme/typography';

const TAB_BAR_BASE_HEIGHT = 56;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.popover,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fontFamilies.bodyMedium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Icon name="house" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Icon name="location-dot" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => (
            <Icon name="heart" variant="regular" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" variant="regular" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" variant="regular" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS — sem erros TS.

- [ ] **Step 3: Commit (stage only)**

```bash
git add apps/mobile/app/(tabs)/_layout.tsx
# mensagem sugerida: fix(mobile): respect safe area insets in tab bar
```

---

## Task A4: Aplicar escala tipográfica no ScreenHeader

**Files:**
- Modify: `apps/mobile/src/components/layout/ScreenHeader.tsx`

> Sem teste unitário próprio (componente de UI); a lógica testável (`scaleFontSize`) já tem cobertura em A2.

- [ ] **Step 1: Usar scaleFontSize no título**

Em `apps/mobile/src/components/layout/ScreenHeader.tsx`, adicionar imports e trocar o `text-[24px]` fixo por tamanho escalável via `style`.

Adicionar aos imports (após a linha `import { cn } from '@/utils/cn';`):

```tsx
import { useResponsive } from '@/hooks/useResponsive';
import { scaleFontSize } from '@/utils/responsiveType';
```

Dentro de `ScreenHeader`, após `const insets = useSafeAreaInsets();`, adicionar:

```tsx
  const { breakpoint } = useResponsive();
  const titleSize = scaleFontSize(24, breakpoint);
```

Trocar o bloco do título (atualmente):

```tsx
            <Text
              className="font-heading text-foreground text-[24px]"
              numberOfLines={1}
              style={{ letterSpacing: headingLetterSpacing(24) }}
            >
              {title}
            </Text>
```

por:

```tsx
            <Text
              className="font-heading text-foreground"
              numberOfLines={1}
              style={{ fontSize: titleSize, letterSpacing: headingLetterSpacing(titleSize) }}
            >
              {title}
            </Text>
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Commit (stage only)**

```bash
git add apps/mobile/src/components/layout/ScreenHeader.tsx
# mensagem sugerida: feat(mobile): scale screen header title by viewport
```

---

# Bloco B — Tarefa 4.2: Tratamento Offline

## Task B1: Hook useConnectivity

**Files:**
- Create: `apps/mobile/src/hooks/useConnectivity.ts`
- Test: `apps/mobile/src/hooks/useConnectivity.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/mobile/src/hooks/useConnectivity.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';

import { useConnectivity } from './useConnectivity';

describe('useConnectivity', () => {
  afterEach(() => {
    act(() => onlineManager.setOnline(true));
  });

  it('reflete o estado inicial do onlineManager', () => {
    act(() => onlineManager.setOnline(true));
    const { result } = renderHook(() => useConnectivity());
    expect(result.current.isOnline).toBe(true);
  });

  it('atualiza quando o onlineManager muda para offline e volta', () => {
    const { result } = renderHook(() => useConnectivity());
    act(() => onlineManager.setOnline(false));
    expect(result.current.isOnline).toBe(false);
    act(() => onlineManager.setOnline(true));
    expect(result.current.isOnline).toBe(true);
  });
});
```

> Se `@testing-library/react-native` não estiver instalado, instalar como devDep antes (passo abaixo). Verificar com `ls apps/mobile/node_modules/@testing-library` — não está nas deps atuais, então será preciso adicioná-lo.

- [ ] **Step 2: Instalar testing-library (se ausente)**

Run: `pnpm --filter @agenda/mobile add -D @testing-library/react-native`
Expected: pacote adicionado a `devDependencies`. (É a lib padrão para testar hooks/componentes RN com `jest-expo`.)

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @agenda/mobile test -- useConnectivity`
Expected: FAIL — módulo `./useConnectivity` não encontrado.

- [ ] **Step 4: Write minimal implementation**

`apps/mobile/src/hooks/useConnectivity.ts`:

```typescript
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  return onlineManager.subscribe(callback);
}

function getSnapshot(): boolean {
  return onlineManager.isOnline();
}

export interface Connectivity {
  isOnline: boolean;
}

/**
 * Estado de conectividade derivado do `onlineManager` do TanStack Query
 * (alimentado por NetInfo no nativo e `navigator.onLine` no web). Não
 * reimplementa detecção de rede — é uma view reativa do que já existe.
 */
export function useConnectivity(): Connectivity {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { isOnline };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @agenda/mobile test -- useConnectivity`
Expected: PASS — 2 testes verdes.

- [ ] **Step 6: Commit (stage only)**

```bash
git add apps/mobile/src/hooks/useConnectivity.ts apps/mobile/src/hooks/useConnectivity.test.ts apps/mobile/package.json
# mensagem sugerida: feat(mobile): add useConnectivity hook over onlineManager
```

---

## Task B2: Componente OfflineBanner

**Files:**
- Create: `apps/mobile/src/components/ui/OfflineBanner.tsx`

> Sem teste unitário: componente visual sem lógica extraível; consome `useConnectivity` (já testado em B1). Validado no checklist QA.

- [ ] **Step 1: Criar o banner**

`apps/mobile/src/components/ui/OfflineBanner.tsx`:

```tsx
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConnectivity } from '@/hooks/useConnectivity';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';

/** Barra discreta no topo, visível apenas quando o app está offline. */
export function OfflineBanner() {
  const { isOnline } = useConnectivity();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isOnline ? 0 : 1, { duration: 220 });
  }, [isOnline, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -8 }],
  }));

  if (isOnline) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          zIndex: 50,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View className="bg-card border-border flex-row items-center gap-2 rounded-full border px-3 py-1.5">
        <Icon name="wifi" variant="solid" color={colors.mutedForeground} size={12} />
        <Text className="font-body-medium text-muted-foreground text-[12px]">
          Você está offline. Exibindo dados salvos.
        </Text>
      </View>
    </Animated.View>
  );
}
```

> Nota: confirmar que o ícone `wifi` existe no `iconMap`. Se não, usar `'cloud'` ou outro presente — checar `apps/mobile/src/components/ui/iconMap.ts` antes deste passo e ajustar o `name`.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Commit (stage only)**

```bash
git add apps/mobile/src/components/ui/OfflineBanner.tsx
# mensagem sugerida: feat(mobile): add global offline banner
```

---

## Task B3: ErrorBoundary

**Files:**
- Create: `apps/mobile/src/components/ErrorBoundary.tsx`

> Exceção justificada à regra "só componentes funcionais": React exige class component para Error Boundary (`getDerivedStateFromError`/`componentDidCatch`). Sem lógica de service/util → sem teste unitário obrigatório; validado no checklist.

- [ ] **Step 1: Criar o ErrorBoundary**

`apps/mobile/src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Text, View } from '@/tw';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Captura erros de render da árvore e mostra um fallback com reset. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View className="bg-background flex-1 items-center justify-center gap-4 px-8">
        <Text className="font-heading text-foreground text-center text-[20px]">
          Algo deu errado
        </Text>
        <Text className="font-body text-muted-foreground text-center text-[14px]">
          Tivemos um problema ao carregar esta parte do app. Tente novamente.
        </Text>
        <Button label="Tentar novamente" onPress={this.reset} />
      </View>
    );
  }
}
```

> Confirmar a API de `Button` (prop `label`/`onPress`) lendo `apps/mobile/src/components/ui/Button.tsx` antes; ajustar se a assinatura diferir.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Commit (stage only)**

```bash
git add apps/mobile/src/components/ErrorBoundary.tsx
# mensagem sugerida: feat(mobile): add root error boundary
```

---

## Task B4: Montar ErrorBoundary + OfflineBanner no root

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Envolver a navegação e adicionar o banner**

Em `apps/mobile/app/_layout.tsx`, adicionar imports (junto aos imports de `@/`):

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
```

Trocar o conteúdo dentro de `<SafeAreaProvider>` para envolver com `ErrorBoundary` e incluir `OfflineBanner` após o `<StatusBar />`:

```tsx
      <SafeAreaProvider>
        <ErrorBoundary>
          <RealtimeBridge />
          <StatusBar style="light" />
          <OfflineBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Protected guard={hasOnboarded}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="event/[id]" />
              <Stack.Screen name="establishment/[id]" />
              <Stack.Screen name="city" />
              <Stack.Screen name="login" />
              <Stack.Screen
                name="filters"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.92],
                  sheetGrabberVisible: true,
                  sheetCornerRadius: 24,
                  contentStyle: { backgroundColor: colors.popover },
                }}
              />
            </Stack.Protected>
            <Stack.Protected guard={!hasOnboarded}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Commit (stage only)**

```bash
git add apps/mobile/app/_layout.tsx
# mensagem sugerida: feat(mobile): mount error boundary and offline banner at root
```

---

## Task B5: Estado de erro/retry na tela de evento

**Files:**
- Modify: `apps/mobile/app/event/[id].tsx`

> Sem teste unitário (tela). A query expõe `isError`/`refetch`; usamos o `EmptyState` existente.

- [ ] **Step 1: Adicionar bloco de erro com retry**

Em `apps/mobile/app/event/[id].tsx`, adicionar import:

```tsx
import { EmptyState } from '@/components/ui/EmptyState';
```

Logo após o bloco `if (isLoading) { ... }` e ANTES do `if (!event || !establishment)`, inserir o tratamento de erro de rede:

```tsx
  if (eventQuery.isError && !event) {
    return (
      <Screen>
        <ScreenHeader showBack />
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<Icon name="cloud" color={colors.mutedForeground} size={28} />}
            message="Você está sem internet no momento. Tente novamente quando reconectar."
            actionLabel="Tentar novamente"
            onAction={() => eventQuery.refetch()}
          />
        </View>
      </Screen>
    );
  }
```

> `EmptyState`, `Icon`, `colors`, `View`, `Screen`, `ScreenHeader` já estão importados no arquivo (exceto `EmptyState`, adicionado acima). Confirmar o ícone `cloud` no iconMap; ajustar se necessário.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Commit (stage only)**

```bash
git add apps/mobile/app/event/[id].tsx
# mensagem sugerida: feat(mobile): show offline retry state on event detail
```

---

## Task B6: Migração SQL user_favorites

**Files:**
- Create: `supabase/migrations/20260615120000_user_favorites.sql`

> Apenas criar o arquivo (decisão do usuário). Não rodar `supabase db push`.

- [ ] **Step 1: Criar a migração**

`supabase/migrations/20260615120000_user_favorites.sql`:

```sql
-- Favoritos por usuário. target_type distingue eventos de estabelecimentos;
-- target_id é o id textual do alvo (mesma forma usada no app).
CREATE TABLE public.user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'establishment')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê seus próprios favoritos"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere seus próprios favoritos"
  ON public.user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário remove seus próprios favoritos"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX user_favorites_user_idx ON public.user_favorites (user_id);
```

- [ ] **Step 2: Validar sintaxe (lint leve)**

Run: `grep -c "CREATE POLICY" supabase/migrations/20260615120000_user_favorites.sql`
Expected: `3` (três políticas RLS).

- [ ] **Step 3: Commit (stage only)**

```bash
git add supabase/migrations/20260615120000_user_favorites.sql
# mensagem sugerida: feat(db): add user_favorites table with RLS
```

---

## Task B7: Service de favoritos (TDD)

**Files:**
- Create: `apps/mobile/src/services/favorites.ts`
- Test: `apps/mobile/src/services/favorites.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/mobile/src/services/favorites.test.ts`:

```typescript
import {
  addServerFavorite,
  fetchServerFavorites,
  removeServerFavorite,
  type FavoriteTarget,
} from './favorites';

const mockGetSupabase = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
}));

beforeEach(() => {
  mockGetSupabase.mockReset();
});

describe('fetchServerFavorites', () => {
  it('retorna lista vazia quando não há client (deslogado/sem config)', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(fetchServerFavorites()).resolves.toEqual([]);
  });

  it('mapeia linhas do servidor para FavoriteTarget', async () => {
    const rows = [
      { target_type: 'event', target_id: 'ev1' },
      { target_type: 'establishment', target_id: 'es1' },
    ];
    const client = {
      from: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: rows, error: null })),
      })),
    };
    mockGetSupabase.mockReturnValue(client);

    const result = await fetchServerFavorites();
    expect(result).toEqual<FavoriteTarget[]>([
      { type: 'event', id: 'ev1' },
      { type: 'establishment', id: 'es1' },
    ]);
    expect(client.from).toHaveBeenCalledWith('user_favorites');
  });

  it('propaga erro do select', async () => {
    const error = new Error('select failed');
    const client = {
      from: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: null, error })),
      })),
    };
    mockGetSupabase.mockReturnValue(client);
    await expect(fetchServerFavorites()).rejects.toBe(error);
  });
});

describe('addServerFavorite / removeServerFavorite', () => {
  it('addServerFavorite é no-op sem client', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(
      addServerFavorite('userX', { type: 'event', id: 'ev1' }),
    ).resolves.toBeUndefined();
  });

  it('addServerFavorite faz upsert com user_id e alvo', async () => {
    const upsert = jest.fn(() => Promise.resolve({ error: null }));
    const client = { from: jest.fn(() => ({ upsert })) };
    mockGetSupabase.mockReturnValue(client);

    await addServerFavorite('userX', { type: 'event', id: 'ev1' });
    expect(client.from).toHaveBeenCalledWith('user_favorites');
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'userX',
      target_type: 'event',
      target_id: 'ev1',
    });
  });

  it('removeServerFavorite filtra por user_id/type/id', async () => {
    const eqId = jest.fn(() => Promise.resolve({ error: null }));
    const eqType = jest.fn(() => ({ eq: eqId }));
    const eqUser = jest.fn(() => ({ eq: eqType }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const client = { from: jest.fn(() => ({ delete: del })) };
    mockGetSupabase.mockReturnValue(client);

    await removeServerFavorite('userX', { type: 'establishment', id: 'es1' });
    expect(eqUser).toHaveBeenCalledWith('user_id', 'userX');
    expect(eqType).toHaveBeenCalledWith('target_type', 'establishment');
    expect(eqId).toHaveBeenCalledWith('target_id', 'es1');
  });

  it('addServerFavorite propaga erro do upsert', async () => {
    const error = new Error('upsert failed');
    const client = { from: jest.fn(() => ({ upsert: jest.fn(() => Promise.resolve({ error })) })) };
    mockGetSupabase.mockReturnValue(client);
    await expect(
      addServerFavorite('userX', { type: 'event', id: 'ev1' }),
    ).rejects.toBe(error);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @agenda/mobile test -- favorites`
Expected: FAIL — módulo `./favorites` não encontrado.

- [ ] **Step 3: Write minimal implementation**

`apps/mobile/src/services/favorites.ts`:

```typescript
import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

export const favoriteTargetTypeSchema = z.enum(['event', 'establishment']);
export type FavoriteTargetType = z.infer<typeof favoriteTargetTypeSchema>;

export interface FavoriteTarget {
  type: FavoriteTargetType;
  id: string;
}

const favoriteRowSchema = z.object({
  target_type: favoriteTargetTypeSchema,
  target_id: z.string(),
});

const favoriteRowsSchema = z.array(favoriteRowSchema);

const TABLE = 'user_favorites';

/** Favoritos do usuário logado. Sem client (deslogado/sem config) → []. */
export async function fetchServerFavorites(): Promise<FavoriteTarget[]> {
  const client = getSupabase();
  if (client === null) {
    return [];
  }
  const { data, error } = await client.from(TABLE).select('target_type, target_id');
  if (error) {
    throw error;
  }
  const rows = favoriteRowsSchema.parse(data ?? []);
  return rows.map((row) => ({ type: row.target_type, id: row.target_id }));
}

/** Adiciona (idempotente via upsert) um favorito no servidor. No-op sem client. */
export async function addServerFavorite(
  userId: string,
  target: FavoriteTarget,
): Promise<void> {
  const client = getSupabase();
  if (client === null) {
    return;
  }
  const { error } = await client.from(TABLE).upsert({
    user_id: userId,
    target_type: target.type,
    target_id: target.id,
  });
  if (error) {
    throw error;
  }
}

/** Remove um favorito do servidor. No-op sem client. */
export async function removeServerFavorite(
  userId: string,
  target: FavoriteTarget,
): Promise<void> {
  const client = getSupabase();
  if (client === null) {
    return;
  }
  const { error } = await client
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('target_type', target.type)
    .eq('target_id', target.id);
  if (error) {
    throw error;
  }
}
```

> Nota de tipos: `getSupabase()` retorna o client tipado do `@agenda/core`. Os encadeamentos `.from().select()/.upsert()/.delete().eq()` são compatíveis com a API do supabase-js. Se o TS reclamar do tipo de retorno do mock vs. real, manter o service como está (a tipagem real do supabase-js cobre esses métodos) — o teste usa mocks estruturais.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @agenda/mobile test -- favorites`
Expected: PASS — 7 testes verdes.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 6: Commit (stage only)**

```bash
git add apps/mobile/src/services/favorites.ts apps/mobile/src/services/favorites.test.ts
# mensagem sugerida: feat(mobile): add favorites server sync service
```

---

## Task B8: Fila offline + sync no useFavoritesStore (TDD)

**Files:**
- Modify: `apps/mobile/src/store/useFavoritesStore.ts`
- Modify: `apps/mobile/src/store/useFavoritesStore.test.ts`

> Este é o passo mais sensível: o store ganha estado e ações novas SEM quebrar o contrato atual (`eventIds`, `establishmentIds`, `toggleEvent`, `toggleEstablishment`, selectors `isEventFavorite`/`isEstablishmentFavorite` mantêm comportamento e valores idênticos quando offline/deslogado). Por isso os testes existentes devem continuar passando inalterados.

- [ ] **Step 1: Write the failing tests (novos casos)**

Adicionar ao final de `apps/mobile/src/store/useFavoritesStore.test.ts`, ANTES do fechamento. Primeiro, ajustar o topo do arquivo para mockar o service e resetar o estado estendido. Substituir o início do arquivo:

```typescript
import {
  isEstablishmentFavorite,
  isEventFavorite,
  useFavoritesStore,
} from './useFavoritesStore';

const addServerFavorite = jest.fn(() => Promise.resolve());
const removeServerFavorite = jest.fn(() => Promise.resolve());
const fetchServerFavorites = jest.fn(() => Promise.resolve([]));

jest.mock('@/services/favorites', () => ({
  addServerFavorite: (...args: unknown[]) => addServerFavorite(...args),
  removeServerFavorite: (...args: unknown[]) => removeServerFavorite(...args),
  fetchServerFavorites: (...args: unknown[]) => fetchServerFavorites(...args),
}));

describe('useFavoritesStore', () => {
  beforeEach(() => {
    addServerFavorite.mockClear();
    removeServerFavorite.mockClear();
    fetchServerFavorites.mockClear();
    useFavoritesStore.setState({
      eventIds: [],
      establishmentIds: [],
      pendingOps: [],
    });
  });
```

Manter os 4 testes existentes (começam sem favoritos, toggleEvent, toggleEstablishment, selectors). Adicionar antes do `});` final do describe:

```typescript
  it('toggleEvent enfileira uma op pendente de add', () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    expect(useFavoritesStore.getState().pendingOps).toEqual([
      { op: 'add', target: { type: 'event', id: 'ev1' } },
    ]);
  });

  it('toggleEvent duas vezes resulta em fila add+remove e estado vazio', () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    useFavoritesStore.getState().toggleEvent('ev1');
    expect(useFavoritesStore.getState().eventIds).toEqual([]);
    expect(useFavoritesStore.getState().pendingOps).toEqual([
      { op: 'add', target: { type: 'event', id: 'ev1' } },
      { op: 'remove', target: { type: 'event', id: 'ev1' } },
    ]);
  });

  it('flushQueue deslogado (sem userId) é no-op e mantém a fila', async () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    await useFavoritesStore.getState().flushQueue(null);
    expect(addServerFavorite).not.toHaveBeenCalled();
    expect(useFavoritesStore.getState().pendingOps).toHaveLength(1);
  });

  it('flushQueue logado drena a fila chamando o service e a esvazia', async () => {
    useFavoritesStore.getState().toggleEvent('ev1');
    useFavoritesStore.getState().toggleEstablishment('es1');
    await useFavoritesStore.getState().flushQueue('userX');
    expect(addServerFavorite).toHaveBeenCalledWith('userX', { type: 'event', id: 'ev1' });
    expect(addServerFavorite).toHaveBeenCalledWith('userX', {
      type: 'establishment',
      id: 'es1',
    });
    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
  });

  it('flushQueue mantém ops que falharam na fila', async () => {
    addServerFavorite.mockRejectedValueOnce(new Error('network'));
    useFavoritesStore.getState().toggleEvent('ev1');
    await useFavoritesStore.getState().flushQueue('userX');
    expect(useFavoritesStore.getState().pendingOps).toHaveLength(1);
  });

  it('mergeLocalIntoServer envia favoritos locais ainda não no servidor', async () => {
    fetchServerFavorites.mockResolvedValueOnce([{ type: 'event', id: 'ev1' }]);
    useFavoritesStore.setState({
      eventIds: ['ev1', 'ev2'],
      establishmentIds: ['es1'],
      pendingOps: [],
    });
    await useFavoritesStore.getState().mergeLocalIntoServer('userX');
    expect(addServerFavorite).toHaveBeenCalledWith('userX', { type: 'event', id: 'ev2' });
    expect(addServerFavorite).toHaveBeenCalledWith('userX', {
      type: 'establishment',
      id: 'es1',
    });
    expect(addServerFavorite).not.toHaveBeenCalledWith('userX', { type: 'event', id: 'ev1' });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm --filter @agenda/mobile test -- useFavoritesStore`
Expected: FAIL — `pendingOps`/`flushQueue`/`mergeLocalIntoServer` não existem.

- [ ] **Step 3: Implement the extended store**

Substituir `apps/mobile/src/store/useFavoritesStore.ts` por:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  addServerFavorite,
  type FavoriteTarget,
  fetchServerFavorites,
  removeServerFavorite,
} from '@/services/favorites';

import { appJsonStorage } from './storage';

export interface PendingOp {
  op: 'add' | 'remove';
  target: FavoriteTarget;
}

export interface FavoritesState {
  eventIds: string[];
  establishmentIds: string[];
  pendingOps: PendingOp[];
  toggleEvent: (id: string) => void;
  toggleEstablishment: (id: string) => void;
  flushQueue: (userId: string | null) => Promise<void>;
  mergeLocalIntoServer: (userId: string) => Promise<void>;
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      eventIds: [],
      establishmentIds: [],
      pendingOps: [],
      toggleEvent: (id) =>
        set((state) => {
          const willAdd = !state.eventIds.includes(id);
          return {
            eventIds: toggleId(state.eventIds, id),
            pendingOps: [
              ...state.pendingOps,
              { op: willAdd ? 'add' : 'remove', target: { type: 'event', id } },
            ],
          };
        }),
      toggleEstablishment: (id) =>
        set((state) => {
          const willAdd = !state.establishmentIds.includes(id);
          return {
            establishmentIds: toggleId(state.establishmentIds, id),
            pendingOps: [
              ...state.pendingOps,
              { op: willAdd ? 'add' : 'remove', target: { type: 'establishment', id } },
            ],
          };
        }),
      flushQueue: async (userId) => {
        if (userId === null) {
          return;
        }
        const queue = get().pendingOps;
        const failed: PendingOp[] = [];
        for (const pending of queue) {
          try {
            if (pending.op === 'add') {
              await addServerFavorite(userId, pending.target);
            } else {
              await removeServerFavorite(userId, pending.target);
            }
          } catch {
            failed.push(pending);
          }
        }
        set({ pendingOps: failed });
      },
      mergeLocalIntoServer: async (userId) => {
        const server = await fetchServerFavorites();
        const onServer = new Set(server.map((target) => `${target.type}:${target.id}`));
        const local: FavoriteTarget[] = [
          ...get().eventIds.map((id) => ({ type: 'event' as const, id })),
          ...get().establishmentIds.map((id) => ({ type: 'establishment' as const, id })),
        ];
        for (const target of local) {
          if (!onServer.has(`${target.type}:${target.id}`)) {
            await addServerFavorite(userId, target);
          }
        }
      },
    }),
    {
      name: 'favorites',
      storage: appJsonStorage,
    },
  ),
);

/** Selector puro: o evento está favoritado? */
export function isEventFavorite(state: FavoritesState, id: string): boolean {
  return state.eventIds.includes(id);
}

/** Selector puro: o estabelecimento está favoritado? */
export function isEstablishmentFavorite(state: FavoritesState, id: string): boolean {
  return state.establishmentIds.includes(id);
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `pnpm --filter @agenda/mobile test -- useFavoritesStore`
Expected: PASS — 4 testes antigos + 6 novos = 10 verdes.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 6: Commit (stage only)**

```bash
git add apps/mobile/src/store/useFavoritesStore.ts apps/mobile/src/store/useFavoritesStore.test.ts
# mensagem sugerida: feat(mobile): queue favorites offline and sync on reconnect
```

---

## Task B9: Disparar sync na reconexão e no login

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

> Liga o store ao ciclo de vida: ao reconectar (`onlineManager.subscribe`) drena a fila; ao logar (`onAuthUserChange`), faz merge + flush. Deslogado → no-op (garantido pelo store). Sem teste unitário (efeito de composição de layout); a lógica drenada já é coberta em B8.

- [ ] **Step 1: Adicionar a ponte de sync**

Em `apps/mobile/app/_layout.tsx`, adicionar imports:

```tsx
import { onlineManager } from '@tanstack/react-query';

import { onAuthUserChange } from '@/services/auth';
import { useFavoritesStore } from '@/store/useFavoritesStore';
```

Adicionar um `useEffect` dentro de `RootLayout` (após o `useEffect` que chama `setupOnlineManager`):

```tsx
  useEffect(() => {
    const { flushQueue, mergeLocalIntoServer } = useFavoritesStore.getState();
    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) {
        const user = useAuthStore.getState().user;
        flushQueue(user?.id ?? null);
      }
    });
    const unsubscribeAuth = onAuthUserChange((user) => {
      if (user) {
        mergeLocalIntoServer(user.id).then(() => flushQueue(user.id));
      }
    });
    return () => {
      unsubscribeOnline();
      unsubscribeAuth();
    };
  }, []);
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Run full mobile suite**

Run: `pnpm --filter @agenda/mobile test`
Expected: PASS — toda a suite verde.

- [ ] **Step 4: Commit (stage only)**

```bash
git add apps/mobile/app/_layout.tsx
# mensagem sugerida: feat(mobile): trigger favorites sync on reconnect and login
```

---

# Bloco C — Tarefa 4.3: Testes e QA

## Task C1: Teste de redirectSystemPath (+native-intent)

**Files:**
- Create: `apps/mobile/app/+native-intent.test.ts`

> Jest está configurado com `testMatch: ['<rootDir>/src/**/*.test.ts']` — só pega `src/`. Para um teste em `app/`, precisamos garantir que ele seja coletado. Solução sem mover a rota: importar a função do arquivo `app/+native-intent.tsx` a partir de um teste em `src/`.

Reavaliação: o `+native-intent.tsx` reside em `app/` e o `redirectSystemPath` apenas delega ao `mapWebPathToRoute` (já 100% testado em `src/utils/deepLinks.test.ts`) com try/catch. Para cobrir o contrato de delegação+fallback sem alterar `testMatch`, criar o teste em `src/`.

- Create (corrigido): `apps/mobile/src/utils/nativeIntent.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/mobile/src/utils/nativeIntent.test.ts`:

```typescript
import { redirectSystemPath } from '../../app/+native-intent';

describe('redirectSystemPath', () => {
  it('delega ao mapeamento para paths válidos', () => {
    expect(redirectSystemPath({ path: '/eventos/floripa/show', initial: true })).toBe(
      '/event/show',
    );
    expect(redirectSystemPath({ path: '/bares/floripa/boteco', initial: false })).toBe(
      '/establishment/boteco',
    );
  });

  it('preserva rotas internas conhecidas', () => {
    expect(redirectSystemPath({ path: '/profile', initial: false })).toBe('/profile');
  });

  it('cai no fallback "/" para paths desconhecidos', () => {
    expect(redirectSystemPath({ path: '/algo/que/nao/existe', initial: false })).toBe('/');
  });
});
```

> Confirmar que o alias relativo `../../app/+native-intent` resolve a partir de `src/utils/`. `src/utils/nativeIntent.test.ts` → subir 2 níveis chega em `apps/mobile/`, então `app/+native-intent`. Se o resolver do jest-expo não importar de fora de `src` por causa de `transformIgnorePatterns`, alternativa: o arquivo `+native-intent.tsx` está em `app/` (não ignorado). Caso falhe a resolução, mover o teste para `apps/mobile/app/+native-intent.test.ts` e adicionar `'<rootDir>/app/**/*.test.ts'` ao `testMatch` do jest.config.js.

- [ ] **Step 2: Run test to verify it fails (red) then passes (green)**

Run: `pnpm --filter @agenda/mobile test -- nativeIntent`
Expected: inicialmente o teste roda; como `redirectSystemPath` já existe, deve PASSAR diretamente (este é um teste de regressão de contrato, não de código novo). Se falhar por resolução de import, aplicar a alternativa do passo 1.

- [ ] **Step 3: Commit (stage only)**

```bash
git add apps/mobile/src/utils/nativeIntent.test.ts
# (se aplicou a alternativa) git add apps/mobile/app/+native-intent.test.ts apps/mobile/jest.config.js
# mensagem sugerida: test(mobile): cover redirectSystemPath delegation and fallback
```

---

## Task C2: Guarda de coordenadas inválidas em proximity (TDD)

**Files:**
- Modify: `apps/mobile/src/services/proximity.ts`
- Modify: `apps/mobile/src/services/proximity.test.ts`

> `proximity.ts` é um service modificado → exige teste novo (AGENTS.md). Contrato preservado: o comportamento para coordenadas válidas é idêntico ao atual (testes existentes continuam verdes); adicionamos rejeição explícita para entradas inválidas.

- [ ] **Step 1: Write the failing tests**

Adicionar ao final de `apps/mobile/src/services/proximity.test.ts`, antes do EOF, um novo describe:

```typescript
describe('listNearbyEstablishments — coordenadas inválidas', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(null);
  });

  it('rejeita lat NaN', async () => {
    await expect(
      listNearbyEstablishments({ lat: Number.NaN, lng: FLN.lng }),
    ).rejects.toThrow(/coordenada/i);
  });

  it('rejeita lng fora do intervalo [-180, 180]', async () => {
    await expect(
      listNearbyEstablishments({ lat: FLN.lat, lng: 200 }),
    ).rejects.toThrow(/coordenada/i);
  });

  it('rejeita lat fora do intervalo [-90, 90]', async () => {
    await expect(
      listNearbyEstablishments({ lat: 95, lng: FLN.lng }),
    ).rejects.toThrow(/coordenada/i);
  });

  it('aceita coordenadas válidas nos limites', async () => {
    await expect(
      listNearbyEstablishments({ lat: -90, lng: 180, radiusKm: 1 }),
    ).resolves.toBeInstanceOf(Array);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @agenda/mobile test -- proximity`
Expected: FAIL — coordenadas inválidas hoje não são rejeitadas (NaN/200/95 passam adiante).

- [ ] **Step 3: Add the guard**

Em `apps/mobile/src/services/proximity.ts`, adicionar a função de validação após a definição de `NearbyParams` (após a linha que fecha `export interface NearbyParams { ... }`):

```typescript
function assertValidCoordinates(lat: number, lng: number): void {
  const valid =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;
  if (!valid) {
    throw new Error(`Coordenada inválida: lat=${lat}, lng=${lng}`);
  }
}
```

No início de `listNearbyEstablishments`, antes de `const client = getSupabase();`, adicionar:

```typescript
  assertValidCoordinates(params.lat, params.lng);
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `pnpm --filter @agenda/mobile test -- proximity`
Expected: PASS — testes antigos (RPC + fallback) + 4 novos verdes.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: PASS.

- [ ] **Step 6: Commit (stage only)**

```bash
git add apps/mobile/src/services/proximity.ts apps/mobile/src/services/proximity.test.ts
# mensagem sugerida: feat(mobile): reject invalid coordinates in proximity service
```

---

## Task C3: Checklist de QA manual

**Files:**
- Create: `docs/qa/checklist-fase-4.md`

- [ ] **Step 1: Criar o checklist**

`docs/qa/checklist-fase-4.md`:

```markdown
# Checklist de QA Manual — Fase 4

> Use em build de desenvolvimento (`pnpm --filter @agenda/mobile dev`) e na web (`expo start --web`).

## 1. Adaptação para telas (4.1)

- [ ] iPhone 15/16 Pro (Dynamic Island): header e tab bar não ficam sob o notch nem sob a home indicator.
- [ ] iPhone SE 3rd Gen (375px): títulos não estouram (overflow); fontes reduzidas legíveis.
- [ ] iPad / tablet: layout centralizado, fontes maiores, sem esticar demais.
- [ ] Android Pixel 8/9: tab bar respeita a navigation bar do sistema.
- [ ] Android resolução baixa (Nexus S): conteúdo legível, sem corte.
- [ ] Web 320px → 1440px (Chrome/Safari DevTools): responsivo, sem overflow horizontal.

## 2. Tratamento offline (4.2)

- [ ] Ativar modo avião: banner "Você está offline" aparece com animação.
- [ ] Reconectar: banner some suavemente.
- [ ] Feed/destaques: dados em cache continuam visíveis offline.
- [ ] Tela de evento sem cache + offline: estado de erro com "Tentar novamente"; ao reconectar e tocar, recarrega.
- [ ] Favoritar offline: coração muda na hora (optimistic). Reconectar logado: favorito persiste no servidor.
- [ ] Login após favoritar offline: favoritos locais migram para o servidor (merge), sem duplicar.
- [ ] Forçar erro de render: ErrorBoundary mostra fallback "Algo deu errado" + "Tentar novamente".

## 3. Fluxos críticos (4.3)

- [ ] Deep link `/eventos/{cidade}/{slug}` abre a tela de evento correta.
- [ ] Deep link `/bares/{cidade}/{slug}` abre o estabelecimento correto.
- [ ] Path desconhecido cai na home sem crash.
- [ ] Interrupção de rede no carregamento de imagens: placeholders se mantêm, sem tela branca.
- [ ] Concorrência: atualizar um bar no `apps/admin` → o app nativo reflete via realtime sem travar nem vazar memória (observar reabrindo a tela algumas vezes).
- [ ] Busca por proximidade: resultados ordenados por distância; coordenadas inválidas não quebram a tela.

## 4. Definition of Done

- [ ] `turbo run test` verde.
- [ ] `turbo run typecheck` sem erros.
- [ ] `pnpm lint` sem avisos.
```

- [ ] **Step 2: Commit (stage only)**

```bash
git add docs/qa/checklist-fase-4.md
# mensagem sugerida: docs(qa): add phase 4 manual QA checklist
```

---

## Task C4: Verificação final (DoD)

**Files:** nenhum (gate de verificação).

- [ ] **Step 1: Rodar a suíte de testes completa**

Run: `turbo run test`
Expected: PASS — todos os pacotes (`@agenda/mobile`, `@agenda/core`) verdes. Capturar o resumo (`Tests: N passed`).

- [ ] **Step 2: Typecheck do monorepo**

Run: `turbo run typecheck`
Expected: PASS — sem erros TS strict em mobile/core/admin.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: sem erros nem avisos. Corrigir o que aparecer (imports fora de ordem via `simple-import-sort`, etc.) e re-rodar.

- [ ] **Step 4: Stage final e resumo**

```bash
git status --short
# revisar que tudo relacionado à Fase 4 está staged; resumir entregáveis por bloco.
```

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage:**
- 4.1 SafeArea → A3 (tab bar) + Screen/ScreenHeader já existentes. ✓
- 4.1 responsivo (hook + tipografia) → A1, A2, A4. ✓
- 4.1 split plataforma → coberto pelo existente (mapa); decisão YAGNI documentada. ✓
- 4.2 detecção/hook → B1. ✓
- 4.2 persistência → já existente (Fase 3); reconfirmada na spec. ✓
- 4.2 UI offline (banner + empty/retry) → B2, B5. ✓
- 4.2 resiliência (optimistic + fila + sync + ErrorBoundary) → B3, B4, B6, B7, B8, B9. ✓
- 4.3 testes services/utils novos → A1, A2, B1, B7, B8, C2. ✓
- 4.3 rotas/deep link → C1. ✓
- 4.3 proximity coords inválidas → C2. ✓
- 4.3 E2E → substituído por testes Jest + checklist (decisão do usuário) → C1, C2, C3. ✓
- 4.3 checklist QA → C3. ✓
- DoD → C4. ✓

**Placeholder scan:** sem TBD/TODO. Pontos com "confirmar X antes" (ícone do iconMap, API do Button, resolução de import do +native-intent) são verificações pré-implementação explícitas, não placeholders de conteúdo.

**Type consistency:** `Breakpoint` (A1) reusado em A2/A4. `FavoriteTarget`/`FavoriteTargetType` (B7) reusados em B8. `PendingOp` definido em B8 e usado nos testes B8. `flushQueue(userId: string | null)` e `mergeLocalIntoServer(userId: string)` com assinaturas consistentes entre store (B8) e ponte de layout (B9). Service `favorites` exporta `addServerFavorite`/`removeServerFavorite`/`fetchServerFavorites` — mesmos nomes usados no mock de B8 e na implementação B7. ✓
