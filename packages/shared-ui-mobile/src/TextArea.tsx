import type { TextInputProps as RNTextInputProps } from 'react-native';

import { cn } from './cn';
import { TextInput as StyledTextInput, View } from './tw';

export interface TextAreaProps extends RNTextInputProps {
  rows?: number;
  error?: boolean;
  className?: string;
  containerClassName?: string;
}

export function TextArea({
  rows = 4,
  error = false,
  className,
  containerClassName,
  style,
  ...props
}: TextAreaProps) {
  const minHeight = Math.max(rows * 24, 80);

  return (
    <View
      className={cn(
        'w-full rounded-xl border border-border bg-surface p-3.5',
        error && 'border-destructive',
        containerClassName,
      )}
      style={{ minHeight }}
    >
      <StyledTextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor="#737373"
        style={style}
        className={cn(
          'font-body text-foreground flex-1 text-[15px]',
          className,
        )}
        {...props}
      />
    </View>
  );
}
