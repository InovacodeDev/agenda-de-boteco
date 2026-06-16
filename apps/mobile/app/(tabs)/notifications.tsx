import { FlashList } from '@shopify/flash-list';

import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { NotificationCard } from '@/components/notification/NotificationCard';
import { Icon } from '@/components/ui/Icon';
import { FEATURES } from '@/config/features';
import type { AppNotification } from '@/data/schemas';
import { useNotificationsQuery } from '@/hooks/queries';
import { useNotificationsStore } from '@/store/useNotificationsStore';
import { colors } from '@/theme/colors';
import { View } from '@/tw';

const ItemSeparator = () => <View className="h-3" />;

function NotificationsContent() {
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

export default function NotificationsScreen() {
  if (!FEATURES.notifications) {
    return (
      <UnderConstruction
        isTab
        version="v3"
        icon={<Icon name="bell" color={colors.primary} size={36} />}
        title="Os avisos estão a caminho"
        description="Logo logo a gente te cutuca quando seu bar favorito soltar um show, uma promo ou um happy hour imperdível. Chega na v3 — deixa que a gente avisa, você só aparece."
      />
    );
  }
  return <NotificationsContent />;
}
