-- Backfill: cria profile para usuários que já existem em auth.users mas
-- ficaram sem linha em profiles (criados antes de 20260629120000, ou por
-- algum caminho que não passou pelo trigger on_auth_user_created).
--
-- Usuários novos já são cobertos pelo trigger handle_new_user (AFTER INSERT
-- on auth.users). Este backfill fecha o gap dos usuários pré-existentes, para
-- que qualquer um que logue no web/admin tenha profile garantido.
--
-- Mesmo par de colunas do trigger (id, email) para não divergir. Idempotente.
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
