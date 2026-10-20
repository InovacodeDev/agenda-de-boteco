import { Icon, type IconName, Pressable, Text, View } from '@agenda/shared-ui-mobile';
import { type Href, usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isMoreRoute, MoreSheet } from '@/components/MoreSheet';

const TAB_BAR_HEIGHT = 56;
const CENTER_BUTTON_SIZE = 56;

interface TabItem {
  href: Href;
  label: string;
  icon: IconName;
  match: string;
}

const LEFT_TABS: TabItem[] = [
  { href: '/(painel)', label: 'Início', icon: 'squares-four', match: '/(painel)' },
  { href: '/(painel)/events', label: 'Eventos', icon: 'calendar-blank', match: '/events' },
];

const RIGHT_TABS: TabItem[] = [
  { href: '/(painel)/artists', label: 'Artistas', icon: 'microphone', match: '/artists' },
];

function isActive(pathname: string, item: TabItem): boolean {
  if (item.match === '/(painel)') {
    return pathname === '/(painel)' || pathname === '/(painel)/index' || pathname === '/';
  }
  return pathname.includes(item.match);
}

function TabSlot({ item, active, onPress }: { item: TabItem; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      className="flex-1 items-center justify-center gap-1"
    >
      <Icon name={item.icon} size={22} color={active ? '#1dd75e' : '#a6a6a6'} />
      <Text
        numberOfLines={1}
        className={`font-body-medium text-[11px] leading-[14px] ${active ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function PanelTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = isMoreRoute(pathname);

  return (
    <View
      style={{
        height: TAB_BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        borderTopWidth: StyleSheet.hairlineWidth,
      }}
      className="flex-row items-stretch border-border bg-card"
    >
      {LEFT_TABS.map((item) => (
        <TabSlot
          key={item.match}
          item={item}
          active={isActive(pathname, item)}
          onPress={() => router.push(item.href)}
        />
      ))}

      <View className="w-16 items-center justify-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Novo evento"
          onPress={() => router.push('/(painel)/events/new')}
          style={{
            width: CENTER_BUTTON_SIZE,
            height: CENTER_BUTTON_SIZE,
            borderRadius: CENTER_BUTTON_SIZE / 2,
            marginTop: -CENTER_BUTTON_SIZE / 3,
          }}
          className="items-center justify-center bg-primary active:opacity-90"
        >
          <Icon name="plus" size={26} color="#0f0f0f" weight="bold" />
        </Pressable>
      </View>

      {RIGHT_TABS.map((item) => (
        <TabSlot
          key={item.match}
          item={item}
          active={isActive(pathname, item)}
          onPress={() => router.push(item.href)}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mais"
        onPress={() => setMoreOpen(true)}
        className="flex-1 items-center justify-center gap-1"
      >
        <Icon name="ellipsis" size={22} color={moreActive ? '#1dd75e' : '#a6a6a6'} />
        <Text
          numberOfLines={1}
          className={`font-body-medium text-[11px] leading-[14px] ${moreActive ? 'text-primary' : 'text-muted-foreground'}`}
        >
          Mais
        </Text>
      </Pressable>

      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
    </View>
  );
}
