# Rate-limiting Client-side (Anti-spam) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar a proteção anti-duplo-clique que já existe no mobile para os três apps web, e adicionar cooldown visível de reenvio de OTP com aviso antecipado antes do limite real do Supabase.

**Architecture:** Reaproveitar `createPressGuard` (lógica pura, já testada) num hook novo `useGuardedClick` para `<button onClick>`. Um segundo hook `useResendCooldown` controla contagem regressiva e número de tentativas. Ambos no core, consumidos pelos três apps web. O mobile não muda — já está protegido via `Button`/`CircleIconButton`.

**Tech Stack:** React 19.2.3, TypeScript 6 strict, Jest 29.7 + `@testing-library/react` 16.3.3 (já instalados no core).

---

## Contexto que o implementador precisa saber

**O mobile já está resolvido, não mexa nele.** `apps/mobile/src/components/ui/Button.tsx` e `CircleIconButton.tsx` já embutem `useGuardedPress`, então toda tela mobile que usa esses componentes (inclusive login e favoritar) tem lock de 600ms. Nenhum arquivo de `apps/mobile/` é tocado por este plano.

**A lógica de lock já existe e é pura.** `packages/core/src/utils/pressGuard.ts` exporta `createPressGuard({ cooldownMs })` que devolve `{ guard }`. Não depende de React Native — só de `Date.now()`. O hook novo reusa essa função; **não reescreva a lógica de lock**.

**Por que 60 segundos de cooldown e não 600ms:** `supabase/config.toml` limita `email_sent = 2` por hora. O cooldown de UI existe para impedir rajada de cliques; o contador de tentativas existe para avisar o usuário antes de ele bater no limite de hora e receber um erro seco do servidor. São dois mecanismos com propósitos diferentes.

**Testes de hook no core: `.test.ts` com docblock jsdom.** O `testEnvironment` global é `node` e o `testMatch` é `**/*.test.ts` (não pega `.tsx`). O padrão exato já existe em `packages/core/src/hooks/useFeatureFlag.test.ts` — copie o cabeçalho dele.

**`toggleEstablishment` não está no EventCard.** Ele vive em `apps/web/app/(app)/establishment/[id]/page.tsx` (linhas 101 e 148). `EventCard.tsx` tem só `toggleEvent`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `packages/core/src/hooks/useGuardedClick.ts` (criar) | Wrapper de `createPressGuard` para `onClick` |
| `packages/core/src/hooks/useResendCooldown.ts` (criar) | Contagem regressiva + contador de tentativas |
| `packages/core/src/hooks/useGuardedClick.test.ts` (criar) | Teste do guard web |
| `packages/core/src/hooks/useResendCooldown.test.ts` (criar) | Teste do cooldown |
| `packages/core/src/index.ts` (modificar) | Exportar os dois hooks |
| `apps/web/app/login/page.tsx` (modificar) | Guard + cooldown + aviso |
| `apps/admin/app/login/page.tsx` (modificar) | Guard + cooldown + aviso |
| `apps/web-client/app/login/page.tsx` (modificar) | Guard + cooldown + aviso |
| `apps/web/components/event/EventCard.tsx` (modificar) | Guard no favoritar |
| `apps/web/app/(app)/establishment/[id]/page.tsx` (modificar) | Guard no favoritar |

---

### Task 1: Hook `useGuardedClick`

**Files:**
- Create: `packages/core/src/hooks/useGuardedClick.ts`
- Test: `packages/core/src/hooks/useGuardedClick.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `packages/core/src/hooks/useGuardedClick.test.ts`:

```ts
/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';

import { useGuardedClick } from './useGuardedClick';

