'use client';

import type { AttributeIconName } from '@agenda/core';
import {
  BabyIcon,
  BeerSteinIcon,
  CalendarCheckIcon,
  CarIcon,
  CheersIcon,
  ClockAfternoonIcon,
  ConfettiIcon,
  CookingPotIcon,
  CreditCardIcon,
  DiscIcon,
  DogIcon,
  ForkKnifeIcon,
  GlobeIcon,
  HamburgerIcon,
  type Icon,
  LaptopIcon,
  MartiniIcon,
  MegaphoneIcon,
  MountainsIcon,
  MusicNotesIcon,
  PlantIcon,
  RainbowCloudIcon,
  SoccerBallIcon,
  SpeakerHighIcon,
  StorefrontIcon,
  TelevisionIcon,
  TicketIcon,
  TreeIcon,
  TrophyIcon,
  UsersIcon,
  WheelchairIcon,
  WifiHighIcon,
  WindIcon,
  WineIcon,
} from '@phosphor-icons/react';

/**
 * Ícones dos 36 atributos de estabelecimento. Espelha o `iconMap` de
 * apps/mobile: o campo `icon` de ESTABLISHMENT_ATTRIBUTES é o mesmo nome
 * kebab-case nos dois apps, só o componente Phosphor é resolvido por plataforma.
 *
 * O Record é tipado pelo nome derivado do core, então um atributo novo lá não
 * compila aqui até ganhar o seu ícone — nada de chip sem ícone em silêncio.
 * Ícones de UI (botões, navegação) não entram: são importados direto do Phosphor
 * onde são usados.
 */
const ATTRIBUTE_ICONS: Record<AttributeIconName, Icon> = {
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
  music: MusicNotesIcon,
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
};

export function AttributeIcon({ name, size = 16 }: { name: AttributeIconName; size?: number }) {
  // O Record cobre toda a união, então Component sempre existe — sem fallback null.
  const Component = ATTRIBUTE_ICONS[name];
  return <Component size={size} weight="regular" />;
}
