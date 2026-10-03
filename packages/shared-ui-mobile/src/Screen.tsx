import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from './cn';
import { View } from './tw';

export const MAX_CONTENT_WIDTH_TABLET = 960;

export interface ScreenProps {
  children: ReactNode;
  header?: ReactNode;
  noTopInset?: boolean;
  noBottomInset?: boolean;
  fullBleed?: boolean;
  className?: string;
  style?: object;
}

export function Screen({
  children,
  header,
  noTopInset = false,
  noBottomInset = false,
  fullBleed = false,
  className,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={style}
      className={cn('bg-background flex-1', className)}
    >
      <View
        className="flex-1"
        style={{
          paddingTop: noTopInset ? undefined : insets.top,
          paddingBottom: noBottomInset ? undefined : insets.bottom,
        }}
      >
        {header}
        <View
          className="flex-1"
          style={
            fullBleed
              ? undefined
              : { width: '100%', maxWidth: MAX_CONTENT_WIDTH_TABLET, alignSelf: 'center' }
          }
        >
          {children}
        </View>
      </View>
    </View>
  );
}
