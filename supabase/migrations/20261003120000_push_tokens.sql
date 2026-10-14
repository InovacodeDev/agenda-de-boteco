-- Push no app do dono do bar (apps/mobile-client).
--
-- push_tokens: um Expo push token por aparelho. user_id nasce de auth.uid()
-- e toda policy compara com auth.uid() — o cliente nunca escolhe de quem é o
-- token. O envio (Edge Function send-push) roda com service_role e ignora RLS.
--
-- notification_preferences: as 7 chaves da tela de Notificações, persistidas
-- no banco para o envio poder respeitar canal e tipo de alerta. Uma linha por
-- usuário, PK = auth.uid().

CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE CHECK (char_length(token) BETWEEN 1 AND 512),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app TEXT NOT NULL DEFAULT 'client' CHECK (app IN ('client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX push_tokens_user_id_idx ON public.push_tokens (user_id);

CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_email BOOLEAN NOT NULL DEFAULT true,
  channel_push BOOLEAN NOT NULL DEFAULT true,
  alert_reviews BOOLEAN NOT NULL DEFAULT true,
  alert_musicians BOOLEAN NOT NULL DEFAULT true,
  alert_event_status BOOLEAN NOT NULL DEFAULT true,
  alert_empty_schedule BOOLEAN NOT NULL DEFAULT true,
  alert_weekly_digest BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_push_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_push_updated_at();

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_push_updated_at();

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select_push_tokens ON public.push_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY own_insert_push_tokens ON public.push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY own_update_push_tokens ON public.push_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY own_delete_push_tokens ON public.push_tokens
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY own_select_notification_preferences ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY own_insert_notification_preferences ON public.notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY own_update_notification_preferences ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY own_delete_notification_preferences ON public.notification_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT, DELETE ON public.push_tokens TO service_role;
GRANT SELECT ON public.notification_preferences TO service_role;

-- Reatribui o token à conta que está logando: a UNIQUE(token) faria o insert
-- simples falhar se o aparelho trocou de dono (ex: logout de uma conta, login
-- em outra). A RPC resolve sobre auth.uid() — nunca sobre um id por parâmetro.
CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_platform TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.push_tokens (user_id, token, platform, app)
  VALUES (auth.uid(), p_token, p_platform, 'client')
  ON CONFLICT (token) DO UPDATE
  SET user_id = auth.uid(), platform = excluded.platform, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT) TO authenticated;
