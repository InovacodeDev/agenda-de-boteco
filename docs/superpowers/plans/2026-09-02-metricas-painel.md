# Métricas do painel do dono — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder `ComingSoon` de `/metricas` no `web-client` por uma tela real de views/cliques/favoritos por evento e agregado do estabelecimento, com tracking instrumentado nos apps consumidores (mobile + web).

**Architecture:** Migração nova (`establishment_metrics` + RPC `record_metric_event`, sem policy de INSERT — mesma doutrina de `musician_leads`) → service `metrics.ts` no `@agenda/core` (escrita via RPC, nunca lança; leitura via policy do dono) → instrumentação nos apps consumidores (mobile + web) nos pontos de abertura de tela e cliques de saída já existentes → hook `use-owned-metrics.ts` no `web-client` → UI da tela com cards agregados, sparkline, tabela de eventos e drawer de detalhe (`Sidebar` novo em `@agenda/shared-ui` sobre `@radix-ui/react-dialog`).

**Tech Stack:** Postgres/Supabase (RLS + RPC `SECURITY DEFINER`), `@agenda/core` (services/hooks), TanStack Query v5, Next.js 15 (`web-client`), Expo Router (mobile), Radix UI (`react-dialog`, novo), Zod 3 (validação de linha crua, padrão `favorites.ts`), Jest/ts-jest.

Spec completa: [docs/superpowers/specs/2026-09-02-metricas-painel-design.md](../specs/2026-09-02-metricas-painel-design.md)

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260902130000_establishment_metrics.sql` | criar | tabela + RLS + RPC `record_metric_event` |
| `packages/core/src/services/metrics.ts` | criar | `recordMetricEvent`, `listOwnedMetrics`, `listOwnedFavoritesCount`, tipos |
| `packages/core/src/services/metrics.test.ts` | criar | testes do service |
| `packages/core/src/hooks/useRecordView.ts` | criar | hook de debounce de `view` |
| `packages/core/src/hooks/useRecordView.test.ts` | criar | testes do hook |
| `packages/core/src/index.ts` | modificar | exportar `metrics.ts` e `useRecordView` |
| `apps/mobile/app/event/[id].tsx` | modificar | `useRecordView` + `recordMetricEvent` em share/directions |
| `apps/mobile/app/establishment/[id].tsx` | modificar | `useRecordView` + `recordMetricEvent` em share/directions/whatsapp |
| `apps/web/app/(app)/event/[id]/page.tsx` | modificar | `useRecordView` + `recordMetricEvent` em directions |
| `apps/web/app/(app)/establishment/[id]/page.tsx` | modificar | `useRecordView` + `recordMetricEvent` em whatsapp/directions |
| `packages/shared-ui/package.json` | modificar | adicionar dependência `@radix-ui/react-dialog` |
| `packages/shared-ui/src/Sidebar.tsx` | criar | drawer lateral direito reutilizável |
| `packages/shared-ui/src/index.ts` | modificar | exportar `Sidebar` |
| `apps/web-client/hooks/use-owned-metrics.ts` | criar | hooks TanStack Query para a tela |
| `apps/web-client/components/MetricsSparkline.tsx` | criar | gráfico de evolução (SVG puro) |
| `apps/web-client/components/EventMetricsRow.tsx` | criar | linha da tabela de eventos |
| `apps/web-client/components/EventMetricsDrawer.tsx` | criar | conteúdo do drawer de detalhe do evento |
| `apps/web-client/app/(painel)/metricas/page.tsx` | modificar | tela final, substitui `ComingSoon` |
| `apps/web-client/CHANGELOG-alfa-v0.0.2.md` | modificar | bullet da feature |
| `apps/web/CHANGELOG-alfa-v0.0.3.md` | modificar (criar se não existir) | bullet de instrumentação |
| `apps/mobile/CHANGELOG-alfa-v0.1.2.md` | modificar (criar se não existir) | bullet de instrumentação |

---

## Task 1: Migração — tabela, RLS e RPC de escrita

**Files:**
- Create: `supabase/migrations/20260902130000_establishment_metrics.sql`

- [ ] **Step 1: Escrever a migração**

```sql
-- Tabela de eventos de analytics (views/cliques) do dono do bar (issue métricas).
--
-- POR QUE RPC E NÃO POLICY DE INSERT:
-- quem gera o evento é o visitante do app/site consumidor, que pode estar
-- deslogado. Uma `CREATE POLICY ... FOR INSERT WITH CHECK (true)` daria a
-- qualquer portador da anon key INSERT arbitrário na tabela. Mesma doutrina de
-- musician_leads (20260901120000) e account_deletion_queue (20260617120000):
-- RLS habilitada + ZERO policy de escrita = acesso direto negado por padrão, e
-- a única porta de escrita é a função SECURITY DEFINER abaixo.
--
-- Sem coluna de user_id/IP: o dado é agregado para o dono ver desempenho, não
-- auditoria por pessoa — menos PII em repouso, sem necessidade de retenção
-- individual.
CREATE TABLE public.establishment_metrics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  -- Nullable: view/clique do estabelecimento (não de um evento específico) não
  -- tem evento associado.
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('view', 'click_map', 'click_contact', 'click_share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX establishment_metrics_lookup_idx
  ON public.establishment_metrics (establishment_id, created_at DESC);

ALTER TABLE public.establishment_metrics ENABLE ROW LEVEL SECURITY;

-- Leitura só do dono do bar. owns_establishment() (20260812140000) é
-- SECURITY DEFINER, não recursa RLS.
CREATE POLICY owner_select_establishment_metrics ON public.establishment_metrics
  FOR SELECT USING (public.owns_establishment(establishment_id));

-- Registra um evento de métrica (view ou clique de saída). SECURITY DEFINER
-- porque o chamador pode ser anônimo; a função é a única porta de escrita e
-- valida establishment/event antes de inserir — o cliente é adulterável.
--
-- Sem rate limiting aqui (§ spec "fora de escopo"): o dado é analítico, não
-- financeiro; abuso de volume é responsabilidade do rate limiting do Supabase
-- (AGENTS.md §6).
CREATE OR REPLACE FUNCTION public.record_metric_event(
  p_establishment_id UUID,
  p_event_id UUID DEFAULT NULL,
  p_kind TEXT DEFAULT 'view'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF p_kind NOT IN ('view', 'click_map', 'click_contact', 'click_share') THEN
    RAISE EXCEPTION 'Tipo de métrica inválido' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE id = p_establishment_id) THEN
    RAISE EXCEPTION 'Estabelecimento inválido' USING ERRCODE = '23503';
  END IF;

  IF p_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.events WHERE id = p_event_id AND establishment_id = p_establishment_id
  ) THEN
    RAISE EXCEPTION 'Evento inválido' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.establishment_metrics (establishment_id, event_id, kind)
  VALUES (p_establishment_id, p_event_id, p_kind);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.record_metric_event(UUID, UUID, TEXT) FROM PUBLIC;
