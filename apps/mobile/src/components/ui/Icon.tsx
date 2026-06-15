import {
  FontAwesomeIcon,
  type FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome';

import { type IconName, type IconVariant, resolveIcon } from './iconMap';

export interface IconProps {
  /** kebab-case name from the centralized icon map. */
  name: IconName;
  /** `solid` (default), `regular` (outline), or `brands` (logos). */
  variant?: IconVariant;
  /** Icon color; pass a value from `@/theme/colors`. */
  color?: string;
  /** Square size in px. */
  size?: number;
  style?: FontAwesomeIconStyle;
}

/**
 * Centralized icon. Isolates the icon library: swapping or extending the
 * icon set only touches `iconMap.ts`. Call-sites reference icons by name.
 */
export function Icon({ name, variant, color, size, style }: IconProps) {
  return (
    <FontAwesomeIcon icon={resolveIcon(name, variant)} color={color} size={size} style={style} />
  );
}
