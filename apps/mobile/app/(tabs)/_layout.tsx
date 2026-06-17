import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH } from '@/components/layout/Screen';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { fontFamilies } from '@/theme/typography';

const TAB_BAR_BASE_HEIGHT = 56;

// Web: acompanha o limite de largura do conteúdo (Screen), centralizando a tab
// bar em telas largas em vez de esticá-la de borda a borda.
const tabBarWidthStyle =
  Platform.OS === 'web'
    ? ({ maxWidth: MAX_CONTENT_WIDTH, width: '100%', marginHorizontal: 'auto' } as const)
    : null;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.popover,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          ...tabBarWidthStyle,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fontFamilies.bodyMedium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Icon name="house" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Icon name="location-dot" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => (
            <Icon name="heart" variant="regular" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" variant="regular" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" variant="regular" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