-- anon: apps consumidores registram view/clique mesmo sem sessão.
GRANT EXECUTE ON FUNCTION public.record_metric_event(UUID, UUID, TEXT) TO anon, authenticated, service_role;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260902130000_establishment_metrics.sql
git commit -m "Add establishment_metrics table and record_metric_event RPC"
```

---

## Task 2: Service `metrics.ts` no core — escrita

**Files:**
- Create: `packages/core/src/services/metrics.ts`
- Create: `packages/core/src/services/metrics.test.ts`

Segue o padrão de `favorites.ts` (`rawClient` + Zod, tabela ainda não presente em `database.types.ts`) e de `establishment-owner.ts` (`handleServiceError`/`logErrorToTerminal`).

- [ ] **Step 1: Escrever o teste de `recordMetricEvent`**

```typescript
// packages/core/src/services/metrics.test.ts
import { recordMetricEvent } from './metrics';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

const mockLogErrorToTerminal = jest.fn();
jest.mock('../utils/errors', () => {
  const actual = jest.requireActual('../utils/errors');
  return {
    ...actual,
    logErrorToTerminal: (...args: unknown[]) => mockLogErrorToTerminal(...args),
  };
});

beforeEach(() => {
  mockGetSupabase.mockReset();
  mockLogErrorToTerminal.mockReset();
});

describe('recordMetricEvent', () => {
  it('é no-op sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(
      recordMetricEvent({ establishmentId: 'es1', kind: 'view' }),
    ).resolves.toBeUndefined();
  });

  it('chama a RPC record_metric_event com os parâmetros certos', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({ rpc });

    await recordMetricEvent({ establishmentId: 'es1', eventId: 'ev1', kind: 'click_map' });

    expect(rpc).toHaveBeenCalledWith('record_metric_event', {
      p_establishment_id: 'es1',
      p_event_id: 'ev1',
      p_kind: 'click_map',
    });
  });

  it('omite p_event_id como null quando eventId não é passado', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({ rpc });

    await recordMetricEvent({ establishmentId: 'es1', kind: 'view' });

    expect(rpc).toHaveBeenCalledWith('record_metric_event', {
      p_establishment_id: 'es1',
      p_event_id: null,
      p_kind: 'view',
    });
  });

  it('nunca lança quando a RPC falha — apenas loga', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: new Error('boom') });
    mockGetSupabase.mockReturnValue({ rpc });

    await expect(
      recordMetricEvent({ establishmentId: 'es1', kind: 'view' }),
    ).resolves.toBeUndefined();
    expect(mockLogErrorToTerminal).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter @agenda/core test -- metrics.test.ts`
Expected: FAIL — `Cannot find module './metrics'`

- [ ] **Step 3: Implementar `recordMetricEvent`**

```typescript
// packages/core/src/services/metrics.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { getConfiguredSupabase } from '../supabase/client';
import { logErrorToTerminal } from '../utils/errors';

export const metricKindSchema = z.enum(['view', 'click_map', 'click_contact', 'click_share']);
export type MetricKind = z.infer<typeof metricKindSchema>;

export interface RecordMetricEventInput {
  establishmentId: string;
  eventId?: string;
  kind: MetricKind;
}

/**
 * Retorna o client sem parametrização de Database: a tabela é nova e ainda não
 * está em database.types.ts (arquivo gerado). Mesmo escape hatch de favorites.ts.
 */
function rawClient(client: ReturnType<typeof getConfiguredSupabase>): SupabaseClient {
  return client as SupabaseClient;
}

/**
 * Registra uma view ou clique de saída. Nunca lança: falha de tracking não
 * pode quebrar a navegação de quem está usando o app consumidor. Erros vão
 * para logErrorToTerminal (no-op em produção), não para handleServiceError
 * (que relançaria).
 */
