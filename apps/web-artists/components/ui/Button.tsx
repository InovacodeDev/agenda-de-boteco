'use client';

import type { ButtonHTMLAttributes } from 'react';

import { BTN_GHOST, BTN_PRIMARY } from './styles';

type Variant = 'primary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: BTN_PRIMARY,
  ghost: BTN_GHOST,
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${VARIANTS[variant]} ${className}`} {...props} />;
}
