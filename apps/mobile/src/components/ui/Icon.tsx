import {
  FontAwesomeIcon,
  type FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome';
import type { ColorValue } from 'react-native';

import { type IconName, type IconVariant, resolveIcon } from './iconMap';

export interface IconProps {
  /** kebab-case name from the centralized icon map. */
  name: IconName;
  /** `solid` (default), `regular` (outline), or `brands` (logos). */
  variant?: IconVariant;
  /** Icon color; accepts any RN ColorValue (e.g. a `@/theme/colors` value or a navigator tint). */
  color?: ColorValue;
  /** Square size in px. */
  size?: number;
  style?: FontAwesomeIconStyle;
}

/**
 * Centralized icon. Isolates the icon library: swapping or extending the
 * icon set only touches `iconMap.ts`. Call-sites reference icons by name.
 *
 * `color` accepts RN's ColorValue so navigator tints (`tabBarIcon`) type-check;
 * FontAwesomeIcon expects a string, which every caller provides (theme colors
 * and navigator tints are hex strings). PlatformColor/OpaqueColorValue is not
 * used anywhere in the app, so the non-string arm falls back to undefined.
 */
export function Icon({ name, variant, color, size, style }: IconProps) {
  const colorString = typeof color === 'string' ? color : undefined;
  return (
    <FontAwesomeIcon
      icon={resolveIcon(name, variant)}
      color={colorString}
      size={size}
      style={style}
    />
  );
}
