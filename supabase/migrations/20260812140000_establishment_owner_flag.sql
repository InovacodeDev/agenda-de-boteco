-- Painel do estabelecimento: flag de acesso ao módulo.
--
-- O painel é um produto separado do app público: ter conta no Agenda de Boteco
-- não dá acesso a ele. Quem já é usuário do app precisa passar pelo cadastro do
-- painel, que promove a conta existente em vez de criar uma segunda.
--
-- Diferente de profiles.is_admin (promovido só por SQL direto), esta flag é
-- auto-atribuída pelo próprio usuário — por isso exige prova de posse do e-mail:
-- a RPC abaixo só age sobre auth.uid(), que só existe após o Supabase confirmar
-- o e-mail (auth.email.enable_confirmations = true). Sem isso, saber o e-mail de
-- alguém bastaria para assumir a conta.

ALTER TABLE public.profiles
  ADD COLUMN is_establishment_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- Espelha is_admin(): SECURITY DEFINER para ler profiles sem RLS recursivo.
CREATE OR REPLACE FUNCTION public.is_establishment_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_establishment_owner FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- Promove a conta do usuário AUTENTICADO. Só o próprio dono da sessão se
-- promove: não recebe e-mail nem id como argumento, age sempre sobre auth.uid().
-- Idempotente — repetir a chamada não é erro (o usuário pode reenviar o form).
CREATE OR REPLACE FUNCTION public.claim_establishment_owner()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

  -- Contas criadas antes do trigger handle_new_user podem não ter profile.
  INSERT INTO public.profiles (id, email, is_establishment_owner)
  SELECT v_user_id, u.email, TRUE
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET is_establishment_owner = TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_establishment_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_establishment_owner() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_establishment_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_establishment_owner() TO authenticated, service_role;
