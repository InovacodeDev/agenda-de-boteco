'use client';

import type { ChangeEvent, InputHTMLAttributes } from 'react';

import { INPUT_CLASS } from './styles';

function maskCurrency(value: string, prefix?: boolean | string): string {
  const d = value.replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
  const cents = d.padStart(3, '0');
  const int = cents.slice(0, -2);
  const dec = cents.slice(-2);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formatted = `${grouped},${dec}`;
  if (prefix) {
    const prefixStr = typeof prefix === 'string' ? prefix : 'R$ ';
    return `${prefixStr}${formatted}`;
  }
  return formatted;
}

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'prefix'> {
  type?: InputHTMLAttributes<HTMLInputElement>['type'] | 'currency';
  prefix?: boolean | string;
}

export function TextInput({
  className = '',
  type,
  onChange,
  inputMode,
  placeholder,
  prefix,
  ...props
}: TextInputProps) {
  const isCurrency = type === 'currency';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isCurrency) {
      const masked = maskCurrency(e.target.value, prefix);
      e.target.value = masked;
      onChange?.(e);
    } else {
      onChange?.(e);
    }
  };

  return (
    <input
      type={isCurrency ? 'text' : type}
      inputMode={isCurrency ? (inputMode ?? 'numeric') : inputMode}
      placeholder={isCurrency ? (placeholder ?? '0,00') : placeholder}
      className={`${INPUT_CLASS} ${className}`}
      onChange={handleChange}
      {...props}
    />
  );
}
