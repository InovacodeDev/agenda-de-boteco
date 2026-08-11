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

CREATE POLICY select_own_favorites ON public.user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own_favorites ON public.user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY delete_own_favorites ON public.user_favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX user_favorites_user_idx ON public.user_favorites (user_id);
