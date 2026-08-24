import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { useActiveCity } from '@/hooks/useActiveCity';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { colors } from '@/theme/colors';
import { headingLetterSpacing } from '@/theme/typography';
import { Pressable, Text, View } from '@/tw';

/**
 * Link para a política de privacidade. Exigido pelas lojas e exibido nos dois
 * estados do perfil — logado e deslogado.
 */
function PrivacyLink({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/privacidade')}
      className={`active:bg-surface/50 flex-row items-center justify-between px-4 py-4 ${className ?? ''}`}
    >
      <View className="flex-row items-center gap-3">
        <Icon name="shield-check" color={colors.primary} size={18} />
        <Text className="font-body-medium text-foreground text-[15px]">
          Política de privacidade
        </Text>
      </View>
      <Icon name="chevron-right" color={colors.mutedForeground} size={16} />
    </Pressable>
  );
}

function SignedOutProfile() {
  const router = useRouter();
  return (
    <View className="flex-1 gap-4 px-8 pt-16">
      <View className="items-center gap-4">
        <View className="bg-surface-elevated h-16 w-16 items-center justify-center rounded-2xl">
          <Icon name="user" variant="regular" color={colors.mutedForeground} size={28} />
        </View>
        <View className="items-center gap-2">
          <Text
            className="font-heading text-foreground text-[20px]"
            style={{ letterSpacing: headingLetterSpacing(20) }}
          >
            Entre na sua conta
          </Text>
          <Text className="font-body text-muted-foreground text-center text-[14px]">
            Para favoritar, avaliar e receber avisos dos bares que você ama.
          </Text>
        </View>
        <Button
          label="Entrar"
          fullWidth
          onPress={() => router.push('/login')}
          className="mt-2"
          style={{ backgroundColor: colors.primary }}
        />
      </View>

      <View className="bg-card mt-2 overflow-hidden rounded-2xl">
        <PrivacyLink />
      </View>
    </View>
  );
}

function SignedInProfile() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const requestAccountDeletion = useAuthStore((state) => state.requestAccountDeletion);
  const router = useRouter();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmSignOut = () => {
    setConfirmVisible(false);
    signOut();
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await requestAccountDeletion();
      setDeleteVisible(false);
    } finally {
      setDeleting(false);
    }
  };

  const eventIds = useFavoritesStore((state) => state.eventIds);
  const establishmentIds = useFavoritesStore((state) => state.establishmentIds);
  const totalFavorites = eventIds.length + establishmentIds.length;

  const city = useActiveCity();

  const name = user?.name || 'Você';
  const email = user?.email || '';
  const firstLetter = name[0].toUpperCase();

  return (
    <View className="flex-1 gap-6 px-4 pt-4">
      <View className="bg-card flex-row items-center gap-4 rounded-2xl p-4">
        <View className="bg-primary/10 border-primary/20 h-16 w-16 items-center justify-center rounded-full border">
          <Text className="font-heading text-primary text-[28px]">{firstLetter}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-body-semibold text-foreground text-[18px]" numberOfLines={1}>
            {name}
          </Text>
          {email ? (
            <Text className="font-body text-muted-foreground text-[13px]" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="bg-card flex-1 items-center justify-center gap-1 rounded-2xl p-4">
          <Text className="font-heading text-foreground text-[20px]">{totalFavorites}</Text>
          <Text className="font-body text-muted-foreground text-[12px]">Favoritos</Text>
        </View>
        <View className="bg-card flex-1 items-center justify-center gap-1 rounded-2xl p-4">
          <Text className="font-heading text-foreground text-[20px]" numberOfLines={1}>
            {city?.name ?? '…'}
          </Text>
          <Text className="font-body text-muted-foreground text-[12px]">Cidade</Text>
        </View>
        <View className="bg-card flex-1 items-center justify-center gap-1 rounded-2xl p-4">
          <Text className="font-heading text-foreground text-[20px]">0</Text>
          <Text className="font-body text-muted-foreground text-[12px]">Reviews</Text>
        </View>
      </View>

      <View className="bg-card overflow-hidden rounded-2xl">
        <Pressable
          onPress={() => router.push('/favorites')}
          className="border-border active:bg-surface/50 flex-row items-center justify-between border-b px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <Icon name="heart" variant="solid" color={colors.primary} size={18} />
            <Text className="font-body-medium text-foreground text-[15px]">Meus favoritos</Text>
          </View>
          <Icon name="chevron-right" color={colors.mutedForeground} size={16} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/city')}
          className="border-border active:bg-surface/50 flex-row items-center justify-between border-b px-4 py-4"
        >
          <View className="flex-row items-center gap-3">
            <Icon name="location-dot" color={colors.primary} size={18} />
            <Text className="font-body-medium text-foreground text-[15px]">Mudar cidade</Text>
          </View>
          <Icon name="chevron-right" color={colors.mutedForeground} size={16} />
        </Pressable>

        <PrivacyLink />
      </View>

      <View className="flex-1" />

      <View className="mb-4 gap-3">
        <Pressable
          onPress={() => setConfirmVisible(true)}
          className="border-destructive/20 active:bg-destructive/10 h-12 w-full flex-row items-center justify-center gap-2 rounded-xl border bg-transparent"
        >
          <Icon name="right-from-bracket" color={colors.destructive} size={16} />
          <Text className="font-body-semibold text-destructive text-[15px]">Sair</Text>
        </Pressable>

        <Pressable
          onPress={() => setDeleteVisible(true)}
          className="active:bg-surface/50 h-12 w-full flex-row items-center justify-center gap-2 rounded-xl bg-transparent"
        >
          <Icon name="trash-can" variant="regular" color={colors.mutedForeground} size={16} />
          <Text className="font-body-medium text-muted-foreground text-[14px]">Excluir conta</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmVisible}
        destructive
        title="Sair da conta?"
        message="Você precisará entrar novamente para favoritar e receber avisos."
        confirmLabel="Sair"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleConfirmSignOut}
      />

      <ConfirmDialog
        visible={deleteVisible}
        destructive
        title="Excluir sua conta?"
        message="Esta ação é permanente. Você será desconectado agora e sua conta e favoritos sincronizados serão apagados em até 1 hora, sem possibilidade de recuperação."
        confirmLabel={deleting ? 'Processando…' : 'Excluir conta'}
        cancelLabel="Cancelar"
        onCancel={() => {
          if (!deleting) {
            setDeleteVisible(false);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const status = useAuthStore((state) => state.status);

  return (
    <Screen header={<ScreenHeader title="Perfil" showLogo />}>
      {status === 'signedIn' ? <SignedInProfile /> : <SignedOutProfile />}
    </Screen>
  );
}
