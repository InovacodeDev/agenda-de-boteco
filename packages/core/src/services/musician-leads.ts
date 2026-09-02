import type { SupabaseClient } from '@supabase/supabase-js';

import { type MusicianLeadInput, musicianLeadSchema } from '../schemas/musician-lead';
import { getConfiguredSupabase } from '../supabase/client';
import { handleServiceError } from '../utils/errors';

/**
 * Registra o cadastro de um músico feito no portal do artista (issue #59).
 *
 * Chamada anônima: o portal ainda não tem login. A escrita vai por RPC
 * SECURITY DEFINER porque `musician_leads` tem RLS habilitada e ZERO policy de
 * INSERT — dar policy de escrita ao papel `anon` seria abrir a tabela ao mundo
 * (ver 20260901120000_musician_leads.sql). A RPC revalida tudo no SQL; o parse
 * abaixo é só para o formulário errar cedo e apontar o campo.
 */
export async function createMusicianLead(input: MusicianLeadInput): Promise<string> {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }
  try {
    const lead = musicianLeadSchema.parse(input);
    // Escape hatch documentado: create_musician_lead ainda não está em
    // database.types.ts (arquivo gerado), e sem isso o supabase-js recusa o
    // nome da RPC em tempo de compilação. Regenerar os tipos é a correção.
    const { data, error } = await (client as SupabaseClient).rpc('create_musician_lead', {
      p_name: lead.name,
      p_phone: lead.phone,
      p_region: lead.region,
      p_music_style_ids: lead.musicStyleIds,
      p_instagram: lead.instagram,
      p_price_range: lead.priceRange ?? null,
    });
    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('RPC create_musician_lead não retornou o id');
    }
    return data as string;
  } catch (error) {
    // Sem `args`: nome, telefone e Instagram do músico são PII e o contexto é
    // serializado inteiro no log (§9.2). O `method` já localiza a falha.
    return handleServiceError(error, { method: 'musicianLeads.createMusicianLead' });
  }
}
