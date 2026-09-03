import type { AttributeIconName } from '@agenda/core';
import {
  AppleLogoIcon,
  ArrowLeftIcon,
  AtIcon,
  BabyIcon,
  BeerSteinIcon,
  BellIcon,
  CalendarBlankIcon,
  CalendarCheckIcon,
  CaretRightIcon,
  CarIcon,
  ChatCircleIcon,
  CheckIcon,
  CheersIcon,
  ClockAfternoonIcon,
  ClockIcon,
  ConfettiIcon,
  CookingPotIcon,
  CreditCardIcon,
  DiscIcon,
  DogIcon,
  DownloadSimpleIcon,
  EnvelopeIcon,
  FilePdfIcon,
  ForkKnifeIcon,
  GlobeIcon,
  GoogleLogoIcon,
  HamburgerIcon,
  HeartIcon,
  HouseIcon,
  type Icon as PhosphorIcon,
  type IconWeight,
  InfoIcon,
  InstagramLogoIcon,
  LaptopIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MartiniIcon,
  MegaphoneIcon,
  MountainsIcon,
  MusicNotesIcon,
  NavigationArrowIcon,
  PlantIcon,
  RainbowCloudIcon,
  ShareNetworkIcon,
  ShieldCheckIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  SoccerBallIcon,
  SparkleIcon,
  SpeakerHighIcon,
  StarIcon,
  StorefrontIcon,
  TelevisionIcon,
  TicketIcon,
  TrashIcon,
  TreeIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  WheelchairIcon,
  WifiHighIcon,
  WindIcon,
  WineIcon,
  WrenchIcon,
  XIcon,
} from 'phosphor-react-native';

/**
 * Variantes de chamada da app. Mantidas em `solid`/`regular`/`brands` (nomes
 * herdados dos call-sites) e traduzidas para os pesos do Phosphor: `solid` vira
 * `fill` (estado ativo — coração favoritado, estrela preenchida) e `regular`
 * segue outline. `brands` existe só para os logos, que têm peso único.
 */
export type IconVariant = 'solid' | 'regular' | 'brands';

const WEIGHT_BY_VARIANT: Record<IconVariant, IconWeight> = {
  solid: 'fill',
  regular: 'regular',
  brands: 'fill',
};

/** Peso default de quem não passa `variant` — o padrão visual do app. */
export const DEFAULT_ICON_WEIGHT: IconWeight = 'regular';

/**
 * Mapa central de ícones (Phosphor). Call-sites referenciam por nome
 * kebab-case; trocar a biblioteca de ícones toca só este arquivo.
 *
 * Os nomes da primeira seção são os históricos da navegação/UI. A segunda
 * cobre os atributos de estabelecimento (`icon` em ESTABLISHMENT_ATTRIBUTES).
 */
const ICON_MAP = {
  // UI e navegação
  apple: AppleLogoIcon,
  'arrow-left': ArrowLeftIcon,
  at: AtIcon,
  bell: BellIcon,
  calendar: CalendarBlankIcon,
  check: CheckIcon,
  'chevron-right': CaretRightIcon,
  'circle-info': InfoIcon,
  clock: ClockIcon,
  comment: ChatCircleIcon,
  download: DownloadSimpleIcon,
  envelope: EnvelopeIcon,
  'file-pdf': FilePdfIcon,
  google: GoogleLogoIcon,
  heart: HeartIcon,
  house: HouseIcon,
  instagram: InstagramLogoIcon,
  'location-arrow': NavigationArrowIcon,
  'location-dot': MapPinIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  music: MusicNotesIcon,
  'right-from-bracket': SignOutIcon,
  'screwdriver-wrench': WrenchIcon,
  'share-nodes': ShareNetworkIcon,
  'shield-check': ShieldCheckIcon,
  sliders: SlidersHorizontalIcon,
  star: StarIcon,
  store: StorefrontIcon,
  ticket: TicketIcon,
  'trash-can': TrashIcon,
  user: UserIcon,
  'wand-magic-sparkles': SparkleIcon,
  xmark: XIcon,
  // Atributos de estabelecimento
  accessible: WheelchairIcon,
  'air-conditioning': WindIcon,
  'audio-on': SpeakerHighIcon,
  beer: BeerSteinIcon,
  cheering: MegaphoneIcon,
  cocktail: MartiniIcon,
  counter: StorefrontIcon,
  date: WineIcon,
  deals: CheersIcon,
  dj: DiscIcon,
  family: UsersIcon,
  'free-entry': TicketIcon,
  'gluten-free': CookingPotIcon,
  globe: GlobeIcon,
  groups: UsersIcon,
  'happy-hour': ClockAfternoonIcon,
  kids: BabyIcon,
  'kids-menu': HamburgerIcon,
  laptop: LaptopIcon,
  lgbtq: RainbowCloudIcon,
  'meal-voucher': CreditCardIcon,
  'other-sports': TrophyIcon,
  outdoor: TreeIcon,
  parking: CarIcon,
  party: ConfettiIcon,
  pet: DogIcon,
  reservation: CalendarCheckIcon,
  romantic: WineIcon,
  'scenic-view': MountainsIcon,
  sports: SoccerBallIcon,
  trophy: TrophyIcon,
  tv: TelevisionIcon,
  vegan: PlantIcon,
  vegetarian: ForkKnifeIcon,
  wifi: WifiHighIcon,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICON_MAP;

/**
 * Garante em tempo de compilação que todo ícone do catálogo de atributos do core
 * existe aqui. Acrescentar um atributo com ícone novo em @agenda/core quebra o
 * build deste arquivo até ele ser mapeado — em vez de o chip aparecer sem ícone.
 *
 * `Exclude` isola os ícones que faltam; atribuí-los a `never` faz o compilador
 * citar o nome não mapeado na mensagem de erro.
 */
const UNMAPPED_ATTRIBUTE_ICONS: never[] = [] as Exclude<AttributeIconName, IconName>[];
void UNMAPPED_ATTRIBUTE_ICONS;

export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[];

/** Resolve um nome kebab-case para o componente Phosphor correspondente. */
export function resolveIcon(name: IconName): PhosphorIcon {
  return ICON_MAP[name];
}

/** Traduz a variante da app para o peso do Phosphor. */
export function resolveWeight(variant?: IconVariant): IconWeight {
  return variant ? WEIGHT_BY_VARIANT[variant] : DEFAULT_ICON_WEIGHT;
}

/** Type guard para nomes vindos de dados (ex.: `icon` do catálogo de atributos). */
export function isIconName(value: string): value is IconName {
  return value in ICON_MAP;
}