export async function recordMetricEvent(input: RecordMetricEventInput): Promise<void> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return;
  }
  try {
    const { error } = await rawClient(client).rpc('record_metric_event', {
      p_establishment_id: input.establishmentId,
      p_event_id: input.eventId ?? null,
      p_kind: input.kind,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    logErrorToTerminal(error, { method: 'metrics.recordMetricEvent' });
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter @agenda/core test -- metrics.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/services/metrics.ts packages/core/src/services/metrics.test.ts
git commit -m "Add recordMetricEvent service"
```

---

## Task 3: Service `metrics.ts` no core — leitura (dono)

**Files:**
- Modify: `packages/core/src/services/metrics.ts`
- Modify: `packages/core/src/services/metrics.test.ts`

- [ ] **Step 1: Escrever os testes de `listOwnedMetrics` e `listOwnedFavoritesCount`**

```typescript
// adicionar em packages/core/src/services/metrics.test.ts, após o describe existente
import { listOwnedFavoritesCount, listOwnedMetrics } from './metrics';

describe('listOwnedMetrics', () => {
  it('retorna [] sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).resolves.toEqual([]);
  });

  it('busca linhas do período via gte(created_at) e valida com zod', async () => {
    const rows = [
      { establishment_id: 'es1', event_id: 'ev1', kind: 'view', created_at: '2026-08-01T00:00:00Z' },
      { establishment_id: 'es1', event_id: null, kind: 'click_map', created_at: '2026-08-02T00:00:00Z' },
    ];
    const gte = jest.fn().mockResolvedValue({ data: rows, error: null });
    const eq = jest.fn().mockReturnValue({ gte });
    const select = jest.fn().mockReturnValue({ eq });
    const client = { from: jest.fn().mockReturnValue({ select }) };
    mockGetSupabase.mockReturnValue(client);

    const result = await listOwnedMetrics('es1', { sinceDays: 30 });

    expect(client.from).toHaveBeenCalledWith('establishment_metrics');
    expect(eq).toHaveBeenCalledWith('establishment_id', 'es1');
    expect(result).toEqual([
      { establishmentId: 'es1', eventId: 'ev1', kind: 'view', createdAt: '2026-08-01T00:00:00Z' },
      { establishmentId: 'es1', eventId: null, kind: 'click_map', createdAt: '2026-08-02T00:00:00Z' },
    ]);
  });

  it('propaga erro do select', async () => {
    const error = new Error('select failed');
    const gte = jest.fn().mockResolvedValue({ data: null, error });
    const eq = jest.fn().mockReturnValue({ gte });
    const select = jest.fn().mockReturnValue({ eq });
    const client = { from: jest.fn().mockReturnValue({ select }) };
    mockGetSupabase.mockReturnValue(client);

    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).rejects.toBe(error);
  });
});

describe('listOwnedFavoritesCount', () => {
  it('retorna {} sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listOwnedFavoritesCount(['ev1', 'ev2'])).resolves.toEqual({});
  });

  it('retorna {} sem eventIds', async () => {
    mockGetSupabase.mockReturnValue({});
    await expect(listOwnedFavoritesCount([])).resolves.toEqual({});
  });

  it('conta favoritos por event_id a partir de user_favorites', async () => {
    const rows = [
      { target_id: 'ev1' },
      { target_id: 'ev1' },
      { target_id: 'ev2' },
    ];
    const inFn = jest.fn().mockResolvedValue({ data: rows, error: null });
    const eq = jest.fn().mockReturnValue({ in: inFn });
    const select = jest.fn().mockReturnValue({ eq });
    const client = { from: jest.fn().mockReturnValue({ select }) };
    mockGetSupabase.mockReturnValue(client);

    const result = await listOwnedFavoritesCount(['ev1', 'ev2']);

    expect(client.from).toHaveBeenCalledWith('user_favorites');
    expect(eq).toHaveBeenCalledWith('target_type', 'event');
    expect(inFn).toHaveBeenCalledWith('target_id', ['ev1', 'ev2']);
    expect(result).toEqual({ ev1: 2, ev2: 1 });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @agenda/core test -- metrics.test.ts`
Expected: FAIL — `listOwnedMetrics`/`listOwnedFavoritesCount` não exportados

- [ ] **Step 3: Implementar (adicionar ao final de `metrics.ts`)**

```typescript
// adicionar em packages/core/src/services/metrics.ts

const metricRowSchema = z.object({
  establishment_id: z.string(),
  event_id: z.string().nullable(),
  kind: metricKindSchema,
  created_at: z.string(),
});

export interface MetricEvent {
  establishmentId: string;
  eventId: string | null;
  kind: MetricKind;
  createdAt: string;
}

/**
 * Linhas cruas do período pedido, só do bar do dono (RLS owner_select_establishment_metrics).
 * Sem RPC de agregação: o volume por bar é pequeno o bastante (dezenas de
 * eventos, no máximo alguns milhares de linhas/mês) para agregar em memória no
 * hook consumidor, sem manter um GROUP BY em SQL.
 */
export async function listOwnedMetrics(
  establishmentId: string,
  { sinceDays }: { sinceDays: number },
): Promise<MetricEvent[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return [];
  }
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await rawClient(client)
    .from('establishment_metrics')
    .select('establishment_id, event_id, kind, created_at')
    .eq('establishment_id', establishmentId)
    .gte('created_at', since);
  if (error) {
    throw error;
  }
  const rows = z.array(metricRowSchema).parse(data ?? []);
  return rows.map((row) => ({
    establishmentId: row.establishment_id,
    eventId: row.event_id,
    kind: row.kind,
    createdAt: row.created_at,
  }));
}

/**
 * Contagem de favoritos por evento, lida direto de user_favorites — sem
 * duplicar escrita em establishment_metrics quando o usuário favorita (spec
 * "Favoritar como métrica"). [] de entrada evita `.in('target_id', [])`, que o
 * Postgrest trata como filtro vazio (retornaria tudo, não nada).
 */
export async function listOwnedFavoritesCount(
  eventIds: string[],
): Promise<Record<string, number>> {
  const client = getConfiguredSupabase();
  if (client === null || eventIds.length === 0) {
    return {};
  }
  const { data, error } = await rawClient(client)
    .from('user_favorites')
    .select('target_id')
    .eq('target_type', 'event')
    .in('target_id', eventIds);
  if (error) {
    throw error;
  }
  const rows = z.array(z.object({ target_id: z.string() })).parse(data ?? []);
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.target_id] = (acc[row.target_id] ?? 0) + 1;
    return acc;
  }, {});
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @agenda/core test -- metrics.test.ts`
Expected: PASS (9 testes no total)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/services/metrics.ts packages/core/src/services/metrics.test.ts
git commit -m "Add owned metrics and favorites-count read services"
```

---

## Task 4: Hook `useRecordView` (debounce de view)

**Files:**
- Create: `packages/core/src/hooks/useRecordView.ts`
- Create: `packages/core/src/hooks/useRecordView.test.ts`

- [ ] **Step 1: Escrever o teste**

```typescript
// packages/core/src/hooks/useRecordView.test.ts
import { renderHook } from '@testing-library/react';

import { useRecordView } from './useRecordView';

const mockRecordMetricEvent = jest.fn();
jest.mock('../services/metrics', () => ({
  recordMetricEvent: (...args: unknown[]) => mockRecordMetricEvent(...args),
}));

beforeEach(() => {
  mockRecordMetricEvent.mockReset();
});

describe('useRecordView', () => {
  it('registra uma view na montagem', () => {
    renderHook(() => useRecordView({ establishmentId: 'es1', eventId: 'ev1' }));
    expect(mockRecordMetricEvent).toHaveBeenCalledWith({
      establishmentId: 'es1',
      eventId: 'ev1',
      kind: 'view',
    });
  });

  it('não registra sem establishmentId', () => {
    renderHook(() => useRecordView({ establishmentId: undefined, eventId: 'ev1' }));
    expect(mockRecordMetricEvent).not.toHaveBeenCalled();
  });

  it('não duplica a view na mesma chave dentro da janela de debounce', () => {
    const { unmount } = renderHook(() => useRecordView({ establishmentId: 'es1', eventId: 'ev1' }));
    unmount();
    renderHook(() => useRecordView({ establishmentId: 'es1', eventId: 'ev1' }));
    expect(mockRecordMetricEvent).toHaveBeenCalledTimes(1);
  });

  it('registra de novo para uma chave diferente', () => {
    renderHook(() => useRecordView({ establishmentId: 'es1', eventId: 'ev1' }));
    renderHook(() => useRecordView({ establishmentId: 'es1', eventId: 'ev2' }));
    expect(mockRecordMetricEvent).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter @agenda/core test -- useRecordView.test.ts`
Expected: FAIL — `Cannot find module './useRecordView'`

- [ ] **Step 3: Implementar**

```typescript
// packages/core/src/hooks/useRecordView.ts
import { useEffect, useRef } from 'react';

import { recordMetricEvent } from '../services/metrics';

/**
 * Janela de debounce local: evita reenviar a mesma view ao navegar de ida e
 * volta rápido para a mesma tela. Estado de módulo (não React state) porque
 * precisa sobreviver a montagem/desmontagem do componente, não só a re-renders.
 */
const VIEW_DEBOUNCE_MS = 30 * 60 * 1000;
const lastViewedAt = new Map<string, number>();

export interface UseRecordViewInput {
  establishmentId: string | undefined;
  eventId?: string;
}

/** Registra uma `view` de evento ou estabelecimento uma vez por janela de debounce. */
export function useRecordView({ establishmentId, eventId }: UseRecordViewInput): void {
  // Ref para não disparar o efeito de novo só porque a função recordMetricEvent
  // é recriada — a dependência real é a identidade do que está sendo visto.
  const key = establishmentId ? `${establishmentId}:${eventId ?? ''}` : null;
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    const currentKey = keyRef.current;
    if (!currentKey || !establishmentId) {
      return;
    }
    const now = Date.now();
    const last = lastViewedAt.get(currentKey);
    if (last !== undefined && now - last < VIEW_DEBOUNCE_MS) {
      return;
    }
    lastViewedAt.set(currentKey, now);
    void recordMetricEvent({ establishmentId, eventId, kind: 'view' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter @agenda/core test -- useRecordView.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/hooks/useRecordView.ts packages/core/src/hooks/useRecordView.test.ts
git commit -m "Add useRecordView debounced view-tracking hook"
```

---

## Task 5: Exportar do `@agenda/core`

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Adicionar os exports**

Em `packages/core/src/index.ts`, adicionar após `export * from './services/cachePolicy';` (linha com esse conteúdo):

```typescript
export * from './services/metrics';
```

E após `export * from './hooks/useNearbyEstablishments';`:

```typescript
export * from './hooks/useRecordView';
```

- [ ] **Step 2: Verificar typecheck do core**

Run: `pnpm --filter @agenda/core typecheck`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "Export metrics service and useRecordView from core"
```

---

## Task 6: Instrumentação — mobile, tela de evento

**Files:**
- Modify: `apps/mobile/app/event/[id].tsx`

- [ ] **Step 1: Importar `useRecordView` e `recordMetricEvent`**

No bloco de imports (`apps/mobile/app/event/[id].tsx:17`), trocar:

```typescript
import { useEstablishmentQuery, useEventAttractionsQuery, useEventQuery, useMusicStylesQuery } from '@/hooks/queries';
```

por:

```typescript
import { useEstablishmentQuery, useEventAttractionsQuery, useEventQuery, useMusicStylesQuery } from '@/hooks/queries';
import { recordMetricEvent, useRecordView } from '@agenda/core';
```

- [ ] **Step 2: Chamar `useRecordView` após os hooks de query existentes**

Logo após a linha `const { data: attractions } = useEventAttractionsQuery(event?.id ?? '');` (linha 43), adicionar:

```typescript
  useRecordView({ establishmentId: event?.establishment_id, eventId: event?.id });
```

- [ ] **Step 3: Instrumentar o clique de compartilhar**

Na função `share` (linhas 111-116), adicionar a chamada de métrica:

```typescript
  const share = () => {
    const url = buildEventShareUrl({ slugOrId: event.id }, process.env.EXPO_PUBLIC_SHARE_BASE_URL);
    const text = `${event.name} — ${event.attraction} no ${establishment.name}. Bora?`;
    // No Android o campo `url` é ignorado, por isso a URL vai também no message.
    Share.share({ message: `${text}\n${url}`, url });
    void recordMetricEvent({
      establishmentId: establishment.id,
      eventId: event.id,
      kind: 'click_share',
    });
  };
```

- [ ] **Step 4: Instrumentar o clique de "Como chegar"**

No botão "Como chegar" (linhas 265-274), trocar o `onPress`:

```typescript
        <Button
          label="Como chegar"
          variant="outline"
          className="border-foreground/50 flex-1 border-[0.5px]"
          style={{ backgroundColor: colors.background }}
          icon={<Icon name="location-arrow" color={colors.foreground} size={16} />}
          onPress={() => {
            Linking.openURL(buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng }));
            void recordMetricEvent({
              establishmentId: establishment.id,
              eventId: event.id,
              kind: 'click_map',
            });
          }}
        />
