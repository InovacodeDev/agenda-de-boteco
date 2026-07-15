'use client';

export interface FilterSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
}

/** Slider verde tematizado da página de filtros — <input type="range"> nativo. */
export function FilterSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
}: FilterSliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={minimumValue}
      max={maximumValue}
      step={step}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-elevated accent-primary"
    />
  );
}
