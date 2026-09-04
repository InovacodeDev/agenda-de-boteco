# Tela de Métricas do painel do dono — design

Data: 2026-09-02
Status: aprovado, aguardando plano de implementação

## Contexto

`/metricas` no `web-client` hoje é só `ComingSoon`. O menu descreve a feature como
"Visualizações e cliques dos seus eventos, somando app e site." Investigação prévia
confirmou que **não existe nenhum dado de base** para isso: nenhuma coluna de
contador em `events`/`establishments`, nenhuma tabela de analytics, nenhuma
instrumentação de tracking em `apps/mobile` ou `apps/web`. Construir a tela de
verdade exige, nesta ordem: schema novo → instrumentação nos apps consumidores →
agregação no core → UI no painel.

## Escopo

- Métricas de **eventos individuais** e do **estabelecimento agregado**, na mesma tela.
- "View" = abertura da tela de detalhe (evento ou estabelecimento), mobile ou web.
- "Clique" = ação de saída: mapa ("como chegar"), contato (WhatsApp/telefone),
  compartilhar. Três `kind`s de clique nesta rodada.
- "Favoritar" **não** vira evento de métrica novo — é lido direto de
  `user_favorites` (tabela já existente), evitando escrita duplicada e
  dessincronização quando o usuário desfavorita.
- Granularidade: tabela de eventos com timestamp (não um contador único), para
  permitir gráfico de evolução por período.
- Sem rate limiting server-side nesta rodada — debounce client-side apenas. O
  dado é analítico, não financeiro; rate limiting real de abuso é do Supabase
  (AGENTS.md §6).

## 1. Schema — nova migração

```sql
CREATE TABLE public.establishment_metrics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('view', 'click_map', 'click_contact', 'click_share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX establishment_metrics_lookup_idx
  ON public.establishment_metrics (establishment_id, created_at DESC);

ALTER TABLE public.establishment_metrics ENABLE ROW LEVEL SECURITY;
```

- `event_id` nullable: view/clique do estabelecimento (não de um evento específico)
  não tem evento associado.
- RLS habilitada, **zero policy de INSERT** — mesma doutrina de `musician_leads`
  (20260901120000): quem grava é anônimo ou logado como consumidor, nunca como
  dono; a única porta de escrita é a RPC abaixo.
- `owner_select_establishment_metrics`: `FOR SELECT USING (public.owns_establishment(establishment_id))`
  — mesmo padrão de leitura do dono usado em `owned-events`.
- Sem coluna de `user_id`, IP ou fingerprint: o dado é agregado para o dono ver
  desempenho, não auditoria por pessoa — menos PII em repouso, sem necessidade
  de justificar retenção individual.

### RPC de escrita

```sql
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
GRANT EXECUTE ON FUNCTION public.record_metric_event(UUID, UUID, TEXT) TO anon, authenticated, service_role;
```

## 2. Instrumentação — `@agenda/core` + apps consumidores

`packages/core/src/services/metrics.ts` (novo):

- `recordMetricEvent({ establishmentId, eventId？, kind }): Promise<void>` — chama
  a RPC. **Nunca lança**: falha de tracking não pode quebrar a navegação do
  usuário. `catch` interno chama `logErrorToTerminal` (não `handleServiceError`,
  que relança) e retorna silenciosamente.

`packages/core/src/hooks/useRecordView.ts` (novo):

- Hook que registra uma `view` uma vez por `(establishmentId, eventId)` a cada
  montagem, com debounce local (memória do módulo, chave
  `${establishmentId}:${eventId ?? ''}`, janela de 30 min) para não duplicar em
  re-render ou navegação de ida-e-volta rápida.

Pontos de chamada (só adicionam a chamada, sem mudar comportamento existente):

- `apps/mobile/app/event/[id].tsx`, `apps/mobile/app/establishment/[id].tsx` → `useRecordView`.
- `apps/web/app/(app)/event/[id]/page.tsx`, `apps/web/app/(app)/establishment/[id]/page.tsx` → `useRecordView`.
- Botões existentes de "como chegar", contato e compartilhar em ambos os apps →
  chamada direta a `recordMetricEvent` com o `kind` correspondente, disparada no
  handler de clique já existente.

## 3. Agregação — leitura do dono

`packages/core/src/services/metrics.ts` também expõe:

- `listOwnedMetrics(establishmentId, { sinceDays }): Promise<MetricEvent[]>` —
  busca linhas cruas da janela pedida via a policy do dono (sem RPC de leitura:
  volume por bar é pequeno o bastante — dezenas de eventos, no máximo alguns
  milhares de linhas/mês — para agregar em JS sem RPC de `GROUP BY` dedicada).
- `listOwnedFavoritesCount(establishmentId): Promise<Record<string, number>>` —
  `COUNT(*) GROUP BY event_id` sobre `user_favorites` (tabela existente,
  reaproveitada, zero escrita nova).

Agregação em memória no service: por dia (gráfico), por evento (tabela), por
`kind` (cards). `apps/web-client/hooks/use-owned-metrics.ts` (novo) expõe via
TanStack Query, key local (`panelKeys.metrics`, Regra dos 3 — único consumidor).

## 4. UI — `/metricas`

- Seletor de período (7/30/90 dias) com `Select` do `@agenda/shared-ui`.
- Cards agregados do estabelecimento: total de views, cliques por tipo
  (mapa/contato/compartilhar), favoritos — com sparkline de evolução (SVG
  próprio, sem lib nova).
- Tabela de eventos ordenada por views desc: nome, views, cliques, favoritos,
  coluna de ação com botão "ver detalhes".
- Ação abre um painel lateral direito (`Sidebar`/`Drawer` novo em
  `@agenda/shared-ui`, construído sobre `@radix-ui/react-dialog` — nova
  dependência autorizada) com o breakdown daquele evento: views/cliques por
  `kind`, sparkline isolado do evento.
- Mobile do drawer (bottom sheet) fica para quando a versão mobile do painel
  existir — fora de escopo aqui.

## Dependência nova

`@radix-ui/react-dialog` — mesma família já usada (`@radix-ui/react-select`,
`@radix-ui/react-popover`), acessível por padrão (foco, Esc, overlay), sem CVE
conhecido. Adicionar em `packages/shared-ui/package.json`.

## Fora de escopo nesta rodada

- Rate limiting server-side contra bot inflando views/cliques.
- Breakdown de cliques por origem (app vs. site) — a RPC não distingue a
  plataforma chamadora; adicionar `source` na tabela ficaria para uma fase 2 se
  o dono pedir essa granularidade.
- Bottom sheet mobile do painel de detalhe.
- Exportação/CSV dos dados de métricas.
