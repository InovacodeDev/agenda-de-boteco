import type { EstablishmentAttribute, PriceRange } from '../schemas/catalog';
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

/**
 * Cria a cidade digitada no onboarding, ou devolve o id da que já existe.
 * A deduplicação é do banco (slug do nome + UF), então "São Paulo" e
 * "sao paulo" convergem para a mesma linha em vez de virarem duas.
 */
export async function createCityFromPanel(name: string, uf: string): Promise<string> {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }
  try {
    const { data, error } = await client.rpc('create_city_from_panel', {
      p_name: name,
      p_uf: uf,
    });
    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('RPC create_city_from_panel não retornou o id');
    }
    return data;
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentOwner.createCityFromPanel',
      args: { name, uf },
    });
  }
}

/**
 * Campos do wizard de onboarding (Fase 1) e da tela de Perfil (Fase 2) — são os
 * mesmos: o onboarding coleta o mínimo e o Perfil edita tudo depois.
 */
export interface CreateOwnedEstablishmentInput {
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  cityId: string;
  address: string;
  neighborhood: string;
  whatsapp: string;
  instagram: string;
  openingHours: string;
  /** Vazio quando o dono não escolheu; a RPC aplica o default. */
  priceRange: string;
  ambiance: string;
  menuUrl: string;
  attributes: EstablishmentAttribute[];
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
      p_description: input.description,
      p_logo_url: input.logoUrl,
      p_cover_url: input.coverUrl,
      p_city_id: input.cityId,
      p_address: input.address,
      p_neighborhood: input.neighborhood,
      p_whatsapp: input.whatsapp,
      p_instagram: input.instagram,
      p_opening_hours: input.openingHours,
      p_price_range: input.priceRange,
      p_ambiance: input.ambiance,
      p_menu_url: input.menuUrl,
      p_attributes: input.attributes,
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

/**
 * Salva o perfil público do bar do dono logado (Fase 2). UPDATE direto, sem RPC:
 * a policy `owner_update_establishments` já restringe a linha a quem é dono, e
 * o WITH CHECK no id impede repontar o registro para outro estabelecimento.
 *
 * Só as colunas do formulário vão no payload — lat/lng, rating e menu_items
 * ficam de fora para o save não zerar o que a tela não edita.
 */
export async function updateOwnedEstablishment(
  id: string,
  input: CreateOwnedEstablishmentInput & { priceRange: PriceRange },
): Promise<void> {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }
  try {
    const { error } = await client
      .from('establishments')
      .update({
        name: input.name,
        description: input.description,
        logo_url: input.logoUrl,
        cover_url: input.coverUrl,
        city_id: input.cityId,
        address: input.address,
        neighborhood: input.neighborhood,
        whatsapp: input.whatsapp,
        // Coluna anulável: string vazia viraria um "@" fantasma no perfil público.
        instagram: input.instagram || null,
        opening_hours: input.openingHours,
        // Na criação a RPC aplica o default do banco quando vazio; aqui o valor
        // sempre existe, porque a tela carrega o atual do estabelecimento.
        price_range: input.priceRange,
        ambiance: input.ambiance,
        menu_pdf_url: input.menuUrl || null,
        attributes: input.attributes,
      })
      .eq('id', id);
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, {
      method: 'establishmentOwner.updateOwnedEstablishment',
      args: { id, name: input.name },
    });
  }
}