```

- [ ] **Step 5: Rodar typecheck do mobile**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: sem erros

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/event/[id].tsx
git commit -m "Instrument view and click tracking on mobile event detail"
```

---

## Task 7: Instrumentação — mobile, tela de estabelecimento

**Files:**
- Modify: `apps/mobile/app/establishment/[id].tsx`

- [ ] **Step 1: Ler o arquivo para confirmar estrutura atual**

Antes de editar, ler `apps/mobile/app/establishment/[id].tsx` por completo — ele tem uma função `share` (linha 108-116, mesmo padrão de `event/[id].tsx`), um `onPress` de WhatsApp (linha 343) e um `onPress` de directions (linha 351). Confirmar os nomes exatos de `establishment.id`/`establishment.lat`/`establishment.lng` antes de editar (mesma variável `establishment` do escopo do componente).

- [ ] **Step 2: Importar `useRecordView` e `recordMetricEvent`**

Adicionar ao bloco de imports de `@agenda/core` (ou criar um import próprio se `@agenda/core` não estiver importado neste arquivo):

```typescript
import { recordMetricEvent, useRecordView } from '@agenda/core';
```

- [ ] **Step 3: Chamar `useRecordView` após os hooks de query do componente**

Adicionar logo após a resolução de `establishment` (mesmo ponto em que `event/[id].tsx` chama, após os hooks de dados):

