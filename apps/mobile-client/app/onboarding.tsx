import {
  catalogKeys,
  createOwnedEstablishment,
  getFriendlyErrorMessage,
  isCurrentUserEstablishmentOwner,
  uploadImage,
  useAuthStore,
} from '@agenda/core';
import {
  Button,
  ConfirmDialog,
  Screen,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  EMPTY_DRAFT,
  type EstablishmentDraft,
  IdentityFields,
  LocationFields,
  OperationFields,
} from '@/components/EstablishmentFields';
import { KeyboardAwareBody } from '@/components/KeyboardAwareBody';
import { useResponsive } from '@/hooks/useResponsive';
import { signOutAndUnregister } from '@/lib/push';
import { scrollContentClassName } from '@/lib/screenLayout';

const STEPS = ['Identidade', 'Localização & Contato', 'Operação'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const { isTablet } = useResponsive();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [draft, setDraft] = useState<EstablishmentDraft>(EMPTY_DRAFT);

  const setField: <K extends keyof EstablishmentDraft>(
    key: K,
    value: EstablishmentDraft[K],
  ) => void = (key, value) => {
    setDraft((curr) => ({ ...curr, [key]: value }));
  };

  useEffect(() => {
    if (status === 'signedOut' || status === 'unavailable') {
      router.replace('/login');
      return;
    }
    if (status !== 'signedIn') return;
    let active = true;
    void isCurrentUserEstablishmentOwner().then((isOwner) => {
      if (active && !isOwner) router.replace('/login');
    });
    return () => {
      active = false;
    };
  }, [status, router]);

  const stepValid =
    step === 0 ? draft.name.trim().length > 0 : step === 1 ? Boolean(draft.cityId) : true;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      setConfirmSignOut(true);
    }
  };

  const handleFinish = async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await createOwnedEstablishment({
        name: draft.name.trim(),
        description: draft.description.trim(),
        logoUrl: draft.logoUrl,
        coverUrl: draft.coverUrl,
        cityId: draft.cityId,
        address: draft.address.trim(),
        neighborhood: draft.neighborhood.trim(),
        whatsapp: draft.whatsapp.trim(),
        instagram: draft.instagram.trim(),
        openingHours: draft.openingHours.trim(),
        priceRange: draft.priceRange,
        ambiance: draft.ambiance,
        menuUrl: draft.menuUrl.trim(),
        attributes: draft.attributes,
      });
      await queryClient.invalidateQueries({ queryKey: catalogKeys.panel.ownedEstablishmentId });
      router.replace('/(painel)');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (blob: Blob) => {
    return uploadImage(blob, { pathPrefix: 'establishments' });
  };

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Cadastro do Estabelecimento"
        subtitle={`Passo ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
        onBack={handleBack}
        rightAction={
          <Button
            label="Sair"
            variant="ghost"
            onPress={() => setConfirmSignOut(true)}
            className="px-3"
          />
        }
      />

      <KeyboardAwareBody>
        <ScrollView
          contentContainerClassName={scrollContentClassName(isTablet)}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-xl">
            <View className="mb-6 flex-row gap-2">
              {STEPS.map((s, idx) => (
                <View
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${
                    idx <= step ? 'bg-primary' : 'bg-surface-elevated'
                  }`}
                />
              ))}
            </View>

            {errorMessage ? (
              <View className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <Text className="font-body text-destructive text-xs leading-[18px]">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {step === 0 ? (
              <IdentityFields draft={draft} set={setField} onUpload={handleUpload} />
            ) : step === 1 ? (
              <LocationFields
                draft={draft}
                set={setField}
                onUpload={handleUpload}
                onError={setErrorMessage}
              />
            ) : (
              <OperationFields draft={draft} set={setField} onUpload={handleUpload} />
            )}

            <View className="mt-8 flex-row items-center justify-end gap-3">
              {step > 0 ? (
                <Button
                  label="Voltar"
                  variant="outline"
                  onPress={handleBack}
                  className="px-5"
                />
              ) : null}
              <Button
                label={step === STEPS.length - 1 ? 'Concluir cadastro' : 'Continuar'}
                variant="solid"
                disabled={!stepValid}
                busy={busy}
                onPress={handleNext}
                className="flex-1"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAwareBody>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Deseja sair do cadastro?"
        message="Se sair agora, o cadastro do estabelecimento precisará ser preenchido novamente ao entrar."
        confirmLabel="Sair da conta"
        cancelLabel="Continuar preenchendo"
        destructive
        onConfirm={async () => {
          setConfirmSignOut(false);
          await signOutAndUnregister();
          router.replace('/login');
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
