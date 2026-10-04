import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { Pressable, Text, View } from './tw';

export type ToastTone = 'error' | 'success';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastInput {
  tone: ToastTone;
  message: string;
  action?: ToastAction;
}

interface ToastItem extends ToastInput {
  id: number;
}

/** Erro fica mais tempo porque costuma pedir uma ação de correção; sucesso só confirma. */
export const TOAST_DURATION_MS: Record<ToastTone, number> = {
  error: 10_000,
  success: 7_000,
};

const MAX_VISIBLE = 3;
const TONE_COLOR: Record<ToastTone, string> = {
  error: '#f53d7a',
  success: '#1dd75e',
};

interface ToastContextValue {
  show: (toast: ToastInput) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>');
  }
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((toast: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...toast, id }]);
    AccessibilityInfo.announceForAccessibility(toast.message);
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const value = useMemo(() => ({ show, dismissAll }), [show, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 8 }]}
        className="items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [enter] = useState(() => new Animated.Value(0));
  const [remaining] = useState(() => new Animated.Value(1));
  const duration = TOAST_DURATION_MS[toast.tone];
  const color = TONE_COLOR[toast.tone];

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
    Animated.timing(remaining, {
      toValue: 0,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [enter, remaining, duration, onDismiss, toast.id]);

  return (
    <Animated.View
      accessibilityRole={toast.tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
          ],
        },
      ]}
    >
      <View className="flex-row items-start gap-3 px-4 py-3.5">
        <View className="mt-px">
          <Icon name={toast.tone === 'error' ? 'warning' : 'check'} size={20} color={color} weight="fill" />
        </View>
        <View className="min-w-0 flex-1 items-start gap-1.5">
          <Text className="font-body text-foreground text-[14px] leading-5">{toast.message}</Text>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                toast.action?.onPress();
                onDismiss(toast.id);
              }}
            >
              <Text className="font-body-semibold text-primary text-[14px]">{toast.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso"
          hitSlop={12}
          onPress={() => onDismiss(toast.id)}
          className="-m-1 rounded-lg p-1 active:opacity-60"
        >
          <Icon name="xmark" size={16} color="#a6a6a6" />
        </Pressable>
      </View>
      <Animated.View
        style={[
          styles.progress,
          { backgroundColor: color, transform: [{ scaleX: remaining }] },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 440,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    backgroundColor: '#242424',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  progress: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    opacity: 0.7,
    transformOrigin: 'left',
  },
});
