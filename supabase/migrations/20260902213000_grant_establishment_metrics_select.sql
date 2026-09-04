-- Correção de 20260902140000: essa migração presumiu que establishment_metrics
-- não tinha policy de leitura direta, mas 20260902130000 já criou
-- owner_select_establishment_metrics (SELECT do dono via owns_establishment()).
-- Sem GRANT, a role authenticated recebe 42501 antes de a RLS ser avaliada
-- (packages/core/src/services/metrics.ts lê a tabela direto para o dono).
GRANT SELECT ON public.establishment_metrics TO authenticated;
