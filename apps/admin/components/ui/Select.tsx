'use client';

import { CaretDownIcon } from '@phosphor-icons/react';
import type { SelectHTMLAttributes } from 'react';

import { SELECT_CLASS } from './styles';

// Seta nativa escondida (appearance-none no SELECT_CLASS); a custom fica a 16px
// da borda direita (right-4), mesmo respiro que o pl-4 do texto à esquerda.
export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${SELECT_CLASS} ${className}`} {...props}>
        {children}
      </select>
      <CaretDownIcon
        aria-hidden
        size={16}
        weight="bold"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
