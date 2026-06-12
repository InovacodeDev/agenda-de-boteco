import { Screen } from '../../src/components/layout/Screen';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { NotificationCard } from '../../src/components/notification/NotificationCard';
import { NOTIFICATIONS } from '../../src/data';
import { useNotificationsStore } from '../../src/store/useNotificationsStore';
import { ScrollView, View } from '../../src/tw';

export default function NotificationsScreen() {
  const readIds = useNotificationsStore((state) => state.readIds);
  const markRead = useNotificationsStore((state) => state.markRead);

  return (
    <Screen>
      <ScreenHeader title="Avisos" showLogo />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3 p-4">
        <View className="gap-3">
          {NOTIFICATIONS.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              unread={!notification.read && !readIds.includes(notification.id)}
              onPress={() => markRead(notification.id)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
