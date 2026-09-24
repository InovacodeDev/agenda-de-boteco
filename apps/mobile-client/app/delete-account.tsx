import { getFriendlyErrorMessage, requestAccountDeletion } from '@agenda/core';
import { Button, ConfirmDialog, Screen, ScreenHeader, ScrollView, Text, View } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await requestAccountDeletion();
      setModalOpen(false);
      router.replace('/login');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Screen className="bg-background">
      <ScreenHeader title="Excluir Conta" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="p-6">
        <View className="mx-auto w-full max-w-lg flex-col gap-6">
          <View className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <Text className="font-heading text-destructive text-lg font-bold">
              Zona de Perigo: Exclusão Definitiva
            </Text>
            <Text className="font-body text-muted-foreground mt-2 text-sm leading-relaxed">
              Ao solicitar a exclusão da sua conta:
            </Text>

            <View className="mt-4 flex-col gap-2.5">
              <Text className="font-body text-foreground text-xs leading-relaxed">
                • Seu acesso de operador a este estabelecimento será cancelado imediatamente.
              </Text>
              <Text className="font-body text-foreground text-xs leading-relaxed">
                • Todos os eventos futuros cadastrados serão retirados do aplicativo público.
              </Text>
              <Text className="font-body text-foreground text-xs leading-relaxed">
                • Seus dados de cadastro serão enfileirados para exclusão irreversível.
              </Text>
            </View>

            {errorMessage ? (
              <Text className="font-body text-destructive mt-4 text-xs">{errorMessage}</Text>
            ) : null}

            <Button
              label="Excluir minha conta definitivamente"
              variant="destructive"
              onPress={() => setModalOpen(true)}
              className="mt-6"
            />
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={modalOpen}
        title="Confirmar exclusão irreversível?"
        message="Esta ação não pode ser desfeita. Todos os dados do estabelecimento e da conta serão excluídos."
        confirmLabel="Sim, excluir conta"
        cancelLabel="Cancelar"
        destructive
        busy={busy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setModalOpen(false)}
      />
    </Screen>
  );
}
