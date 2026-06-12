import Slider from '@react-native-community/slider';

import { colors } from '../../theme/colors';

export interface FilterSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
}

/** Slider verde tematizado do sheet de filtros */
export function FilterSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
}: FilterSliderProps) {
  return (
    <Slider
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      onValueChange={onValueChange}
      minimumTrackTintColor={colors.primary}
      maximumTrackTintColor={colors.surfaceElevated}
      thumbTintColor={colors.primary}
      style={{ height: 32 }}
    />
  );
}
