import { createSupabaseClient } from '@agenda/core';

type Client = ReturnType<typeof createSupabaseClient>;
let client: Client | null | undefined;

/**
 * Client Supabase do portal do artista. Mesma forma dos demais apps web
 * (localStorage + detectSessionInUrl), já preparado para o login que ainda não
 * existe aqui. Null se as envs não estiverem setadas.
 */
export function getSupabase(): Client | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client =
    url && anonKey
      ? createSupabaseClient({ url, anonKey, storage: undefined, detectSessionInUrl: true })
      : null;
  return client;
}
