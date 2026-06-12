import { useRouter } from 'expo-router';
import { Heart, MapPin, Music, Sparkles } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';

import { GuardedPressable } from '@/components/ui/GuardedPressable';
import type { AppNotification, NotificationType } from '@/data/schemas';
import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';
import { relativeTime } from '@/utils/dates';

function iconFor(type: NotificationType, unread: boolean): ReactNode {
  const color = unread ? colors.primary : colors.mutedForeground;
  switch (type) {
    case 'style':
      return <Music color={color} size={18} />;
    case 'city':
      return <MapPin color={color} size={18} />;
    case 'favorite':
      return <Heart color={color} size={18} />;
    case 'promo':
      return <Sparkles color={color} size={18} />;
  }
}

export interface NotificationCardProps {
  notification: AppNotification;
  unread: boolean;
  /** Recebe o id do aviso — permite passar um handler estável à lista. */
  onPress: (id: string) => void;
}

/**
 * Card de aviso: ícone por tipo, dot verde e borda sutil quando não lido.
 * Memoizado: com handler estável, só re-renderiza quando `unread` muda.
 */
export const NotificationCard = memo(function NotificationCard({
  notification,
  unread,
  onPress,
}: NotificationCardProps) {
  const router = useRouter();

  const open = () => {
    onPress(notification.id);
    if (notification.event_id) {
      router.push(`/event/${notification.event_id}`);
    } else if (notification.establishment_id) {
      router.push(`/establishment/${notification.establishment_id}`);
    }
  };

  return (
    <GuardedPressable
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      onPress={open}
      className={cn(
        'bg-card flex-row items-center gap-3 rounded-2xl p-3.5 active:opacity-90',
        unread && 'border-primary/40 border',
      )}
    >
      <View
        className={cn(
          'h-10 w-10 items-center justify-center rounded-xl',
          unread ? 'bg-primary/15' : 'bg-surface-elevated',
        )}
      >
        {iconFor(notification.type, unread)}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-body-semibold text-foreground text-[14px]" numberOfLines={1}>
          {notification.title}
        </Text>
        <Text className="font-body text-muted-foreground text-[13px]" numberOfLines={2}>
          {notification.body}
        </Text>
      </View>
      <View className="items-end gap-1.5">
        <Text className="font-body text-muted-foreground text-[11px]">
          {relativeTime(notification.created_at)}
        </Text>
        {unread ? <View className="bg-primary h-2 w-2 rounded-full" /> : null}
      </View>
    </GuardedPressable>
  );
});
