'use client';

import {
  ArrowLeftIcon as PhArrowLeftIcon,
  BabyIcon,
  BeerSteinIcon,
  CalendarBlankIcon,
  CalendarCheckIcon,
  CarIcon,
  CheersIcon,
  ClockAfternoonIcon,
  ClockIcon as PhClockIcon,
  ConfettiIcon,
  CookingPotIcon,
  CreditCardIcon,
  DiscIcon,
  DogIcon,
  ForkKnifeIcon,
  GlobeIcon,
  HamburgerIcon,
  HeartIcon as PhHeartIcon,
  type Icon as PhosphorIcon,
  InfoIcon as PhInfoIcon,
  InstagramLogoIcon as PhInstagramLogoIcon,
  LaptopIcon,
  MagnifyingGlassIcon,
  MapPinIcon as PhMapPinIcon,
  MartiniIcon,
  MegaphoneIcon,
  MountainsIcon,
  MusicNotesIcon,
  PlantIcon,
  RainbowCloudIcon,
  SlidersHorizontalIcon,
  SoccerBallIcon,
  SparkleIcon,
  SpeakerHighIcon,
  StarIcon as PhStarIcon,
  StorefrontIcon,
  TelevisionIcon,
  TicketIcon as PhTicketIcon,
  TreeIcon,
  TrophyIcon,
  UsersIcon,
  WheelchairIcon,
  WifiHighIcon,
  WindIcon,
  WineIcon,
  XIcon as PhXIcon,
} from '@phosphor-icons/react';

/**
 * Ícones da app (Phosphor). Esta fachada mantém os nomes históricos usados nas
 * telas — trocar ou estender o set de ícones toca só este arquivo.
 *
 * Peso `regular` por padrão; `fill` marca estado ativo (coração favoritado,
 * estrela de avaliação), espelhando o `variant` do mobile.
 */
type IconProps = { className?: string; size?: number };

export function SearchIcon({ size = 16, className }: IconProps) {
  return <MagnifyingGlassIcon size={size} className={className} />;
}

export function SlidersIcon({ size = 16, className }: IconProps) {
  return <SlidersHorizontalIcon size={size} className={className} />;
}

export function HeartIcon({
  filled,
  size = 16,
  className,
}: IconProps & { filled?: boolean }) {
  return (
    <PhHeartIcon size={size} className={className} weight={filled ? 'fill' : 'regular'} />
  );
}

export function CalendarIcon({ size = 16, className }: IconProps) {
  return <CalendarBlankIcon size={size} className={className} />;
}

export function MapPinIcon({ size = 16, className }: IconProps) {
  return <PhMapPinIcon size={size} className={className} />;
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return <PhClockIcon size={size} className={className} />;
}

export function TicketIcon({ size = 16, className }: IconProps) {
  return <PhTicketIcon size={size} className={className} />;
}

export function ArrowLeftIcon({ size = 16, className }: IconProps) {
  return <PhArrowLeftIcon size={size} className={className} />;
}

/** Estrela de avaliação: sempre preenchida (indicador, não estado alternável). */
export function StarIcon({ size = 16, className }: IconProps) {
  return <PhStarIcon size={size} className={className} weight="fill" />;
}

export function SparklesIcon({ size = 16, className }: IconProps) {
  return <SparkleIcon size={size} className={className} weight="fill" />;
}

export function XIcon({ size = 16, className }: IconProps) {
  return <PhXIcon size={size} className={className} />;
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return <PhInfoIcon size={size} className={className} />;
}

export function InstagramIcon({ size = 16, className }: IconProps) {
  return <PhInstagramLogoIcon size={size} className={className} />;
}

/**
 * Ícones dos atributos de estabelecimento, indexados pelo campo `icon` de
 * ESTABLISHMENT_ATTRIBUTES (@agenda/core). Mesmas chaves do iconMap do mobile.
 */
export const ATTRIBUTE_ICONS: Record<string, PhosphorIcon> = {
  'accessible': WheelchairIcon,
  'air-conditioning': WindIcon,
  'audio-on': SpeakerHighIcon,
  'beer': BeerSteinIcon,
  'cheering': MegaphoneIcon,
  'cocktail': MartiniIcon,
  'counter': StorefrontIcon,
  'date': WineIcon,
  'deals': CheersIcon,
  'dj': DiscIcon,
  'family': UsersIcon,
  'free-entry': PhTicketIcon,
  'gluten-free': CookingPotIcon,
  'globe': GlobeIcon,
  'groups': UsersIcon,
  'happy-hour': ClockAfternoonIcon,
  'kids': BabyIcon,
  'kids-menu': HamburgerIcon,
  'laptop': LaptopIcon,
  'lgbtq': RainbowCloudIcon,
  'meal-voucher': CreditCardIcon,
  'music': MusicNotesIcon,
  'other-sports': TrophyIcon,
  'outdoor': TreeIcon,
  'parking': CarIcon,
  'party': ConfettiIcon,
  'pet': DogIcon,
  'reservation': CalendarCheckIcon,
  'romantic': WineIcon,
  'scenic-view': MountainsIcon,
  'sports': SoccerBallIcon,
  'trophy': TrophyIcon,
  'tv': TelevisionIcon,
  'vegan': PlantIcon,
  'vegetarian': ForkKnifeIcon,
  'wifi': WifiHighIcon,
};

/** Ícone de um atributo do catálogo; cai em Sparkle se a chave for desconhecida. */
export function AttributeIcon({
  icon,
  size = 12,
  className,
}: IconProps & { icon: string }) {
  const Glyph = ATTRIBUTE_ICONS[icon] ?? SparkleIcon;
  return <Glyph size={size} className={className} />;
}