```typescript
  useRecordView({ establishmentId: establishment?.id });
```

- [ ] **Step 4: Instrumentar compartilhar, WhatsApp e directions**

Na função `share` (linha ~108-116), adicionar após `Share.share(...)`:

```typescript
    void recordMetricEvent({ establishmentId: establishment.id, kind: 'click_share' });
```

No `onPress` do botão de WhatsApp (linha 343):

```typescript
          onPress={() => {
            Linking.openURL(buildWhatsAppUrl(establishment.whatsapp));
            void recordMetricEvent({ establishmentId: establishment.id, kind: 'click_contact' });
          }}
```

No `onPress` do botão de directions (linha 351):

```typescript
          onPress={() => {
            Linking.openURL(buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng }));
            void recordMetricEvent({ establishmentId: establishment.id, kind: 'click_map' });
          }}
```

- [ ] **Step 5: Rodar typecheck do mobile**

Run: `pnpm --filter @agenda/mobile typecheck`
Expected: sem erros

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/establishment/[id].tsx
git commit -m "Instrument view and click tracking on mobile establishment detail"
```

---

## Task 8: Instrumentação — web consumidor, evento e estabelecimento

**Files:**
- Modify: `apps/web/app/(app)/event/[id]/page.tsx`
- Modify: `apps/web/app/(app)/establishment/[id]/page.tsx`

- [ ] **Step 1: Evento — importar e chamar `useRecordView`**

No bloco de import de `@agenda/core` em `apps/web/app/(app)/event/[id]/page.tsx` (linhas 4-16), adicionar `recordMetricEvent` e `useRecordView` à lista de nomes importados (ordem alfabética, respeitando `simple-import-sort`):

```typescript
import {
  buildDirectionsUrl,
  buildInstagramProfileUrl,
  formatInstagramHandle,
  formatPrice,
  formatRelativeDay,
  formatTimeRange,
  indexById,
  musicStylesForEvent,
  recordMetricEvent,
  useEstablishmentQuery,
  useEventAttractionsQuery,
  useEventQuery,
  useFavoritesStore,
  useMusicStylesQuery,
  useRecordView,
} from '@agenda/core';
```

Após a linha `const { data: attractions } = useEventAttractionsQuery(event?.id ?? '');` (linha 100), adicionar:

```typescript
  useRecordView({ establishmentId: event?.establishment_id, eventId: event?.id });
```

- [ ] **Step 2: Evento — instrumentar o clique de "Como chegar"**

No botão de directions (linhas 263-272), trocar por:

```typescript
        <a
          href={buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng })}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            void recordMetricEvent({
              establishmentId: establishment.id,
              eventId: event.id,
              kind: 'click_map',
            })
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-[0.5px] border-foreground/50 bg-background px-4 py-3 text-[14px] font-[family-name:var(--font-body)] font-medium text-foreground transition-opacity hover:opacity-80"
        >
          <NavIcon size={16} />
          Como chegar
        </a>
```

- [ ] **Step 3: Estabelecimento — importar e chamar `useRecordView`**

No bloco de import de `@agenda/core` em `apps/web/app/(app)/establishment/[id]/page.tsx` (linhas 3-17), adicionar `recordMetricEvent` e `useRecordView`:

```typescript
import {
  buildDirectionsUrl,
  buildInstagramProfileUrl,
  buildWhatsAppUrl,
  FEATURES,
  formatInstagramHandle,
  getAttributeMeta,
  indexById,
  musicStylesForEvent,
  recordMetricEvent,
  upcomingEventsForEstablishment,
  useEstablishmentQuery,
  useEventsByEstablishmentQuery,
  useFavoritesStore,
  useMusicStylesQuery,
  useRecordView,
} from '@agenda/core';
```

Logo após a linha que resolve `establishment` a partir de `useEstablishmentQuery` (início do componente, mesmo ponto em que os demais hooks de dados são chamados), adicionar:

```typescript
  useRecordView({ establishmentId: establishment?.id });
```

- [ ] **Step 4: Estabelecimento — instrumentar WhatsApp e directions**

No link de WhatsApp (linhas 324-331):

```typescript
          <a
            href={buildWhatsAppUrl(establishment.whatsapp)}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              void recordMetricEvent({ establishmentId: establishment.id, kind: 'click_contact' })
            }
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-[15px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            WhatsApp
          </a>
```

No link de directions (linhas 332-340):

```typescript
          <a
            href={buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng })}
            target="_blank"
            rel="noreferrer"
            aria-label="Como chegar"
            onClick={() =>
              void recordMetricEvent({ establishmentId: establishment.id, kind: 'click_map' })
            }
            className="flex h-11 items-center justify-center rounded-full border-[0.5px] border-foreground/50 bg-background px-4 text-[15px] font-[family-name:var(--font-body)] font-semibold text-foreground transition-opacity hover:opacity-90"
          >
            <MapPinIcon size={16} />
          </a>
```

- [ ] **Step 5: Rodar typecheck e lint do web**

Run: `pnpm --filter @agenda/web typecheck && pnpm --filter @agenda/web lint`
Expected: sem erros

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(app)/event/[id]/page.tsx" "apps/web/app/(app)/establishment/[id]/page.tsx"
git commit -m "Instrument view and click tracking on web consumer detail pages"
```

---

## Task 9: `Sidebar` (drawer) em `@agenda/shared-ui`

**Files:**
- Modify: `packages/shared-ui/package.json`
- Create: `packages/shared-ui/src/Sidebar.tsx`
- Modify: `packages/shared-ui/src/index.ts`

- [ ] **Step 1: Adicionar a dependência**

Em `packages/shared-ui/package.json`, no bloco `"dependencies"`, adicionar (ordem alfabética):

```json
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-popover": "^1.1.23",
    "react-day-picker": "^10.0.1"
  },
```

Rodar a instalação:

```bash
pnpm install
```

- [ ] **Step 2: Implementar o componente `Sidebar`**

```typescript
// packages/shared-ui/src/Sidebar.tsx
'use client';

import { XIcon } from '@phosphor-icons/react';
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export function Sidebar({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <RadixDialog.Title className="font-heading text-foreground text-lg font-bold">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Fechar"
              className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
            >
              <XIcon size={20} weight="bold" />
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
```

- [ ] **Step 3: Exportar do index**

