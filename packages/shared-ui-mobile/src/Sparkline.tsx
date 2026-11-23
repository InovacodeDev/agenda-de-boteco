import Svg, { Path } from 'react-native-svg';

import { Text, View } from './tw';

export interface SparklinePoint {
  date: string;
  views: number;
}

export interface SparklineProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  color?: string;
}

/** Resumo em vez de enumerar cada dia: 90 pontos no label viram ruído para leitor de tela. */
export function buildSparklineLabel(data: SparklinePoint[]): string {
  const first = data[0];
  const last = data[data.length - 1];
  if (!first || !last) return 'Sem dados no período.';
  return `Evolução de visualizações: ${first.views} em ${first.date}, chegando a ${last.views} em ${last.date}`;
}

export function Sparkline({ data, width = 120, height = 36, color = '#1dd75e' }: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <View style={{ width, height }} className="items-center justify-center">
        <Text className="font-body text-muted-foreground text-xs">Sem dados no período.</Text>
      </View>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.views));
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((d, index) => {
    const x = data.length > 1 ? index * stepX : width / 2;
    const y = height - (d.views / max) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={buildSparklineLabel(data)}
    >
      <Svg width={width} height={height}>
        <Path
          d={`M ${points.join(' L ')}`}
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
