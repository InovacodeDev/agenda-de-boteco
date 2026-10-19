import { KeyboardAvoidingView } from '@agenda/shared-ui-mobile';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

interface KeyboardAwareBodyProps {
  children: ReactNode;
}

// NOTE: o KeyboardAvoidingView do RN calcula a sobreposição com o y relativo ao pai; sem medir o offset real na janela (topbar + header acima do form) o iOS deixa o botão de salvar atrás do teclado.
export function KeyboardAwareBody({ children }: KeyboardAwareBodyProps) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);

  const handleLayout = useCallback(() => {
    ref.current?.measureInWindow((_x, y) => setOffset(y));
  }, []);

  return (
    <View ref={ref} onLayout={handleLayout} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={offset}
        className="flex-1"
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
