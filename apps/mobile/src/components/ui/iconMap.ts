import {
  AppleLogo,
  ArrowLeft,
  At,
  Baby,
  BeerStein,
  Bell,
  CalendarBlank,
  CalendarCheck,
  Car,
  CaretRight,
  ChatCircle,
  Check,
  Cheers,
  Clock,
  ClockAfternoon,
  Confetti,
  CookingPot,
  CreditCard,
  Disc,
  Dog,
  DownloadSimple,
  Envelope,
  FilePdf,
  ForkKnife,
  Globe,
  GoogleLogo,
  Hamburger,
  Heart,
  House,
  type Icon as PhosphorIcon,
  type IconWeight,
  Info,
  Laptop,
  MagnifyingGlass,
  MapPin,
  Martini,
  Megaphone,
  Mountains,
  MusicNotes,
  NavigationArrow,
  Plant,
  RainbowCloud,
  ShareNetwork,
  SignOut,
  SlidersHorizontal,
  SoccerBall,
  Sparkle,
  SpeakerHigh,
  Star,
  Storefront,
  Television,
  Ticket,
  Trash,
  Tree,
  Trophy,
  User,
  Users,
  Wheelchair,
  WifiHigh,
  Wind,
  Wine,
  Wrench,
  X,
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
  'apple': AppleLogo,
  'arrow-left': ArrowLeft,
  'at': At,
  'bell': Bell,
  'calendar': CalendarBlank,
  'check': Check,
  'chevron-right': CaretRight,
  'circle-info': Info,
  'clock': Clock,
  'comment': ChatCircle,
  'download': DownloadSimple,
  'envelope': Envelope,
  'file-pdf': FilePdf,
  'google': GoogleLogo,
  'heart': Heart,
  'house': House,
  'location-arrow': NavigationArrow,
  'location-dot': MapPin,
  'magnifying-glass': MagnifyingGlass,
  'music': MusicNotes,
  'right-from-bracket': SignOut,
  'screwdriver-wrench': Wrench,
  'share-nodes': ShareNetwork,
  'sliders': SlidersHorizontal,
  'star': Star,
  'store': Storefront,
  'ticket': Ticket,
  'trash-can': Trash,
  'user': User,
  'wand-magic-sparkles': Sparkle,
  'xmark': X,
  // Atributos de estabelecimento
  'accessible': Wheelchair,
  'air-conditioning': Wind,
  'audio-on': SpeakerHigh,
  'beer': BeerStein,
  'cheering': Megaphone,
  'cocktail': Martini,
  'counter': Storefront,
  'date': Wine,
  'deals': Cheers,
  'dj': Disc,
  'family': Users,
  'free-entry': Ticket,
  'gluten-free': CookingPot,
  'globe': Globe,
  'groups': Users,
  'happy-hour': ClockAfternoon,
  'kids': Baby,
  'kids-menu': Hamburger,
  'laptop': Laptop,
  'lgbtq': RainbowCloud,
  'meal-voucher': CreditCard,
  'other-sports': Trophy,
  'outdoor': Tree,
  'parking': Car,
  'party': Confetti,
  'pet': Dog,
  'reservation': CalendarCheck,
  'romantic': Wine,
  'scenic-view': Mountains,
  'sports': SoccerBall,
  'trophy': Trophy,
  'tv': Television,
  'vegan': Plant,
  'vegetarian': ForkKnife,
  'wifi': WifiHigh,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICON_MAP;

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
