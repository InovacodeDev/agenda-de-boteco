import { Modal, TouchableWithoutFeedback } from 'react-native';

import { Button } from './Button';
import { Text, View } from './tw';

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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 items-center justify-center bg-black/60 p-5">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <Text className="font-heading text-foreground mb-2 text-lg font-bold">
                {title}
              </Text>
              <Text className="font-body text-muted-foreground mb-6 text-sm leading-relaxed">
                {message}
              </Text>
              <View className="flex-row items-center justify-end gap-3">
                <Button
                  label={cancelLabel}
                  variant="ghost"
                  disabled={busy}
                  onPress={onCancel}
                  className="h-10 px-3"
                />
                <Button
                  label={confirmLabel}
                  variant={destructive ? 'destructive' : 'solid'}
                  busy={busy}
                  onPress={onConfirm}
                  className="h-10 px-4"
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
