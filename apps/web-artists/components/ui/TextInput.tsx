'use client';

import type { InputHTMLAttributes } from 'react';

import { INPUT_CLASS } from './styles';

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_CLASS} ${className}`} {...props} />;
}
