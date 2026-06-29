'use client';

import type { TextareaHTMLAttributes } from 'react';

import { INPUT_CLASS } from './styles';

export function TextArea({
  className = '',
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  // h-11 do INPUT_CLASS não faz sentido em textarea; sobrescreve com min-h.
  return (
    <textarea
      rows={rows}
      className={`${INPUT_CLASS} h-auto min-h-[2.75rem] py-2 ${className}`}
      {...props}
    />
  );
}
