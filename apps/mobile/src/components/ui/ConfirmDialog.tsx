import { Modal } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { headingLetterSpacing } from '@/theme/typography';
import { Pressable, Text, View } from '@/tw';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable onPress={onCancel} className="flex-1 items-center justify-center bg-black/70 px-8">
        <Pressable
          accessibilityViewIsModal
          onPress={() => {}}
          className="bg-card border-border w-full gap-5 rounded-2xl border p-6"
        >
          <View className="gap-2">
            <Text
              className="font-heading text-foreground text-[18px]"
              style={{ letterSpacing: headingLetterSpacing(18) }}
            >
              {title}
            </Text>
            {message ? (
              <Text className="font-body text-muted-foreground text-[14px]">{message}</Text>
            ) : null}
          </View>

          <View className="flex-row gap-3">
            <Button
              label={cancelLabel}
              variant="outline"
              onPress={onCancel}
              className="flex-1"
              style={{ backgroundColor: colors.background }}
            />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              className="flex-1"
              style={destructive ? { backgroundColor: colors.destructive } : undefined}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
