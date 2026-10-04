import { Icon, type IconName, Image, Pressable, Text, View } from '@agenda/shared-ui-mobile';
import brandLogo from '@assets/logo.png';
import { type Href, usePathname, useRouter } from 'expo-router';

interface NavItem {
  href: Href;
  label: string;
  icon: IconName;
  match: string;
}

const NAV: NavItem[] = [
  { href: '/(painel)', label: 'Dashboard', icon: 'squares-four', match: '/(painel)' },
  { href: '/(painel)/events', label: 'Eventos', icon: 'calendar-blank', match: '/events' },
  { href: '/(painel)/artists', label: 'Artistas', icon: 'microphone', match: '/artists' },
  { href: '/(painel)/profile', label: 'Perfil', icon: 'store', match: '/profile' },
  { href: '/(painel)/metrics', label: 'Métricas', icon: 'chart-bar', match: '/metrics' },
  { href: '/(painel)/reviews', label: 'Avaliações', icon: 'star', match: '/reviews' },
  { href: '/(painel)/settings', label: 'Configurações', icon: 'gear', match: '/settings' },
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

  return (
    <View className="h-full w-64 shrink-0 border-r border-border bg-surface p-4">
      <View className="mb-8 flex-row items-center gap-3">
        <Image
          source={brandLogo}
          style={{ width: 44, height: 44, borderRadius: 12 }}
          contentFit="contain"
        />
        <View>
          <Text className="font-heading text-foreground text-base font-bold">Agenda</Text>
          <Text className="font-body text-muted-foreground text-xs">de Boteco</Text>
        </View>
      </View>

      <View className="flex-1 gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Pressable
              key={item.match}
              onPress={() => router.push(item.href)}
              className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                active ? 'bg-primary' : 'active:bg-surface-elevated'
              }`}
            >
              <Icon name={item.icon} size={20} color={active ? '#0f0f0f' : '#a6a6a6'} />
              <Text
                className={`font-body-medium text-sm ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/(painel)/events/new')}
        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 active:opacity-90"
      >
        <Icon name="plus" size={16} color="#0f0f0f" weight="bold" />
        <Text className="font-body-medium text-primary-foreground text-sm">Novo evento</Text>
      </Pressable>
    </View>
  );
}
