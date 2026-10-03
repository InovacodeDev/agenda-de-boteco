import Svg, { Path } from 'react-native-svg';

import { View } from './tw';

export interface SparklinePoint {
  date: string;
  views: number;
  clicks: number;
}

export interface SparklineProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = '#1dd75e',
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <View style={{ width, height }} />;
  }

  const values = data.map((d) => d.views + d.clicks);
  const min = Math.min(...values);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const points = values.map((val, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