describe('useGuardedClick', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('executa o handler na primeira chamada', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedClick(handler));

    result.current?.();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignora o segundo clique dentro do cooldown', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedClick(handler, { cooldownMs: 600 }));

    result.current?.();
    result.current?.();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('libera novo clique depois do cooldown', () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useGuardedClick(handler, { cooldownMs: 600 }));

    result.current?.();
    jest.advanceTimersByTime(600);
    result.current?.();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('devolve undefined quando o handler e undefined', () => {
    const { result } = renderHook(() => useGuardedClick(undefined));

    expect(result.current).toBeUndefined();
  });

  it('mantem a referencia estavel entre renders', () => {
    const handler = jest.fn();
    const { result, rerender } = renderHook(() => useGuardedClick(handler));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('invoca sempre o handler mais recente', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = renderHook(({ handler }) => useGuardedClick(handler), {
      initialProps: { handler: first },
    });

    rerender({ handler: second });
    result.current?.();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `pnpm --filter @agenda/core test -- useGuardedClick.test.ts`
Expected: FAIL com "Cannot find module './useGuardedClick'"

- [ ] **Step 3: Implementar o hook**

Crie `packages/core/src/hooks/useGuardedClick.ts`. É o gêmeo web de `useGuardedPress`, reusando o mesmo `createPressGuard`:

```ts
import { useCallback, useInsertionEffect, useMemo, useRef } from 'react';

import type { PressGuardOptions } from '../utils/pressGuard';
import { createPressGuard } from '../utils/pressGuard';

/**
 * Versao protegida de um handler de clique para `<button onClick>`. Gemeo web
 * de useGuardedPress: mesma logica de lock (createPressGuard), outro host. Sem
 * ele, um duplo clique em botao de submit dispara duas requisicoes — o
 * `disabled={busy}` das telas so cobre o intervalo em que a promise esta em voo.
 */
export function useGuardedClick<A extends unknown[]>(
  handler: ((...args: A) => unknown) | undefined,
  options: PressGuardOptions = {},
): ((...args: A) => void) | undefined {
  const { cooldownMs } = options;
  const handlerRef = useRef(handler);

  // useInsertionEffect (nao useEffect): atualiza o ref antes do paint, entao um
  // clique na UI recem-renderizada nunca executa handler obsoleto.
  useInsertionEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const pressGuard = useMemo(() => createPressGuard({ cooldownMs }), [cooldownMs]);

  const guarded = useCallback(
    (...args: A) => {
      pressGuard.guard(() => handlerRef.current?.(...args))();
    },
    [pressGuard],
  );

  return handler ? guarded : undefined;
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run: `pnpm --filter @agenda/core test -- useGuardedClick.test.ts`
Expected: PASS — 6 testes.

- [ ] **Step 5: Exportar no index**

Em `packages/core/src/index.ts`, no bloco alfabético de hooks, entre `export * from './hooks/useFeatureFlag';` e `export * from './hooks/useGuardedPress';`:

```ts
export * from './hooks/useGuardedClick';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/hooks/useGuardedClick.ts packages/core/src/hooks/useGuardedClick.test.ts packages/core/src/index.ts
git commit -m "Add useGuardedClick hook for web double-click protection"
```

---

### Task 2: Hook `useResendCooldown`

**Files:**
- Create: `packages/core/src/hooks/useResendCooldown.ts`
- Test: `packages/core/src/hooks/useResendCooldown.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `packages/core/src/hooks/useResendCooldown.test.ts`:

```ts
/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import { OTP_ATTEMPTS_PER_HOUR, useResendCooldown } from './useResendCooldown';

describe('useResendCooldown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('comeca pronto para enviar', () => {
    const { result } = renderHook(() => useResendCooldown());

    expect(result.current.isReady).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.attempts).toBe(0);
  });

  it('bloqueia e inicia a contagem depois de start', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.remainingSeconds).toBe(60);
  });

  it('decrementa a contagem a cada segundo', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.remainingSeconds).toBe(57);
  });

  it('volta a ficar pronto quando a contagem zera', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 2 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('conta as tentativas acumuladas', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 1 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      result.current.start();
    });

    expect(result.current.attempts).toBe(2);
  });

  it('avisa quando atinge o limite de envios por hora do Supabase', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 1 }));

    for (let i = 0; i < OTP_ATTEMPTS_PER_HOUR; i += 1) {
      act(() => {
        result.current.start();
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(result.current.hasReachedHourlyLimit).toBe(true);
  });

  it('reset zera contagem e tentativas', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.attempts).toBe(0);
    expect(result.current.hasReachedHourlyLimit).toBe(false);
  });

  it('limpa o intervalo ao desmontar', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { result, unmount } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `pnpm --filter @agenda/core test -- useResendCooldown.test.ts`
Expected: FAIL com "Cannot find module './useResendCooldown'"

- [ ] **Step 3: Implementar o hook**

Crie `packages/core/src/hooks/useResendCooldown.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Espelha `email_sent = 2` de [auth.rate_limit] em supabase/config.toml: e o
 * numero de e-mails que o Supabase aceita enviar por hora. Ao atingir esse
 * numero avisamos antes, em vez de deixar o usuario levar um erro seco do
 * servidor na tentativa seguinte.
 */
export const OTP_ATTEMPTS_PER_HOUR = 2;

/** Cooldown de UI entre reenvios. Impede rajada; nao substitui o limite do servidor. */
export const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

export interface ResendCooldownOptions {
  cooldownSeconds?: number;
}

export interface ResendCooldownState {
  isReady: boolean;
  remainingSeconds: number;
  attempts: number;
  hasReachedHourlyLimit: boolean;
  start: () => void;
  reset: () => void;
}

/**
 * Contagem regressiva de reenvio de codigo + contador de tentativas da sessao
 * de tela. Estado efemero de proposito: e protecao de UX, nao de seguranca — o
 * limite real e do Supabase e nao pode ser burlado pelo cliente de qualquer forma.
 */
export function useResendCooldown({
  cooldownSeconds = DEFAULT_RESEND_COOLDOWN_SECONDS,
}: ResendCooldownOptions = {}): ResendCooldownState {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    setAttempts((current) => current + 1);
    setRemainingSeconds(cooldownSeconds);
    clear();
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          clear();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [clear, cooldownSeconds]);

  const reset = useCallback(() => {
    clear();
    setRemainingSeconds(0);
    setAttempts(0);
  }, [clear]);

  return {
    isReady: remainingSeconds === 0,
    remainingSeconds,
    attempts,
    hasReachedHourlyLimit: attempts >= OTP_ATTEMPTS_PER_HOUR,
    start,
    reset,
  };
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run: `pnpm --filter @agenda/core test -- useResendCooldown.test.ts`
Expected: PASS — 8 testes.

- [ ] **Step 5: Exportar no index**

Em `packages/core/src/index.ts`, no bloco de hooks, após `export * from './hooks/useRecordView';`:

```ts
export * from './hooks/useResendCooldown';
```

- [ ] **Step 6: Rodar typecheck**

Run: `pnpm --filter @agenda/core typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/hooks/useResendCooldown.ts packages/core/src/hooks/useResendCooldown.test.ts packages/core/src/index.ts
git commit -m "Add useResendCooldown hook aligned with Supabase email rate limit"
```

---

### Task 3: Aplicar no login do `apps/web`

**Files:**
- Modify: `apps/web/app/login/page.tsx`

- [ ] **Step 1: Adicionar os imports**

No import de `@agenda/core` (que já traz `signInWithEmailOtp`, `verifyEmailOtp`, etc.), acrescente `useGuardedClick` e `useResendCooldown` mantendo a ordem alfabética exigida pelo `simple-import-sort`:

```tsx
import {
  type AuthProvider,
  detectPlatform,
  getFriendlyErrorMessage,
  identifyAnalyticsUser,
  type Platform,
  signInWithEmailOtp,
  signInWithOAuth,
  useAuthStore,
  useGuardedClick,
  useResendCooldown,
  verifyEmailOtp,
} from '@agenda/core';
```

- [ ] **Step 2: Instanciar o cooldown e envolver os handlers**

Dentro do componente, logo após os `useState` existentes:

```tsx
  const resend = useResendCooldown();
```

Em `handleEmail`, marque o envio bem-sucedido chamando `resend.start()` logo após `setEmailStep('sent')`:

```tsx
  const handleEmail = async () => {
    if (emailStep === 'hidden') {
      setEmailStep('editing');
      return;
    }
    if (!email.trim()) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setEmailStep('sent');
      resend.start();
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
```

Depois das três funções `handleProvider`, `handleEmail` e `handleVerifyOtp`, adicione as versões guardadas:

```tsx
  const guardedProvider = useGuardedClick(handleProvider);
  const guardedEmail = useGuardedClick(handleEmail);
  const guardedVerifyOtp = useGuardedClick(handleVerifyOtp);
```

- [ ] **Step 3: Trocar os `onClick` pelos guardados**

Nos quatro botões, substitua as chamadas diretas:

- Botão Google: `onClick={() => guardedProvider?.('google')}`
- Botão Apple: `onClick={() => guardedProvider?.('apple')}`
- Botão "Enviar código de acesso": `onClick={guardedEmail}`
- Botão "Entrar" (verify OTP): `onClick={guardedVerifyOtp}`
- Botão "Continuar com e-mail" (estado `hidden`): `onClick={guardedEmail}`

- [ ] **Step 4: Adicionar o botão de reenvio com contagem e o aviso de limite**

No bloco `emailStep === 'sent'`, entre o botão "Entrar" e o "Alterar e-mail", insira:

```tsx
              <button
                type="button"
                disabled={busy || !resend.isReady}
                onClick={guardedEmail}
                className={`${BTN_BASE} border-border text-foreground border bg-transparent`}
              >
                {resend.isReady
                  ? 'Reenviar código'
                  : `Reenviar em ${resend.remainingSeconds}s`}
              </button>
              {resend.hasReachedHourlyLimit ? (
                <p className="text-muted-foreground text-center text-[12px]">
                  Você já solicitou 2 códigos nesta hora. Aguarde antes de tentar novamente para
                  não ser bloqueado temporariamente.
                </p>
              ) : null}
```

- [ ] **Step 5: Resetar o cooldown ao trocar de e-mail**

No `onClick` do botão "Alterar e-mail", acrescente `resend.reset()`:

```tsx
                onClick={() => {
                  setEmailStep('editing');
                  setOtpToken('');
                  resend.reset();
                }}
```

- [ ] **Step 6: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web lint`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/login/page.tsx
git commit -m "Add click guard and OTP resend cooldown to web login"
```

---

### Task 4: Aplicar no login do `apps/admin`

**Files:**
- Modify: `apps/admin/app/login/page.tsx`

- [ ] **Step 1: Adicionar os imports**

```tsx
import {
  getFriendlyErrorMessage,
  identifyAnalyticsUser,
  signInWithEmailOtp,
  useAuthStore,
  useGuardedClick,
  useResendCooldown,
  verifyEmailOtp,
} from '@agenda/core';
```

- [ ] **Step 2: Instanciar o cooldown e guardar os handlers**

Após os `useState`:

```tsx
  const resend = useResendCooldown();
```

Em `handleSendCode`, após `setStep('sent')`, acrescente `resend.start();`.

Após as duas funções:

```tsx
  const guardedSendCode = useGuardedClick(handleSendCode);
  const guardedVerify = useGuardedClick(handleVerify);
```

- [ ] **Step 3: Trocar os `onClick`**

- "Enviar código de acesso": `onClick={guardedSendCode}`
- "Entrar": `onClick={guardedVerify}`

- [ ] **Step 4: Adicionar reenvio e aviso**

No bloco do `step === 'sent'`, entre "Entrar" e "Alterar e-mail":

```tsx
            <button
              type="button"
              disabled={busy || !resend.isReady}
              onClick={guardedSendCode}
              className={BTN_GHOST}
            >
              {resend.isReady ? 'Reenviar código' : `Reenviar em ${resend.remainingSeconds}s`}
            </button>
            {resend.hasReachedHourlyLimit ? (
              <p className="text-[12px] text-muted-foreground">
                Você já solicitou 2 códigos nesta hora. Aguarde antes de tentar novamente para não
                ser bloqueado temporariamente.
              </p>
            ) : null}
```

E no "Alterar e-mail", acrescente `resend.reset();` ao `onClick`.

- [ ] **Step 5: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/admin typecheck && pnpm --filter @agenda/admin lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/login/page.tsx
git commit -m "Add click guard and OTP resend cooldown to admin login"
```

---

### Task 5: Aplicar no login do `apps/web-client`

Este app tem um formulário com `onSubmit`, além de botões — o tratamento é ligeiramente diferente.

**Files:**
- Modify: `apps/web-client/app/login/page.tsx`

- [ ] **Step 1: Adicionar os imports**

Acrescente `useGuardedClick` e `useResendCooldown` ao import de `@agenda/core`, em ordem alfabética (entre `useAuthStore` e `verifyEmailOtp`).

- [ ] **Step 2: Instanciar o cooldown**

Após os `useState` existentes:

```tsx
  const resend = useResendCooldown();
```

Em `handleSignUpStart`, após `setSignUpStep('code')`, acrescente `resend.start();`.

- [ ] **Step 3: Guardar o "Esqueci minha senha" e o OAuth**

```tsx
  const guardedReset = useGuardedClick(handleReset);
  const guardedGoogle = useGuardedClick(() => void signInWithOAuth('google'));
```

Troque os `onClick` correspondentes por `guardedReset` e `guardedGoogle`.

O botão de submit do formulário não precisa de `useGuardedClick`: ele é `type="submit"` e o `canSubmit` já bloqueia por `busy`. Para cobrir o duplo-submit, envolva o `onSubmit` do `<form>`:

```tsx
  const guardedSubmit = useGuardedClick(handleSubmit);
```

E no formulário: `onSubmit={(event) => { event.preventDefault(); guardedSubmit?.(); }}` — ajuste conforme o nome real da função de submit no arquivo.

- [ ] **Step 4: Adicionar reenvio no passo de código**

No bloco `tab === 'signUp' && signUpStep === 'code'`, acima do "Usar outro e-mail":

```tsx
              <button
                type="button"
                disabled={busy || !resend.isReady}
                onClick={() => void handleSignUpStart()}
                className="mt-3 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              >
                {resend.isReady ? 'Reenviar código' : `Reenviar em ${resend.remainingSeconds}s`}
              </button>
              {resend.hasReachedHourlyLimit ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Você já solicitou 2 códigos nesta hora. Aguarde antes de tentar novamente para
                  não ser bloqueado temporariamente.
                </p>
              ) : null}
```

E no "Usar outro e-mail", acrescente `resend.reset();` ao `onClick`.

- [ ] **Step 5: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web-client typecheck && pnpm --filter @agenda/web-client lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/web-client/app/login/page.tsx
git commit -m "Add click guard and OTP resend cooldown to web-client login"
```

---

### Task 6: Guardar os botões de favoritar no web

**Files:**
- Modify: `apps/web/components/event/EventCard.tsx`
- Modify: `apps/web/app/(app)/establishment/[id]/page.tsx`

- [ ] **Step 1: Guardar o favoritar do EventCard**

Em `apps/web/components/event/EventCard.tsx`, adicione `useGuardedClick` ao import de `@agenda/core` e crie o handler guardado após a leitura da store:

```tsx
  const guardedToggleFavorite = useGuardedClick(() => {
    requireAuth(() => {
      toggleEvent(event.id);
      trackEvent('favorite_toggled', { isFavorite: !isFavorite });
    });
  });
```

E substitua o `onClick` do botão de favoritar:

```tsx
              onClick={(clickEvent) => {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                guardedToggleFavorite?.();
              }}
```

O `preventDefault`/`stopPropagation` continuam necessários: o card inteiro é um link, e sem eles o clique navega.

- [ ] **Step 2: Guardar o favoritar da página de estabelecimento**

Em `apps/web/app/(app)/establishment/[id]/page.tsx`, adicione `useGuardedClick` ao import e crie:

```tsx
  const guardedToggleFavorite = useGuardedClick(() =>
    requireAuth(() => toggleEstablishment(establishment.id)),
  );
```

Substitua `onClick={() => requireAuth(() => toggleEstablishment(establishment.id))}` por `onClick={guardedToggleFavorite}`.

Atenção: se `establishment` puder ser `undefined` nesse ponto do render, mantenha a checagem existente antes de usar `establishment.id` — não introduza acesso não-guardado.

- [ ] **Step 3: Verificar typecheck e lint**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/event/EventCard.tsx "apps/web/app/(app)/establishment/[id]/page.tsx"
git commit -m "Guard favorite toggle buttons against double click on web"
```

---

### Task 7: CHANGELOGs e verificação final

**Files:**
- Create/Modify: CHANGELOG da próxima versão de `apps/web`, `apps/admin`, `apps/web-client`, `packages/core`

- [ ] **Step 1: Descobrir as versões**

Run: `node -e "['apps/web','apps/admin','apps/web-client','packages/core'].forEach(p=>console.log(p, require('./'+p+'/package.json').version))"`
Expected: imprime a versão de cada projeto. Use patch +1 no nome do arquivo.

- [ ] **Step 2: Escrever os bullets (acrescentando, nunca sobrescrevendo)**

Para `apps/web`, `apps/admin` e `apps/web-client`:

```markdown
- Botão de reenviar código agora mostra quanto falta para poder pedir outro
- Aviso avisa quando você chega perto do limite de códigos por hora
- Cliques repetidos em botões de login e de favoritar não disparam mais ações duplicadas
```

Para `packages/core`:

```markdown
- Proteção contra clique duplicado agora disponível também para os painéis web
- Novo controle de contagem regressiva para reenvio de código de acesso
```

- [ ] **Step 3: Rodar a verificação completa**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: os três passam. Relate o resultado real.

- [ ] **Step 4: Commit**

```bash
git add apps/web/CHANGELOG-alfa-*.md apps/admin/CHANGELOG-alfa-*.md apps/web-client/CHANGELOG-alfa-*.md packages/core/CHANGELOG-alfa-*.md
git commit -m "Add changelog entries for client-side rate limiting"
```
