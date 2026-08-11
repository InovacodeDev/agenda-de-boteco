import type { StatusLight, StatusLightTone } from '@agenda/core';

const TONE_COLOR: Record<StatusLightTone, string> = {
  green: 'var(--color-status-green)',
  yellow: 'var(--color-status-yellow)',
  orange: 'var(--color-status-orange)',
  red: 'var(--color-status-red)',
};

export interface StatusLightBadgeProps {
  light: StatusLight | null;
}

/**
 * Selo de status (semáforo) dos cards, espelhando o mobile: bolinha colorida
 * + texto curto. O texto acompanha a cor de propósito — cor sozinha não é
 * legível para daltônicos, e verde/vermelho é o par mais confundido.
 */
export function StatusLightBadge({ light }: StatusLightBadgeProps) {
  if (!light) return null;

  const color = TONE_COLOR[light.tone];

  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full bg-background/60 px-2 py-0.5"
      title={light.label}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="whitespace-nowrap text-[10px] font-[family-name:var(--font-body)] font-medium"
        style={{ color }}
      >
        {light.label}
      </span>
    </span>
  );
}
