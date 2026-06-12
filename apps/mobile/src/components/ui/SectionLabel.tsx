import { Text } from '../../tw';
import { cn } from '../../utils/cn';

export interface SectionLabelProps {
  children: string;
  className?: string;
}

/** Label uppercase pequeno ("ESTILOS EM ALTA", "7 EVENTOS ENCONTRADOS") */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <Text
      className={cn(
        'font-body-semibold text-[12px] uppercase tracking-widest text-muted-foreground',
        className,
      )}
    >
      {children}
    </Text>
  );
}
