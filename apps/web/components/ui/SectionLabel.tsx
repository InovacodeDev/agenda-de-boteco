import { cn } from '@/lib/cn';

export interface SectionLabelProps {
  children: string;
  className?: string;
}

/** Label uppercase pequeno ("ESTILOS EM ALTA", "7 EVENTOS ENCONTRADOS"). */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        'text-[12px] font-[family-name:var(--font-body)] font-semibold uppercase tracking-widest text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}
