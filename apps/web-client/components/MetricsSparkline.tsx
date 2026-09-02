'use client';

import type { DayBucket } from '@/hooks/use-owned-metrics';

/** Sparkline de views por dia. SVG puro — sem lib de gráfico nova (ver spec). */
export function MetricsSparkline({ data }: { data: DayBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-20 items-center justify-center text-[13px]">
        Sem dados no período.
      </div>
    );
  }

  const width = 320;
  const height = 80;
  const max = Math.max(1, ...data.map((day) => day.views));
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((day, index) => {
    const x = data.length > 1 ? index * stepX : width / 2;
    const y = height - (day.views / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Resumo, não enumeração: listar cada dia no aria-label vira ruído em vez de
  // ajuda em leitor de tela quando o período tem dezenas de pontos (ex: 90 dias).
  const first = data[0];
  const last = data[data.length - 1];
  const label = `Evolução de visualizações: ${first.views} em ${first.date}, chegando a ${last.views} em ${last.date}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" role="img" aria-label={label}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
