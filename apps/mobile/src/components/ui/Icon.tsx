import { createElement } from 'react';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import {
  type IconName,
  type IconVariant,
  resolveIcon,
  resolveWeight,
} from './iconMap';

export interface IconProps {
  /** kebab-case name from the centralized icon map. */
  name: IconName;
  /** `solid` (fill), `regular` (outline, default), or `brands` (logos). */
  variant?: IconVariant;
  /** Icon color; accepts any RN ColorValue (e.g. a `@/theme/colors` value or a navigator tint). */
  color?: ColorValue;
  /** Square size in px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Centralized icon (Phosphor). Isolates the icon library: swapping or extending
 * the icon set only touches `iconMap.ts`. Call-sites reference icons by name.
 *
 * `color` accepts RN's ColorValue so navigator tints (`tabBarIcon`) type-check;
 * Phosphor expects a string, which every caller provides (theme colors and
 * navigator tints are hex strings). PlatformColor/OpaqueColorValue is not used
 * anywhere in the app, so the non-string arm falls back to undefined.
 */
export function Icon({ name, variant, color, size, style }: IconProps) {
  const colorString = typeof color === 'string' ? color : undefined;
  // createElement em vez de <Glyph />: resolveIcon é uma consulta em mapa
  // estático, mas atribuir o resultado a uma variável capitalizada faz o
  // react-hooks/static-components acusar componente criado no render.
  return createElement(resolveIcon(name), {
    color: colorString,
    size,
    weight: resolveWeight(variant),
    style,
  });
}
