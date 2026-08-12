import { getConfiguredSupabase } from '../supabase/client';
import { handleServiceError } from '../utils/errors';

/**
 * Lê profiles.is_establishment_owner do usuário logado. Ter conta no Agenda de
 * Boteco não dá acesso ao painel: o dono precisa ter passado pelo cadastro dele.
 * RLS deixa cada um ler só o próprio perfil; sem client/sessão retorna false.
 */
export async function isCurrentUserEstablishmentOwner(): Promise<boolean> {
  const client = getConfiguredSupabase();
  if (!client) {
    return false;
  }
  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return false;
    }
    const { data, error } = await client
      .from('profiles')
      .select('is_establishment_owner')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data?.is_establishment_owner === true;
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentOwner.isCurrentUserEstablishmentOwner',
    });
  }
}

/**
 * Marca a conta autenticada como dona de estabelecimento, liberando o painel.
 * Age sempre sobre auth.uid() — a sessão é a prova de posse do e-mail, já que o
 * Supabase só a emite após confirmação. É o passo que promove uma conta que já
 * existia no app público, em vez de criar uma segunda conta para o mesmo e-mail.
 */
export async function claimEstablishmentOwner(): Promise<void> {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }
  try {
    const { error } = await client.rpc('claim_establishment_owner');
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentOwner.claimEstablishmentOwner',
    });
  }
}

/** Campos mínimos do wizard de onboarding (Fase 1 do painel do estabelecimento). */
export interface CreateOwnedEstablishmentInput {
  name: string;
  cityId: string;
  address: string;
  neighborhood: string;
  whatsapp: string;
}

/**
 * Lê o vínculo do usuário logado em `establishment_owners`. RLS deixa cada um
 * ler só o próprio vínculo; sem client/sessão retorna null. Usado pelo painel
 * do estabelecimento como guard e para decidir entre onboarding e dashboard.
 */
export async function getOwnedEstablishmentId(): Promise<string | null> {
  const client = getConfiguredSupabase();
  if (!client) {
    return null;
  }
  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return null;
    }
    const { data, error } = await client
      .from('establishment_owners')
      .select('establishment_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data?.establishment_id ?? null;
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentOwner.getOwnedEstablishmentId',
    });
  }
}

/**
 * Cria o estabelecimento e o vínculo com o usuário logado numa única transação,
 * via RPC SECURITY DEFINER — o dono não tem INSERT direto em nenhuma das duas
 * tabelas. A RPC rejeita quem já é dono de algum bar (um dono = um bar).
 */
export async function createOwnedEstablishment(
  input: CreateOwnedEstablishmentInput,
): Promise<string> {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }
  try {
    const { data, error } = await client.rpc('create_owned_establishment', {
      p_name: input.name,
      p_city_id: input.cityId,
      p_address: input.address,
      p_neighborhood: input.neighborhood,
      p_whatsapp: input.whatsapp,
    });
    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('RPC create_owned_establishment não retornou o id');
    }
    return data;
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentOwner.createOwnedEstablishment',
      args: { name: input.name, cityId: input.cityId },
    });
  }
}
