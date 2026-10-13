import {
  ConfirmDialog,
  Icon,
  type IconName,
  Modal,
  Pressable,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { type Href, usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type PanelFlag, usePanelFlags } from '@/hooks/usePanelFlags';
import { signOutAndUnregister } from '@/lib/push';

interface MoreSheetItem {
  href: Href;
  label: string;
  icon: IconName;
  match: string;
  flag?: PanelFlag;
}

const ITEMS: MoreSheetItem[] = [
  { href: '/(painel)/profile', label: 'Perfil do bar', icon: 'store', match: '/profile' },
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

export function isMoreRoute(pathname: string): boolean {
  return ITEMS.some((item) => pathname.includes(item.match));
}

interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function MoreSheet({ visible, onClose }: MoreSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const flags = usePanelFlags();
  const items = ITEMS.filter((item) => !item.flag || flags[item.flag]);

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          className="flex-1 justify-end bg-black/60"
        >
          <Pressable onPress={() => {}} style={{ paddingBottom: insets.bottom + 8 }}>
            <View className="rounded-t-2xl border border-border bg-card pt-3">
              <View className="mb-2 h-1 w-10 self-center rounded-full bg-surface-elevated" />

              {items.map((item) => {
                const active = pathname.includes(item.match);
                return (
                  <Pressable
                    key={item.match}
                    accessibilityRole="button"
                    onPress={() => {
                      onClose();
                      router.push(item.href);
                    }}
                    className={`min-h-12 flex-row items-center gap-3 px-5 py-3 ${
                      active ? 'bg-surface-elevated' : ''
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      size={20}
                      color={active ? '#1dd75e' : '#a6a6a6'}
                    />
                    <Text
                      className={`font-body-medium flex-1 text-sm ${
                        active ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {item.label}
                    </Text>
                    <Icon name="chevron-right" size={18} color="#a6a6a6" />
                  </Pressable>
                );
              })}

              <View className="my-2 border-t border-border" />

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  setConfirmOpen(true);
                }}
                className="min-h-12 flex-row items-center gap-3 px-5 py-3"
              >
                <Icon name="right-from-bracket" size={20} color="#f53d7a" />
                <Text className="font-body-medium flex-1 text-sm text-destructive">Sair</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={confirmOpen}
        title="Sair da conta"
        message="Você precisará entrar novamente para acessar o painel."
        confirmLabel="Sair"
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void signOutAndUnregister();
        }}
      />
    </>
  );
}
