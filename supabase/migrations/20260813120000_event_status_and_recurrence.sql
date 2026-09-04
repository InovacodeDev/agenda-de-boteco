-- Painel do estabelecimento (Fase 3): agenda de eventos.
-- Três coisas nascem aqui: rascunho vs publicado (com o filtro no banco, não na
-- query), recorrência por instâncias reais, e o schema de moderação de conteúdo
-- — este último desligado no app, mas já pronto para quando ligar.

-- 1) Rascunho vs publicado.
--
-- O default é 'published' de propósito: todo evento que já existe hoje nasceu
-- visível ao público (não havia outro estado), então publicado é o único
-- backfill correto. Com default 'draft' esta migration esconderia a agenda
-- inteira do feed no momento em que rodasse.
CREATE TYPE public.event_status_enum AS ENUM ('draft', 'published');

ALTER TABLE public.events
  ADD COLUMN status public.event_status_enum NOT NULL DEFAULT 'published';

-- 2) Capacidade: dado operacional do dono (quantas pessoas o evento comporta),
-- usado só no painel. Não é exibido no app público nesta fase, por isso é
-- anulável — os eventos existentes e quem não controla lotação ficam com NULL.
ALTER TABLE public.events
  ADD COLUMN capacity INTEGER,
  ADD CONSTRAINT events_capacity_positive CHECK (capacity IS NULL OR capacity > 0);

-- 3) Recorrência por instâncias geradas.
--
-- "Toda quinta" vira N linhas reais em events, uma por ocorrência, não uma linha
-- com regra. Assim feed público, mobile e web continuam lendo eventos soltos por
-- data, sem nenhuma mudança: quem consome evento não sabe que recorrência
-- existe. O group_id é só para o painel do dono agrupar e editar/apagar em lote.
--
-- A alternativa (guardar RRULE e expandir na leitura) obrigaria a mexer em todo
-- consumidor de evento do monorepo — queries, RPC de proximidade, cache, mapa —
-- para entender um evento que não tem data própria. NULL = evento único.
ALTER TABLE public.events ADD COLUMN recurrence_group_id TEXT;

CREATE INDEX events_recurrence_group_id_idx
  ON public.events (recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

-- 4) SELECT de events deixa de ser aberto.
--
-- A policy original (`USING (true)`, de 20260611185705) vazaria rascunho para
-- qualquer cliente. O filtro fica no banco de propósito: uma query nova que
-- esqueça o `.eq('status', 'published')` não expõe nada, e não há como um app
-- futuro errar isso. Dono vê os próprios rascunhos, admin vê tudo.
DROP POLICY select_events ON public.events;

CREATE POLICY select_events ON public.events
  FOR SELECT USING (
    status = 'published'
    OR public.owns_establishment(establishment_id)
    OR public.is_admin()
  );

-- 5) Moderação de conteúdo: schema pronto, feature desligada no app.
--
-- O fluxo previsto é o cliente triar o texto que o dono escreve contra a lista
-- de termos e enfileirar o trecho suspeito aqui; o admin aprova ou rejeita. Nada
-- disso bloqueia a publicação nesta fase — a fila só acumula.
CREATE TYPE public.moderation_status_enum AS ENUM ('pending', 'approved', 'rejected');

-- entity_id é TEXT porque tanto events.id quanto establishments.id são TEXT.
-- Sem FK: a coluna aponta para duas tabelas diferentes conforme entity_type.
CREATE TABLE public.moderation_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'establishment')),
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  matched_terms TEXT[] NOT NULL DEFAULT '{}',
  status public.moderation_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Fila do admin ("o que está pendente") e consulta por entidade ("este evento
-- tem pendência?"), os dois únicos acessos previstos.
CREATE INDEX moderation_queue_status_idx ON public.moderation_queue (status);
CREATE INDEX moderation_queue_entity_idx
  ON public.moderation_queue (entity_type, entity_id);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- O dono lê só as entradas do próprio bar. Para 'event' o vínculo é indireto:
-- entity_id é o id do evento, então precisa do subselect para chegar ao
-- establishment_id. Para 'establishment' o entity_id já é o bar.
CREATE POLICY owner_select_moderation_queue ON public.moderation_queue
  FOR SELECT USING (
    (
      entity_type = 'event'
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = moderation_queue.entity_id
          AND public.owns_establishment(e.establishment_id)
      )
    )
    OR (
      entity_type = 'establishment'
      AND public.owns_establishment(entity_id)
    )
  );

CREATE POLICY admin_select_moderation_queue ON public.moderation_queue
  FOR SELECT USING (public.is_admin());

-- Quem enfileira é o cadastro do dono, no momento em que ele salva um texto
-- suspeito. O WITH CHECK repete a condição de posse do SELECT em vez de liberar
-- `true`: senão qualquer autenticado encheria a fila do admin com entradas sobre
-- bares alheios. É denúncia do próprio conteúdo, não de conteúdo de terceiros.
CREATE POLICY owner_insert_moderation_queue ON public.moderation_queue
  FOR INSERT TO authenticated WITH CHECK (
    (
      entity_type = 'event'
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = moderation_queue.entity_id
          AND public.owns_establishment(e.establishment_id)
      )
    )
    OR (
      entity_type = 'establishment'
      AND public.owns_establishment(entity_id)
    )
  );

-- Só o admin aprova/rejeita. E não há policy de DELETE: a fila é histórico de
-- decisão, apagar entrada apagaria a prova de que a revisão aconteceu.
CREATE POLICY admin_update_moderation_queue ON public.moderation_queue
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Lista de termos que o cliente usa para triar. SELECT liberado a authenticated
-- porque a triagem acontece no cliente, antes de salvar.
CREATE TABLE public.moderation_terms (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_moderation_terms ON public.moderation_terms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY admin_insert_moderation_terms ON public.moderation_terms
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY admin_update_moderation_terms ON public.moderation_terms
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY admin_delete_moderation_terms ON public.moderation_terms
  FOR DELETE USING (public.is_admin());

-- A lista de termos é populada por SQL direto / painel admin, fora do git.
-- Versionar um dicionário de palavrões no repositório não tem contrapartida:
-- ele muda com o uso, não com o código, e ficaria para sempre no histórico.
