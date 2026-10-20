import type { IconWeight } from 'phosphor-react-native';
import { createElement } from 'react';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import {
  DEFAULT_ICON_WEIGHT,
  type IconName,
  type IconVariant,
  resolveIcon,
  resolveWeight,
} from './iconMap';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
  variant?: IconVariant;
  weight?: IconWeight;
  style?: StyleProp<ViewStyle>;
}

export function Icon({
  name,
  size = 20,
  color = '#fafafa',
  variant,
  weight,
  style,
}: IconProps) {
  const colorString = typeof color === 'string' ? color : undefined;

  return createElement(resolveIcon(name), {
    size,
    color: colorString,
    weight: weight ?? (variant ? resolveWeight(variant) : DEFAULT_ICON_WEIGHT),
    style,
  });
}
