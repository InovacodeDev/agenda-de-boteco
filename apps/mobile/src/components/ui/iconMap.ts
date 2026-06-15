import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faApple } from '@fortawesome/free-brands-svg-icons/faApple';
import { faGoogle } from '@fortawesome/free-brands-svg-icons/faGoogle';
import { faBell as faBellRegular } from '@fortawesome/free-regular-svg-icons/faBell';
import { faCalendar as faCalendarRegular } from '@fortawesome/free-regular-svg-icons/faCalendar';
import { faClock as faClockRegular } from '@fortawesome/free-regular-svg-icons/faClock';
import { faComment as faCommentRegular } from '@fortawesome/free-regular-svg-icons/faComment';
import { faEnvelope as faEnvelopeRegular } from '@fortawesome/free-regular-svg-icons/faEnvelope';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons/faHeart';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons/faStar';
import { faUser as faUserRegular } from '@fortawesome/free-regular-svg-icons/faUser';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faAt } from '@fortawesome/free-solid-svg-icons/faAt';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faCalendar } from '@fortawesome/free-solid-svg-icons/faCalendar';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faComment } from '@fortawesome/free-solid-svg-icons/faComment';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons/faEnvelope';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faHouse } from '@fortawesome/free-solid-svg-icons/faHouse';
import { faLocationArrow } from '@fortawesome/free-solid-svg-icons/faLocationArrow';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons/faLocationDot';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';
import { faMusic } from '@fortawesome/free-solid-svg-icons/faMusic';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons/faRightFromBracket';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons/faShareNodes';
import { faSliders } from '@fortawesome/free-solid-svg-icons/faSliders';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faStore } from '@fortawesome/free-solid-svg-icons/faStore';
import { faTicket } from '@fortawesome/free-solid-svg-icons/faTicket';
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons/faWandMagicSparkles';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';

export type IconVariant = 'solid' | 'regular' | 'brands';

interface IconEntry {
  solid?: IconDefinition;
  regular?: IconDefinition;
  brands?: IconDefinition;
}

const ICON_MAP = {
  'apple': { brands: faApple },
  'arrow-left': { solid: faArrowLeft },
  'at': { solid: faAt },
  'bell': { solid: faBell, regular: faBellRegular },
  'calendar': { solid: faCalendar, regular: faCalendarRegular },
  'check': { solid: faCheck },
  'chevron-right': { solid: faChevronRight },
  'circle-info': { solid: faCircleInfo },
  'clock': { solid: faClock, regular: faClockRegular },
  'comment': { solid: faComment, regular: faCommentRegular },
  'envelope': { solid: faEnvelope, regular: faEnvelopeRegular },
  'google': { brands: faGoogle },
  'heart': { solid: faHeart, regular: faHeartRegular },
  'house': { solid: faHouse },
  'location-arrow': { solid: faLocationArrow },
  'location-dot': { solid: faLocationDot },
  'magnifying-glass': { solid: faMagnifyingGlass },
  'music': { solid: faMusic },
  'right-from-bracket': { solid: faRightFromBracket },
  'share-nodes': { solid: faShareNodes },
  'sliders': { solid: faSliders },
  'star': { solid: faStar, regular: faStarRegular },
  'store': { solid: faStore },
  'ticket': { solid: faTicket },
  'user': { solid: faUser, regular: faUserRegular },
  'wand-magic-sparkles': { solid: faWandMagicSparkles },
  'xmark': { solid: faXmark },
} satisfies Record<string, IconEntry>;

export type IconName = keyof typeof ICON_MAP;

export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[];

/**
 * Resolve a kebab-case name + optional variant to a Font Awesome icon.
 * If the requested variant is absent, falls back deterministically to the
 * entry's available definition (brands → solid → regular), guaranteeing a
 * valid IconDefinition for every registered name.
 */
export function resolveIcon(name: IconName, variant: IconVariant = 'solid'): IconDefinition {
  const entry: IconEntry = ICON_MAP[name];
  const chosen =
    entry[variant] ?? entry.brands ?? entry.solid ?? entry.regular;
  // Every entry has at least one definition; the map type guarantees this.
  return chosen as IconDefinition;
}
