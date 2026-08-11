-- Admin: perfis de usuário + escrita no catálogo restrita a admins.
-- Até aqui o catálogo era SELECT-público e ninguém escrevia via API (só seed).
-- O painel admin é o primeiro lugar que faz INSERT/UPDATE/DELETE de verdade.

-- 1) Perfis: 1:1 com auth.users. is_admin é a flag de autorização.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cada um lê só o próprio perfil. is_admin nunca é editável via API:
-- não há policy de UPDATE, então só service_role / SQL direto promove admin.
CREATE POLICY select_own_profile ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 2) Provisiona profile automaticamente quando um auth.users é criado.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) is_admin(): SECURITY DEFINER lê profiles sem disparar RLS recursivo
-- (uma policy que consultasse profiles diretamente recursaria). STABLE: 1x por query.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- 4) Escrita admin-only no catálogo. SELECT público das migrations anteriores
-- permanece intacto; aqui só adicionamos INSERT/UPDATE/DELETE.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'establishments', 'events', 'notifications',
    'event_attractions', 'music_styles', 'cities'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY admin_insert_%1$s ON public.%1$I FOR INSERT WITH CHECK (public.is_admin())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY admin_update_%1$s ON public.%1$I FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY admin_delete_%1$s ON public.%1$I FOR DELETE USING (public.is_admin())',
      tbl
    );
  END LOOP;
END;
$$;

-- Promover o primeiro admin (rodar manualmente, fora do git, com o email real):
--   UPDATE public.profiles SET is_admin = TRUE WHERE email = 'voce@exemplo.com';
