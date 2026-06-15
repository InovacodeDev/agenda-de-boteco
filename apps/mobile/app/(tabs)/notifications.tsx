import { FlashList } from '@shopify/flash-list';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { NotificationCard } from '@/components/notification/NotificationCard';
import type { AppNotification } from '@/data/schemas';
import { useNotificationsQuery } from '@/hooks/queries';
import { useNotificationsStore } from '@/store/useNotificationsStore';
import { View } from '@/tw';

const ItemSeparator = () => <View className="h-3" />;

export default function NotificationsScreen() {
  const readIds = useNotificationsStore((state) => state.readIds);
  const markRead = useNotificationsStore((state) => state.markRead);

  const { data: notifications } = useNotificationsQuery();

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <NotificationCard
      notification={item}
      unread={!item.read && !readIds.includes(item.id)}
      onPress={markRead}
    />
  );

  return (
    <Screen>
      <ScreenHeader title="Avisos" showLogo />
      <FlashList
        data={notifications ?? []}
        keyExtractor={(notification) => notification.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={ItemSeparator}
        renderItem={renderNotification}
        extraData={readIds}
      />
    </Screen>
  );
}
