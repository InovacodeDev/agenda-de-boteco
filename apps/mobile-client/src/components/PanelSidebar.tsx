import {
  Icon,
  type IconName,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import brandLogo from '@assets/logo.png';
import { type Href, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type PanelFlag, usePanelFlags } from '@/hooks/usePanelFlags';

interface NavItem {
  href: Href;
  label: string;
  icon: IconName;
  match: string;
  flag?: PanelFlag;
}

const NAV: NavItem[] = [
  { href: '/(painel)', label: 'Dashboard', icon: 'squares-four', match: '/(painel)' },
  { href: '/(painel)/events', label: 'Eventos', icon: 'calendar-blank', match: '/events' },
  { href: '/(painel)/artists', label: 'Artistas', icon: 'microphone', match: '/artists' },
  { href: '/(painel)/profile', label: 'Perfil', icon: 'store', match: '/profile' },
  {
    href: '/(painel)/metrics',
    label: 'Métricas',
    icon: 'chart-bar',
    match: '/metrics',
    flag: 'panel-metrics',
  },
  {
    href: '/(painel)/reviews',
    label: 'Avaliações',
    icon: 'star',
    match: '/reviews',
    flag: 'panel-reviews',
  },
  {
    href: '/(painel)/settings',
    label: 'Configurações',
    icon: 'gear',
    match: '/settings',
    flag: 'panel-settings',
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === '/(painel)') {
    return pathname === '/(painel)' || pathname === '/(painel)/index' || pathname === '/';
  }
  return pathname.includes(item.match);
}

export function PanelSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const flags = usePanelFlags();
  const nav = NAV.filter((item) => !item.flag || flags[item.flag]);

  return (
    <View
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
        paddingLeft: insets.left + 16,
      }}
      className="h-full w-64 shrink-0 border-r border-border bg-surface pr-4"
    >
      <View className="mb-8 flex-row items-center gap-3">
        <Image
          source={brandLogo}
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#ffffff' }}
          contentFit="contain"
        />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-heading text-foreground text-base">
            Agenda
          </Text>
          <Text numberOfLines={1} className="font-body text-muted-foreground text-xs">
            de Boteco
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-1 pb-4">

        {nav.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Pressable
              key={item.match}
              onPress={() => router.push(item.href)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`min-h-11 flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                active ? 'bg-primary' : 'active:bg-surface-elevated'
              }`}
            >
              <Icon name={item.icon} size={20} color={active ? '#0f0f0f' : '#a6a6a6'} />
              <Text
                numberOfLines={1}
                className={`font-body-medium min-w-0 flex-1 text-sm ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(painel)/events/new')}
        className="mt-4 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 active:opacity-90"
      >
        <Icon name="plus" size={16} color="#0f0f0f" weight="bold" />
        <Text className="font-body-medium text-primary-foreground text-sm">Novo evento</Text>
      </Pressable>
    </View>
  );
}