Em `packages/shared-ui/src/index.ts`, adicionar em ordem alfabética:

```typescript
export * from './Select';
export * from './Sidebar';
export * from './styles';
```

- [ ] **Step 4: Verificar typecheck do shared-ui**

Run: `pnpm --filter @agenda/shared-ui typecheck`
Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add packages/shared-ui/package.json packages/shared-ui/src/Sidebar.tsx packages/shared-ui/src/index.ts pnpm-lock.yaml
git commit -m "Add Sidebar drawer component to shared-ui"
```

---

## Task 10: Hooks de leitura no `web-client`

**Files:**
- Create: `apps/web-client/hooks/use-owned-metrics.ts`

Segue o padrão de `use-owned-events.ts` + `panelKeys` de `use-owned-establishment.ts` (Regra dos 3 — único consumidor por ora).

- [ ] **Step 1: Implementar**

```typescript
// apps/web-client/hooks/use-owned-metrics.ts
'use client';

import {
  listOwnedFavoritesCount,
  listOwnedMetrics,
  type MetricEvent,
  type MetricKind,
} from '@agenda/core';
import { useQuery } from '@tanstack/react-query';

import { useOwnedEstablishmentId } from './use-owned-establishment';
import { useOwnedEvents } from './use-owned-events';

export const metricsKeys = {
  owned: (establishmentId: string, sinceDays: number) =>
    ['panel', 'metrics', 'owned', establishmentId, sinceDays] as const,
  favoritesCount: (eventIds: string[]) =>
    ['panel', 'metrics', 'favorites-count', ...eventIds] as const,
};

/** Linhas cruas de métrica do bar do dono, no período pedido. */
export function useOwnedMetrics(sinceDays: number) {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: metricsKeys.owned(establishmentId ?? '', sinceDays),
    queryFn: () => listOwnedMetrics(establishmentId ?? '', { sinceDays }),
    enabled: Boolean(establishmentId),
  });
}

/** Contagem de favoritos por evento do bar do dono. */
export function useOwnedFavoritesCount() {
  const { data: events } = useOwnedEvents();
  const eventIds = (events ?? []).map((event) => event.id);

  return useQuery({
    queryKey: metricsKeys.favoritesCount(eventIds),
    queryFn: () => listOwnedFavoritesCount(eventIds),
    enabled: eventIds.length > 0,
  });
}

export interface EventMetricsSummary {
  eventId: string;
  views: number;
  clicksByKind: Record<MetricKind, number>;
  favorites: number;
}

export interface DayBucket {
  date: string;
  views: number;
  clicks: number;
}

/** Agrega linhas cruas em: totais por evento, série diária, totais do bar. */
export function aggregateMetrics(
  rows: MetricEvent[],
  favoritesByEvent: Record<string, number>,
): {
  byEvent: EventMetricsSummary[];
  byDay: DayBucket[];
  totals: { views: number; clicksByKind: Record<MetricKind, number>; favorites: number };
} {
  const byEventMap = new Map<string, EventMetricsSummary>();
  const byDayMap = new Map<string, DayBucket>();
  const totals = {
    views: 0,
    clicksByKind: { view: 0, click_map: 0, click_contact: 0, click_share: 0 } as Record<
      MetricKind,
      number
    >,
    favorites: 0,
  };

  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    const dayBucket = byDayMap.get(day) ?? { date: day, views: 0, clicks: 0 };
    if (row.kind === 'view') {
      dayBucket.views += 1;
      totals.views += 1;
    } else {
      dayBucket.clicks += 1;
    }
    totals.clicksByKind[row.kind] += 1;
    byDayMap.set(day, dayBucket);

    if (row.eventId) {
      const eventSummary = byEventMap.get(row.eventId) ?? {
        eventId: row.eventId,
        views: 0,
        clicksByKind: { view: 0, click_map: 0, click_contact: 0, click_share: 0 },
        favorites: favoritesByEvent[row.eventId] ?? 0,
      };
      if (row.kind === 'view') {
        eventSummary.views += 1;
      }
      eventSummary.clicksByKind[row.kind] += 1;
      byEventMap.set(row.eventId, eventSummary);
    }
  }

  totals.favorites = Object.values(favoritesByEvent).reduce((sum, count) => sum + count, 0);

  return {
    byEvent: Array.from(byEventMap.values()).sort((a, b) => b.views - a.views),
    byDay: Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    totals,
  };
}
```

- [ ] **Step 2: Verificar typecheck do web-client**

Run: `pnpm --filter @agenda/web-client typecheck`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add apps/web-client/hooks/use-owned-metrics.ts
git commit -m "Add owned metrics hooks and aggregation for panel"
```

---

## Task 11: Componente `MetricsSparkline`

**Files:**
- Create: `apps/web-client/components/MetricsSparkline.tsx`

- [ ] **Step 1: Implementar**

```typescript
// apps/web-client/components/MetricsSparkline.tsx
'use client';

import type { DayBucket } from '@/hooks/use-owned-metrics';

/** Sparkline de views por dia. SVG puro — sem lib de gráfico nova (ver spec). */
export function MetricsSparkline({ data }: { data: DayBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-20 items-center justify-center text-[13px]">
        Sem dados no período.
      </div>
    );
  }

  const width = 320;
  const height = 80;
  const max = Math.max(1, ...data.map((day) => day.views));
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((day, index) => {
    const x = data.length > 1 ? index * stepX : width / 2;
    const y = height - (day.views / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full"
      role="img"
      aria-label={`Evolução de visualizações: ${data.map((day) => `${day.date} ${day.views}`).join(', ')}`}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm --filter @agenda/web-client typecheck`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add apps/web-client/components/MetricsSparkline.tsx
git commit -m "Add MetricsSparkline chart component"
```

---

## Task 12: Componentes `EventMetricsRow` e `EventMetricsDrawer`

**Files:**
- Create: `apps/web-client/components/EventMetricsRow.tsx`
- Create: `apps/web-client/components/EventMetricsDrawer.tsx`

- [ ] **Step 1: Implementar `EventMetricsRow`**

```typescript
// apps/web-client/components/EventMetricsRow.tsx
'use client';

import type { Event } from '@agenda/core';
import { EyeIcon, HeartIcon, MagnifyingGlassIcon, MapPinIcon, ShareNetworkIcon } from '@phosphor-icons/react';

