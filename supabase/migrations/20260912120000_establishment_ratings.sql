-- Avaliações de estabelecimentos (notas de 1 a 5 estrelas).
--
-- Regras de negócio e segurança:
-- 1. Exclusivo de estabelecimento (não de eventos).
-- 2. Cada usuário autenticado pode avaliar no máximo 1 vez cada bar (índice único
--    parcial onde user_id IS NOT NULL), podendo editar sua nota a qualquer momento.
-- 3. Ao deletar a conta do usuário (account_deletion_queue), a FK user_id vira NULL
--    (ON DELETE SET NULL), mantendo a nota no banco de forma 100% anônima sem quebrar
--    o índice único ou alterar as estatísticas do bar.
-- 4. O dono do bar visualiza as notas e estatísticas do seu estabelecimento, mas não
--    pode remover avaliações (sem policy de DELETE).
-- 5. Trigger em establishment_ratings recalcula rating_avg e rating_count na tabela
--    public.establishments automaticamente.

CREATE TABLE public.establishment_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id TEXT NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT establishment_ratings_establishment_user_unique UNIQUE (establishment_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'establishment_ratings_establishment_user_unique'
  ) THEN
    ALTER TABLE public.establishment_ratings
      ADD CONSTRAINT establishment_ratings_establishment_user_unique UNIQUE (establishment_id, user_id);
  END IF;
END $$;

CREATE INDEX establishment_ratings_establishment_idx
  ON public.establishment_ratings (establishment_id);

CREATE INDEX establishment_ratings_user_idx
  ON public.establishment_ratings (user_id)
  WHERE user_id IS NOT NULL;

-- Trigger para atualizar updated_at automaticamente na edição da nota.
CREATE OR REPLACE FUNCTION public.set_establishment_rating_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_establishment_ratings_updated_at
  BEFORE UPDATE ON public.establishment_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_establishment_rating_updated_at();

-- Trigger para recalcular rating_avg e rating_count em establishments.
-- SECURITY DEFINER para permitir atualizar establishments independente das policies de cliente.
CREATE OR REPLACE FUNCTION public.recalculate_establishment_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_establishment_id TEXT;
  v_avg NUMERIC(3, 2);
  v_count INTEGER;
BEGIN
  v_establishment_id := COALESCE(NEW.establishment_id, OLD.establishment_id);

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0.0),
    COUNT(*)::integer
  INTO
    v_avg,
    v_count
  FROM public.establishment_ratings
  WHERE establishment_id = v_establishment_id;

  UPDATE public.establishments
  SET
    rating_avg = v_avg,
    rating_count = v_count
  WHERE id = v_establishment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalculate_establishment_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.establishment_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_establishment_rating();

-- RLS
ALTER TABLE public.establishment_ratings ENABLE ROW LEVEL SECURITY;

-- Usuário consulta a própria avaliação
CREATE POLICY select_own_rating ON public.establishment_ratings
  FOR SELECT USING (auth.uid() = user_id);

-- Dono do bar consulta as avaliações do seu estabelecimento
CREATE POLICY select_owner_ratings ON public.establishment_ratings
  FOR SELECT USING (public.owns_establishment(establishment_id));

-- Admin consulta todas as avaliações
CREATE POLICY select_admin_ratings ON public.establishment_ratings
  FOR SELECT USING (public.is_admin());

-- Usuário autenticado insere sua nota (apenas com seu próprio user_id)
CREATE POLICY insert_own_rating ON public.establishment_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuário autenticado atualiza sua própria nota
CREATE POLICY update_own_rating ON public.establishment_ratings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sem policy de DELETE: nem dono nem cliente comum removem avaliações.

-- GRANT explícito para a role authenticated
GRANT SELECT, INSERT, UPDATE ON public.establishment_ratings TO authenticated;
