import type { ReactNode } from 'react';

import { GradientBadge } from '@/components/ui/GradientBadge';

export interface UnderConstructionProps {
  /** Ícone temático no selo com glow neon (ex.: <MapPinIcon size={40} />). */
  icon?: ReactNode;
  /** Rótulo da versão de retorno, ex.: 'v2' — vira badge "Chega na vX". */
  version?: string;
  /** Título chamativo em font-heading. */
  title?: string;
  /** Parágrafo descritivo em font-body. */
  description?: string;
}

/**
 * Estado "Em construção" para entrega gradual. Espelha o mobile em DOM/Tailwind:
 * selo de ícone com glow neon, badge de versão, título e descrição.
 * Server component — conteúdo 100% estático.
 */
export function UnderConstruction({
  icon,
  version,
  title = 'Em construção',
  description = 'Estamos preparando esta área. Volte em breve!',
}: UnderConstructionProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-16 text-center">
      {icon ? (
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-surface text-primary shadow-[0_0_24px_rgba(255,77,166,0.45)]">
          {icon}
        </span>
      ) : null}

      {version ? <GradientBadge label={`Chega na ${version}`} /> : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-[26px] font-[family-name:var(--font-heading)] font-bold text-foreground">
          {title}
        </h2>
        <p className="text-[15px] font-[family-name:var(--font-body)] leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
