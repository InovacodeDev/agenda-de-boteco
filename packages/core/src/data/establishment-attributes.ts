import type { EstablishmentAttribute } from '../schemas/catalog';

/**
 * Catálogo de atributos de estabelecimento. Fonte única para os três apps:
 * o enum do banco (`establishment_attribute_enum`) define os valores, este
 * arquivo define como cada um se apresenta ao usuário.
 *
 * `description` é a tooltip do chip (title no web, accessibilityLabel no mobile,
 * legenda no admin) — o usuário nunca precisa adivinhar o que "counter-service"
 * significa. `icon` é um nome do iconMap/Phosphor, resolvido por cada app.
 *
 * A ordem daqui é a ordem de exibição em toda a UI (busca, admin, chips).
 */
export interface EstablishmentAttributeMeta {
  id: EstablishmentAttribute;
  label: string;
  description: string;
  icon: string;
}

export const ESTABLISHMENT_ATTRIBUTES: readonly EstablishmentAttributeMeta[] = [
  // Infraestrutura e comodidades
  {
    id: 'pet-friendly',
    label: 'Pet Friendly',
    description: 'Aceita animais de estimação.',
    icon: 'pet',
  },
  {
    id: 'kids-area',
    label: 'Área Kids',
    description:
      'Espaço ou serviços para crianças (playground, brinquedoteca, fraldário, monitores).',
    icon: 'kids',
  },
  {
    id: 'accessible-pcd',
    label: 'Acessível (PCD)',
    description: 'Rampas de acesso, elevadores e banheiros adaptados.',
    icon: 'accessible',
  },
  {
    id: 'parking',
    label: 'Estacionamento',
    description:
      'Vagas próprias, convênio com estacionamento próximo ou serviço de valet.',
    icon: 'parking',
  },
  {
    id: 'outdoor-space',
    label: 'Espaço ao Ar Livre',
    description: 'Varanda, jardim, quintal, rooftop ou área aberta.',
    icon: 'outdoor',
  },
  {
    id: 'work-friendly',
    label: 'Work-friendly',
    description:
      'Espaço adequado para trabalho remoto/laptop (tomadas acessíveis, iluminação e silêncio).',
    icon: 'laptop',
  },
  {
    id: 'free-wifi',
    label: 'Wi-Fi Gratuito',
    description: 'Conexão à internet disponível gratuitamente para clientes.',
    icon: 'wifi',
  },
  {
    id: 'air-conditioning',
    label: 'Ar-condicionado',
    description: 'Ambiente interno climatizado.',
    icon: 'air-conditioning',
  },
  // Vibe e atmosfera
  {
    id: 'live-music',
    label: 'Música ao Vivo',
    description: 'Apresentações musicais acústicas, bandas ou couvert artístico.',
    icon: 'music',
  },
  {
    id: 'dj-set',
    label: 'DJ Set',
    description:
      'Presença de DJ, focado em festas, música eletrônica ou brasilidades.',
    icon: 'dj',
  },
  {
    id: 'cozy-romantic',
    label: 'Intimista / Romântico',
    description: 'Iluminação baixa, mesas reservadas e clima tranquilo a dois.',
    icon: 'romantic',
  },
  {
    id: 'lively-party',
    label: 'Animado / Festivo',
    description: 'Focado em celebrações, grupos e som mais alto.',
    icon: 'party',
  },
  {
    id: 'scenic-view',
    label: 'Vista Panorâmica',
    description: 'Vista privilegiada para mar/praia, morro, parque ou skyline.',
    icon: 'scenic-view',
  },
  // Transmissão de esportes e jogos
  {
    id: 'live-sports',
    label: 'Passa Jogo de Futebol',
    description: 'Transmissão de partidas de futebol ao vivo.',
    icon: 'sports',
  },
  {
    id: 'sports-audio-on',
    label: 'Transmissão com Som',
    description:
      'Transmite a partida com o áudio original ligado no sistema de som do local.',
    icon: 'audio-on',
  },
  {
    id: 'big-screen-tvs',
    label: 'Telão / Múltiplas Telas',
    description:
      'Possui projetor/telão ou TVs distribuídas estrategicamente pelo ambiente.',
    icon: 'tv',
  },
  {
    id: 'national-soccer',
    label: 'Jogos Nacionais',
    description: 'Foco em Brasileirão, Copa do Brasil e Campeonatos Estaduais.',
    icon: 'trophy',
  },
  {
    id: 'international-soccer',
    label: 'Futebol Internacional',
    description:
      'Transmissão de Champions League, Libertadores e ligas europeias.',
    icon: 'globe',
  },
  {
    id: 'other-sports',
    label: 'Outros Esportes',
    description: 'Transmissão de UFC, NBA, NFL, Fórmula 1, entre outros.',
    icon: 'other-sports',
  },
  {
    id: 'game-day-deals',
    label: 'Promoções em Dia de Jogo',
    description:
      'Ofertas especiais como double chopp, balde de cerveja ou combos de petiscos durante os jogos.',
    icon: 'deals',
  },
  {
    id: 'cheering-environment',
    label: 'Clima de Torcida',
    description:
      'Espaço preparado para grupos grandes, encontros de torcidas organizadas e comemorações.',
    icon: 'cheering',
  },
  // Gastronomia e restrições
  {
    id: 'vegan-options',
    label: 'Opções Veganas',
    description: 'Pratos dedicados sem nenhum insumo de origem animal.',
    icon: 'vegan',
  },
  {
    id: 'vegetarian-options',
    label: 'Opções Vegetarianas',
    description: 'Pratos sem carnes na preparação.',
    icon: 'vegetarian',
  },
  {
    id: 'gluten-free-lactose-free',
    label: 'Sem Glúten / Sem Lactose',
    description:
      'Opções adaptadas ou seguras para celíacos e intolerantes à lactose.',
    icon: 'gluten-free',
  },
  {
    id: 'kids-menu',
    label: 'Menu Infantil',
    description:
      'Porções e pratos com apresentações e sabores pensados para crianças.',
    icon: 'kids-menu',
  },
  {
    id: 'signature-cocktails',
    label: 'Drinks Autorais',
    description: 'Carta de coquetelaria exclusiva do estabelecimento.',
    icon: 'cocktail',
  },
  {
    id: 'craft-beer',
    label: 'Cerveja Artesanal',
    description: 'Rótulos de cervejarias locais ou torneiras de chopp artesanal.',
    icon: 'beer',
  },
  // Ocasião e público
  {
    id: 'good-for-groups',
    label: 'Bom para Grupos',
    description:
      'Mesas amplas, formato flexível para comemorações e pratos para compartilhar.',
    icon: 'groups',
  },
  {
    id: 'great-for-dates',
    label: 'Ideal para Dates',
    description: 'Ambiente e iluminação propícios para encontros.',
    icon: 'date',
  },
  {
    id: 'happy-hour',
    label: 'Happy Hour',
    description: 'Promoções ou clima voltado para o pós-expediente.',
    icon: 'happy-hour',
  },
  {
    id: 'lgbtq-friendly',
    label: 'LGBTQIA+ Friendly',
    description: 'Espaço explicitamente inclusivo, seguro e acolhedor.',
    icon: 'lgbtq',
  },
  {
    id: 'family-friendly',
    label: 'Familiar',
    description: 'Ambiente confortável e acolhedor para todas as gerações.',
    icon: 'family',
  },
  // Serviços e pagamentos
  {
    id: 'accepts-meal-voucher',
    label: 'Aceita Vale-Refeição / VA',
    description:
      'Aceita cartões de benefícios (ex: Caju, Pluxee/Sodexo, Alelo, Ticket, VR).',
    icon: 'meal-voucher',
  },
  {
    id: 'accepts-reservations',
    label: 'Aceita Reservas',
    description:
      'Permite agendar mesa antecipadamente pelo aplicativo, site ou telefone.',
    icon: 'reservation',
  },
  {
    id: 'free-entry',
    label: 'Entrada Gratuita',
    description: 'Isento de cobrança de portaria, ingresso ou consumação mínima.',
    icon: 'free-entry',
  },
  {
    id: 'counter-service',
    label: 'Atendimento no Balcão',
    description: 'Atendimento rápido em balcão ou balcão externo.',
    icon: 'counter',
  },
] as const;

/**
 * Os cinco atributos que ganham chip no filtro rápido do feed. Os demais só
 * pelo modal de busca — 36 chips na horizontal não é filtro, é lista.
 */
export const QUICK_ATTRIBUTES: readonly EstablishmentAttribute[] = [
  'pet-friendly',
  'kids-area',
  'outdoor-space',
  'live-music',
  'live-sports',
] as const;

const ATTRIBUTES_BY_ID: Record<EstablishmentAttribute, EstablishmentAttributeMeta> =
  Object.fromEntries(ESTABLISHMENT_ATTRIBUTES.map((attr) => [attr.id, attr])) as Record<
    EstablishmentAttribute,
    EstablishmentAttributeMeta
  >;

/** Metadados de um atributo. O id vem do enum, então a entrada sempre existe. */
export function getAttributeMeta(
  id: EstablishmentAttribute,
): EstablishmentAttributeMeta {
  return ATTRIBUTES_BY_ID[id];
}

/** Chips do filtro rápido, na ordem de QUICK_ATTRIBUTES. */
export const QUICK_ATTRIBUTE_METAS: readonly EstablishmentAttributeMeta[] =
  QUICK_ATTRIBUTES.map(getAttributeMeta);
