import { Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Text, View } from './tw';

const BACKDROP_PADDING = 20;

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View
          className="flex-1 items-center justify-center bg-black/60"
          style={{
            paddingTop: insets.top + BACKDROP_PADDING,
            paddingBottom: insets.bottom + BACKDROP_PADDING,
            paddingLeft: insets.left + BACKDROP_PADDING,
            paddingRight: insets.right + BACKDROP_PADDING,
          }}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <Text className="font-heading text-foreground mb-2 text-lg font-bold">
                {title}
              </Text>
              <Text className="font-body text-muted-foreground mb-6 text-sm leading-[22px]">
                {message}
              </Text>
              <View className="flex-col gap-2">
                <Button
                  label={confirmLabel}
                  variant={destructive ? 'destructive' : 'solid'}
                  busy={busy}
                  onPress={onConfirm}
                />
                <Button
                  label={cancelLabel}
                  variant="ghost"
                  disabled={busy}
                  onPress={onCancel}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