import type { EventMetricsSummary } from '@/hooks/use-owned-metrics';

export function EventMetricsRow({
  event,
  summary,
  onViewDetails,
}: {
  event: Event;
  summary: EventMetricsSummary;
  onViewDetails: () => void;
}) {
  const clicks =
    summary.clicksByKind.click_map + summary.clicksByKind.click_contact + summary.clicksByKind.click_share;

  return (
    <tr className="border-border border-b last:border-0">
      <td className="text-foreground py-3 pr-4 text-sm font-medium">{event.name}</td>
      <td className="text-muted-foreground py-3 pr-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <EyeIcon size={14} weight="regular" aria-hidden />
          {summary.views}
        </span>
      </td>
      <td className="text-muted-foreground py-3 pr-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <MapPinIcon size={14} weight="regular" aria-hidden />
          {clicks}
        </span>
      </td>
      <td className="text-muted-foreground py-3 pr-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <HeartIcon size={14} weight="regular" aria-hidden />
          {summary.favorites}
        </span>
      </td>
      <td className="py-3">
        <button
          type="button"
          onClick={onViewDetails}
          title="Ver detalhes"
          aria-label={`Ver detalhes de métricas de ${event.name}`}
          className="bg-surface-elevated text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
        >
          <MagnifyingGlassIcon size={16} weight="regular" aria-hidden />
        </button>
      </td>
    </tr>
  );
}

// Reexport local para não obrigar o consumidor a importar de dois lugares.
export { ShareNetworkIcon };
```

- [ ] **Step 2: Implementar `EventMetricsDrawer`**

```typescript
// apps/web-client/components/EventMetricsDrawer.tsx
'use client';

import type { Event } from '@agenda/core';
import { Sidebar } from '@agenda/shared-ui';
import { EyeIcon, HeartIcon, MapPinIcon, PhoneIcon, ShareNetworkIcon } from '@phosphor-icons/react';

import { MetricsSparkline } from '@/components/MetricsSparkline';
import type { DayBucket, EventMetricsSummary } from '@/hooks/use-owned-metrics';

const CLICK_ROWS: { key: 'click_map' | 'click_contact' | 'click_share'; label: string; icon: typeof MapPinIcon }[] = [
  { key: 'click_map', label: 'Como chegar', icon: MapPinIcon },
  { key: 'click_contact', label: 'WhatsApp/telefone', icon: PhoneIcon },
  { key: 'click_share', label: 'Compartilhar', icon: ShareNetworkIcon },
];

