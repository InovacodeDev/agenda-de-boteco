-- Fila de exclusão de conta + processamento automático.
--
-- Fluxo: o usuário confirma o OTP de e-mail (fica autenticado) e o app chama a
-- RPC request_account_deletion(), que enfileira o próprio auth.uid(). Uma rotina
-- agendada (pg_cron, de hora em hora) chama process_account_deletion_queue(),
-- que apaga as contas pendentes de auth.users. A FK ON DELETE CASCADE de
-- user_favorites remove os favoritos junto.

CREATE TABLE public.account_deletion_queue (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.account_deletion_queue ENABLE ROW LEVEL SECURITY;

-- Sem políticas de acesso direto: a tabela é manipulada apenas pelas funções
-- SECURITY DEFINER abaixo. O cliente (anon/authenticated) nunca lê/escreve
-- diretamente — RLS habilitada e sem policy = acesso negado por padrão.

-- O usuário autenticado enfileira a PRÓPRIA conta. SECURITY DEFINER para poder
-- inserir mesmo sem policy de INSERT; o auth.uid() garante que ninguém enfileire
-- a conta de terceiros. Idempotente: repetir a solicitação apenas atualiza a data.
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.account_deletion_queue (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO UPDATE SET requested_at = now(), processed_at = NULL;
END;
$$;

-- Apaga as contas pendentes na fila. Roda com privilégio de definer (owner da
-- migration = postgres), então pode deletar de auth.users. Chamada pelo cron.
CREATE OR REPLACE FUNCTION public.process_account_deletion_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  victim RECORD;
  removed integer := 0;
BEGIN
  FOR victim IN
    SELECT user_id FROM public.account_deletion_queue WHERE processed_at IS NULL
  LOOP
    DELETE FROM auth.users WHERE id = victim.user_id;
    -- A linha da fila some por cascata (FK ON DELETE CASCADE em user_id).
    removed := removed + 1;
  END LOOP;
  RETURN removed;
END;
$$;

-- A RPC de solicitação é exposta ao papel authenticated (usuário logado via OTP).
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
-- O processamento NÃO é exposto a clientes: só o cron (postgres) o executa.
REVOKE ALL ON FUNCTION public.process_account_deletion_queue() FROM PUBLIC;

-- Agendamento de hora em hora via pg_cron. Requer a extensão habilitada no
-- projeto Supabase (Dashboard > Database > Extensions > pg_cron, ou o CREATE
-- EXTENSION abaixo se o papel tiver permissão).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Remove agendamento anterior de mesmo nome (reaplicação idempotente da migration).
SELECT cron.unschedule('process-account-deletion-queue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-account-deletion-queue'
);

SELECT cron.schedule(
  'process-account-deletion-queue',
  '0 * * * *', -- minuto 0 de toda hora
  $$SELECT public.process_account_deletion_queue();$$
);
