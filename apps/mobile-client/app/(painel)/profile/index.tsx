import {
  catalogKeys,
  getFriendlyErrorMessage,
  maskPhoneBR,
  type PriceRange,
  updateOwnedEstablishment,
  uploadImage,
  useOwnedEstablishment,
} from '@agenda/core';
import {
  Button,
  Card,
  Icon,
  Screen,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';

import {
  EMPTY_DRAFT,
  type EstablishmentDraft,
  IdentityFields,
  LocationFields,
  OperationFields,
} from '@/components/EstablishmentFields';
import { useResponsive } from '@/hooks/useResponsive';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { isTablet } = useResponsive();
  const { data: establishment, isPending } = useOwnedEstablishment();

  const [draft, setDraft] = useState<EstablishmentDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setField: <K extends keyof EstablishmentDraft>(
    key: K,
    value: EstablishmentDraft[K],
  ) => void = (key, value) => {
    setSavedSuccess(false);
    setDraft((curr) => ({ ...curr, [key]: value }));
  };

  useEffect(() => {
    if (!establishment) return;
    queueMicrotask(() => {
      setDraft({
        name: establishment.name || '',
        description: establishment.description || '',
        logoUrl: establishment.logo_url || '',
        coverUrl: establishment.cover_url || '',
        cityId: establishment.city_id || '',
        address: establishment.address || '',
        neighborhood: establishment.neighborhood || '',
        whatsapp: establishment.whatsapp ? maskPhoneBR(establishment.whatsapp) : '',
        instagram: establishment.instagram || '',
        openingHours: establishment.opening_hours || '',
        priceRange: establishment.price_range || '',
        ambiance: establishment.ambiance || '',
        menuUrl: establishment.menu_pdf_url || '',
        attributes: establishment.attributes || [],
      });
    });
  }, [establishment]);

  const handleUpload = async (blob: Blob) => {
    return uploadImage(blob, { pathPrefix: 'establishments' });
  };

  const canSave =
    Boolean(establishment) && draft.name.trim().length > 0 && Boolean(draft.cityId) && !busy;

  const handleSubmit = async () => {
    if (!establishment || !canSave) return;
    setErrorMessage(null);
    setSavedSuccess(false);
    setBusy(true);
    try {
      await updateOwnedEstablishment(establishment.id, {
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
        priceRange: draft.priceRange as PriceRange,
        ambiance: draft.ambiance,
        menuUrl: draft.menuUrl.trim(),
        attributes: draft.attributes,
      });

      await queryClient.invalidateQueries({
        queryKey: catalogKeys.establishments.detail(establishment.id),
      });

      setSavedSuccess(true);
      Alert.alert('Sucesso', 'Informações do estabelecimento salvas.');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (isPending) {
    return (
      <Screen className="bg-background">
        <ScreenHeader title="Perfil do Estabelecimento" />
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#1dd75e" />
          <Text className="font-body text-muted-foreground mt-3 text-sm">
            Carregando informações…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Perfil do Estabelecimento"
        subtitle="Informações públicas visíveis no aplicativo"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="p-5 gap-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-4xl">
            {errorMessage ? (
              <View className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <Text className="font-body text-destructive text-xs leading-relaxed">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <View className={isTablet ? 'flex-row gap-6' : 'flex-col gap-6'}>
              {/* Coluna 1: Identidade e Mídia */}
              <View className={isTablet ? 'flex-1 flex-col gap-5' : 'flex-col gap-5'}>
                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Identidade Visual
                  </Text>

                  <IdentityFields draft={draft} set={setField} onUpload={handleUpload} />
                </Card>
              </View>

              {/* Coluna 2: Localização e Operação */}
              <View className={isTablet ? 'flex-1 flex-col gap-5' : 'flex-col gap-5'}>
                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Localização & Contato
                  </Text>

                  <LocationFields
                    draft={draft}
                    set={setField}
                    onUpload={handleUpload}
                    onError={setErrorMessage}
                  />
                </Card>

                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Operação e Diferenciais
                  </Text>

                  <OperationFields draft={draft} set={setField} onUpload={handleUpload} />
                </Card>
              </View>
            </View>

            {savedSuccess ? (
              <Text className="font-body text-primary mt-4 text-center text-xs">
                Alterações salvas com sucesso!
              </Text>
            ) : null}

            <View className="mt-6 flex-row items-center justify-end gap-3 border-t border-border pt-5">
              <Button
                label={busy ? 'Salvando…' : 'Salvar alterações'}
                variant="solid"
                disabled={!canSave}
                busy={busy}
                icon={<Icon name="floppy" size={16} color="#0f0f0f" weight="bold" />}
                onPress={handleSubmit}
                className="flex-1 max-w-xs"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