export function EventMetricsDrawer({
  event,
  summary,
  byDay,
  open,
  onOpenChange,
}: {
  event: Event | null;
  summary: EventMetricsSummary | null;
  byDay: DayBucket[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sidebar open={open} onOpenChange={onOpenChange} title={event?.name ?? 'Detalhes do evento'}>
      {event && summary ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <EyeIcon size={16} weight="regular" className="text-muted-foreground" aria-hidden />
            <span className="text-foreground text-sm font-medium">{summary.views} visualizações</span>
          </div>

          <div className="flex flex-col gap-3">
            {CLICK_ROWS.map(({ key, label, icon: RowIcon }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                  <RowIcon size={14} weight="regular" aria-hidden />
                  {label}
                </span>
                <span className="text-foreground text-sm font-medium">{summary.clicksByKind[key]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                <HeartIcon size={14} weight="regular" aria-hidden />
                Favoritos
              </span>
              <span className="text-foreground text-sm font-medium">{summary.favorites}</span>
            </div>
          </div>

          <div>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium uppercase">Evolução</h3>
            <MetricsSparkline data={byDay} />
          </div>
        </div>
      ) : null}
    </Sidebar>
  );
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm --filter @agenda/web-client typecheck`
Expected: sem erros. Se `PhoneIcon` não existir em `@phosphor-icons/react`, substituir por `WhatsappLogoIcon` (confirmar no pacote instalado antes de trocar).

- [ ] **Step 4: Commit**

```bash
git add apps/web-client/components/EventMetricsRow.tsx apps/web-client/components/EventMetricsDrawer.tsx
git commit -m "Add EventMetricsRow and EventMetricsDrawer components"
```

---

## Task 13: Tela `/metricas` final

**Files:**
- Modify: `apps/web-client/app/(painel)/metricas/page.tsx`

- [ ] **Step 1: Implementar a página**

```typescript
// apps/web-client/app/(painel)/metricas/page.tsx
'use client';

import { EyeIcon, HeartIcon, MapPinIcon } from '@phosphor-icons/react';
import { Select } from '@agenda/shared-ui';
import type { Event } from '@agenda/core';
import { useMemo, useState } from 'react';

import { EventMetricsDrawer } from '@/components/EventMetricsDrawer';
import { EventMetricsRow } from '@/components/EventMetricsRow';
import { MetricsSparkline } from '@/components/MetricsSparkline';
import { useOwnedEvents } from '@/hooks/use-owned-events';
import { aggregateMetrics, useOwnedFavoritesCount, useOwnedMetrics } from '@/hooks/use-owned-metrics';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export default function MetricasPage() {
  const [sinceDays, setSinceDays] = useState('30');
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);

  const { data: events } = useOwnedEvents();
  const { data: rows, isPending } = useOwnedMetrics(Number(sinceDays));
  const { data: favoritesByEvent } = useOwnedFavoritesCount();

  const { byEvent, byDay, totals } = useMemo(
    () => aggregateMetrics(rows ?? [], favoritesByEvent ?? {}),
    [rows, favoritesByEvent],
  );

  const eventsById = useMemo(
    () => new Map((events ?? []).map((event) => [event.id, event])),
    [events],
  );

  const activeSummary = activeEvent
    ? (byEvent.find((summary) => summary.eventId === activeEvent.id) ?? null)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold">Métricas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Visualizações e cliques dos seus eventos, somando app e site.
          </p>
        </div>
        <Select value={sinceDays} onValueChange={setSinceDays} className="w-48">
          {PERIOD_OPTIONS.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      </header>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="shadow-card border-border bg-card rounded-2xl border p-5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase">
                <EyeIcon size={14} weight="regular" aria-hidden />
                Visualizações
              </span>
              <p className="text-foreground mt-2 text-2xl font-bold">{totals.views}</p>
            </div>
            <div className="shadow-card border-border bg-card rounded-2xl border p-5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase">
                <MapPinIcon size={14} weight="regular" aria-hidden />
                Cliques
              </span>
              <p className="text-foreground mt-2 text-2xl font-bold">
                {totals.clicksByKind.click_map + totals.clicksByKind.click_contact + totals.clicksByKind.click_share}
              </p>
            </div>
            <div className="shadow-card border-border bg-card rounded-2xl border p-5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase">
                <HeartIcon size={14} weight="regular" aria-hidden />
                Favoritos
              </span>
              <p className="text-foreground mt-2 text-2xl font-bold">{totals.favorites}</p>
            </div>
            <div className="shadow-card border-border bg-card rounded-2xl border p-5 sm:col-span-2 lg:col-span-1">
              <span className="text-muted-foreground text-xs font-medium uppercase">Evolução</span>
              <div className="mt-2">
                <MetricsSparkline data={byDay} />
              </div>
            </div>
          </section>

          <section className="shadow-card border-border bg-card overflow-hidden rounded-2xl border">
            {byEvent.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Nenhum dado de métrica no período selecionado.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-left text-xs font-medium uppercase">
                    <th className="px-5 py-3">Evento</th>
                    <th className="px-0 py-3">Views</th>
                    <th className="px-0 py-3">Cliques</th>
                    <th className="px-0 py-3">Favoritos</th>
                    <th className="px-0 py-3" />
                  </tr>
                </thead>
                <tbody className="px-5">
                  {byEvent.map((summary) => {
                    const event = eventsById.get(summary.eventId);
                    if (!event) return null;
                    return (
                      <EventMetricsRow
                        key={summary.eventId}
                        event={event}
                        summary={summary}
                        onViewDetails={() => setActiveEvent(event)}
                      />
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <EventMetricsDrawer
        event={activeEvent}
        summary={activeSummary}
        byDay={byDay}
        open={activeEvent !== null}
        onOpenChange={(open) => {
          if (!open) setActiveEvent(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rodar typecheck e lint**

Run: `pnpm --filter @agenda/web-client typecheck && pnpm --filter @agenda/web-client lint`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add "apps/web-client/app/(painel)/metricas/page.tsx"
git commit -m "Implement metrics screen for owner panel"
```

---

## Task 14: Verificação visual no browser

**Files:** nenhum (só verificação)

- [ ] **Step 1: Subir o dev server do web-client**

Usar a ferramenta de preview do browser (não Bash) para iniciar `apps/web-client` na porta `8090` e navegar até `/client/metricas`.

- [ ] **Step 2: Confirmar estado vazio**

Sem dados de métrica ainda gravados (migração acabou de rodar), a tela deve mostrar os cards zerados e "Nenhum dado de métrica no período selecionado." na tabela — sem erros no console.

- [ ] **Step 3: Testar o seletor de período**

Trocar entre 7/30/90 dias no `Select` e confirmar que não há erro de console nem quebra de layout.

- [ ] **Step 4: Testar o drawer**

Se houver ao menos um evento com dado de métrica (inserir uma linha manualmente via SQL local se necessário, só para o teste visual), clicar em "ver detalhes" e confirmar que o drawer abre da direita, mostra o breakdown e fecha com Esc ou no X.

- [ ] **Step 5: Reportar o resultado**

Descrever no chat o que foi verificado (prints via screenshot da ferramenta de browser), incluindo qualquer ajuste visual feito.

---

## Task 15: Rodar suíte completa e CHANGELOGs

**Files:**
- Modify: `apps/web-client/CHANGELOG-alfa-v0.0.2.md`
- Modify (criar se ausente): `apps/web/CHANGELOG-alfa-v0.0.3.md`
- Modify (criar se ausente): `apps/mobile/CHANGELOG-alfa-v0.1.2.md`

- [ ] **Step 1: Rodar a suíte completa do monorepo**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS em todos os pacotes. Relatar o resultado real — não declarar concluído sem essa saída.

- [ ] **Step 2: Verificar/criar o CHANGELOG do web-client**

Ler `apps/web-client/package.json` para confirmar a versão atual (`0.0.1` no momento deste plano). Se `apps/web-client/CHANGELOG-alfa-v0.0.2.md` já existir, acrescentar (nunca sobrescrever) o bullet abaixo à lista existente. Se não existir, criar com o heading:

```markdown
# Changelog 0.0.2 (alfa)

- Painel do dono ganha a tela de Métricas: visualizações, cliques e favoritos por evento e do bar, com filtro de período
```

- [ ] **Step 3: Verificar/criar o CHANGELOG do web**

Ler `apps/web/package.json` para a versão atual e criar/acrescentar em `apps/web/CHANGELOG-alfa-v<próxima-versão>.md`:

```markdown
- Melhoria interna de instrumentação para o painel do dono (sem mudança visível)
```

- [ ] **Step 4: Verificar/criar o CHANGELOG do mobile**

Ler `apps/mobile/package.json` para a versão atual e criar/acrescentar em `apps/mobile/CHANGELOG-alfa-v<próxima-versão>.md`:

```markdown
- Melhoria interna de instrumentação para o painel do dono (sem mudança visível)
```

- [ ] **Step 5: Commit**

```bash
git add apps/web-client/CHANGELOG-alfa-v0.0.2.md apps/web/CHANGELOG-alfa-v*.md apps/mobile/CHANGELOG-alfa-v*.md
git commit -m "Update changelogs for metrics feature"
```

---

## Spec Coverage Check

- Schema + RLS + RPC de escrita → Task 1.
- Service de escrita (nunca lança) → Task 2.
- Service de leitura (dono) + favoritos reaproveitados → Task 3.
- Debounce de view → Task 4.
- Export do core → Task 5.
- Instrumentação mobile (evento + estabelecimento, view/map/contact/share) → Tasks 6-7.
- Instrumentação web (evento + estabelecimento) → Task 8.
- `Sidebar`/drawer novo + dependência `@radix-ui/react-dialog` → Task 9.
- Hooks de leitura + agregação no painel → Task 10.
- Sparkline SVG sem lib nova → Task 11.
- Tabela de eventos + drawer de detalhe → Task 12.
- Tela final com seletor de período → Task 13.
- Verificação visual → Task 14.
- Checks de projeto + CHANGELOGs → Task 15.

Bottom sheet mobile do painel, breakdown por origem (app/site) e rate limiting server-side ficam fora de escopo, conforme a spec.
