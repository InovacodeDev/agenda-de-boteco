import { maskCurrencyBR } from '@agenda/core';
import type { ReactNode } from 'react';
import type { TextInputProps as RNTextInputProps } from 'react-native';

import { cn } from './cn';
import { TextInput as StyledTextInput, View } from './tw';

export interface TextInputProps extends RNTextInputProps {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: boolean;
  className?: string;
  containerClassName?: string;
  type?: 'text' | 'password' | 'email' | 'currency' | string;
  prefix?: boolean | string;
}

export function TextInput({
  leftIcon,
  rightIcon,
  error = false,
  className,
  containerClassName,
  style,
  type,
  onChangeText,
  keyboardType,
  placeholder,
  prefix,
  ...props
}: TextInputProps) {
  const isCurrency = type === 'currency';

  const handleChangeText = (text: string) => {
    if (isCurrency) {
      const masked = maskCurrencyBR(text, { prefix });
      onChangeText?.(masked);
    } else {
      onChangeText?.(text);
    }
  };

  return (
    <View
      className={cn(
        'h-12 w-full flex-row items-center rounded-xl border border-border bg-surface px-3.5',
        error && 'border-destructive',
        containerClassName,
      )}
    >
      {leftIcon ? <View className="mr-2.5">{leftIcon}</View> : null}
      <StyledTextInput
        placeholderTextColor="#737373"
        style={style}
        keyboardType={isCurrency ? (keyboardType ?? 'numeric') : keyboardType}
        placeholder={isCurrency ? (placeholder ?? '0,00') : placeholder}
        onChangeText={handleChangeText}
        className={cn(
          'font-body text-foreground flex-1 text-[15px]',
          className,
        )}
        {...props}
      />
      {rightIcon ? <View className="ml-2.5">{rightIcon}</View> : null}
    </View>
  );
}
