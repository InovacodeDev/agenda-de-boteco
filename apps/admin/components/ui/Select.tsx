'use client';

import type { SelectHTMLAttributes } from 'react';

import { SELECT_CLASS } from './styles';

// Seta nativa escondida (appearance-none no SELECT_CLASS); a custom fica a 16px
// da borda direita (right-4), mesmo respiro que o pl-4 do texto à esquerda.
// SVG como elemento (não background-image) para usar o token de tema e não
// depender do parser de classe arbitrária do Tailwind.
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
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
