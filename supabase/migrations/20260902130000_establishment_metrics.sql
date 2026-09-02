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
--
-- establishment_id/event_id são TEXT, não UUID: establishments.id e events.id
-- (20260611185705) são TEXT (slug), não uuid — a FK segue o tipo da coluna
-- referenciada.
CREATE TABLE public.establishment_metrics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  establishment_id TEXT NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  -- Nullable: view/clique do estabelecimento (não de um evento específico) não
  -- tem evento associado.
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('view', 'click_map', 'click_contact', 'click_share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX establishment_metrics_lookup_idx
  ON public.establishment_metrics (establishment_id, created_at DESC);

ALTER TABLE public.establishment_metrics ENABLE ROW LEVEL SECURITY;

-- Leitura só do dono do bar. owns_establishment() (20260812120000) é
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
  p_establishment_id TEXT,
  p_event_id TEXT DEFAULT NULL,
  p_kind TEXT DEFAULT 'view'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  -- p_kind IS NULL explícito: NULL NOT IN (...) avalia NULL (não TRUE), então um
  -- caller passando kind=NULL sem essa checagem cairia direto no NOT NULL da
  -- coluna em vez da mensagem amigável abaixo.
  IF p_kind IS NULL OR p_kind NOT IN ('view', 'click_map', 'click_contact', 'click_share') THEN
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

REVOKE EXECUTE ON FUNCTION public.record_metric_event(TEXT, TEXT, TEXT) FROM PUBLIC;
-- anon: apps consumidores registram view/clique mesmo sem sessão.
GRANT EXECUTE ON FUNCTION public.record_metric_event(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
