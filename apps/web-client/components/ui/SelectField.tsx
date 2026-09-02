'use client';

import { CaretDownIcon } from '@phosphor-icons/react';
import { type SelectHTMLAttributes } from 'react';

/**
 * Select com a seta desenhada por nós (a nativa não aceita posicionamento),
 * a 6px da borda — mesma âncora do campo de cidade, para os dois não
 * destoarem lado a lado.
 */
export function SelectField({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${className} appearance-none pr-10`} />
      <CaretDownIcon
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
