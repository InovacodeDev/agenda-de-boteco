import type React from 'react';
import { useCssElement } from 'react-native-css';

/**
 * O genérico de useCssElement produz uniões grandes demais para o TS em
 * componentes de props complexas (Pressable, ScrollView). Alias com
 * assinatura estreita, mesmo contrato de runtime.
 */
const useCssElementLoose = useCssElement as unknown as (
  component: unknown,
  props: object,
  mapping: Record<string, 'style' | 'contentContainerStyle'>,
) => React.ReactElement;

/**
 * NOTE: react-native-css descarta os estilos da className quando a prop de
 * destino chega como chave presente com valor `undefined` (ex.: `style={style}`
 * repassado por um componente pai) — o elemento fica sem cor nem layout.
 * Removemos essas chaves antes de delegar.
 */
export function withoutUndefinedTargets(props: object): object {
  const record = props as Record<string, unknown>;
  if (record.style !== undefined && record.contentContainerStyle !== undefined) {
    return props;
  }
  const { style, contentContainerStyle, ...rest } = record;
  return {
    ...rest,
    ...(style === undefined ? {} : { style }),
    ...(contentContainerStyle === undefined ? {} : { contentContainerStyle }),
  };
}

export const useStyledElement = (
  component: unknown,
  props: object,
  mapping: Record<string, 'style' | 'contentContainerStyle'>,
): React.ReactElement => useCssElementLoose(component, withoutUndefinedTargets(props), mapping);
