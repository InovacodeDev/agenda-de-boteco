import {
  catalogKeys,
  getFriendlyErrorMessage,
  maskPhoneBR,
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
  useToast,
  View,
} from '@agenda/shared-ui-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import {
  EMPTY_DRAFT,
  type EstablishmentDraft,
  IdentityFields,
  LocationFields,
  OperationFields,
} from '@/components/EstablishmentFields';
import { KeyboardAwareBody } from '@/components/KeyboardAwareBody';
import { useResponsive } from '@/hooks/useResponsive';
import { scrollContentClassName } from '@/lib/screenLayout';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isTablet } = useResponsive();
  const { data: establishment, isPending } = useOwnedEstablishment();

  const [draft, setDraft] = useState<EstablishmentDraft>(EMPTY_DRAFT);
  const [savedDraft, setSavedDraft] = useState<EstablishmentDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  const setField: <K extends keyof EstablishmentDraft>(
    key: K,
    value: EstablishmentDraft[K],
  ) => void = (key, value) => {
    setDraft((curr) => ({ ...curr, [key]: value }));
  };

  useEffect(() => {
    if (!establishment) return;
    queueMicrotask(() => {
      const loaded: EstablishmentDraft = {
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
      };
      setDraft(loaded);
      setSavedDraft(loaded);
    });
  }, [establishment]);

  const handleUpload = async (blob: Blob) => {
    return uploadImage(blob, { pathPrefix: 'establishments' });
  };

  /**
   * Mesma regra do web-client: texto comparado com trim() (o submit também
   * apara) e diferenciais como conjunto, sem importar a ordem.
   */
  const isDirty = (Object.keys(draft) as (keyof EstablishmentDraft)[]).some((key) => {
    const current = draft[key];
    const saved = savedDraft[key];
    if (Array.isArray(current) && Array.isArray(saved)) {
      return current.length !== saved.length || current.some((item) => !saved.includes(item));
    }
    return String(current).trim() !== String(saved).trim();
  });

  const canSave =
    Boolean(establishment) &&
    isDirty &&
    draft.name.trim().length > 0 &&
    Boolean(draft.cityId) &&
    !busy;

  const handleSubmit = async () => {
    if (!establishment || !canSave) return;
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
        priceRange: draft.priceRange || null,
        ambiance: draft.ambiance,
        menuUrl: draft.menuUrl.trim(),
        attributes: draft.attributes,
      });

      await queryClient.invalidateQueries({
        queryKey: catalogKeys.establishments.detail(establishment.id),
      });

      setSavedDraft(draft);
      toast.show({ tone: 'success', message: 'Alterações salvas.' });
    } catch (err: unknown) {
      toast.show({ tone: 'error', message: getFriendlyErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (isPending) {
    return (
      <Screen noTopInset noBottomInset>
        <ScreenHeader title="Perfil do estabelecimento" />
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
    <Screen noTopInset noBottomInset>
      <ScreenHeader
        title="Perfil do estabelecimento"
        subtitle="Essas informações aparecem no app dos usuários."
      />

      <KeyboardAwareBody>
        <ScrollView
          contentContainerClassName={scrollContentClassName(isTablet)}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mx-auto w-full max-w-4xl">
            <View className={isTablet ? 'flex-row gap-6' : 'flex-col gap-6'}>
              <View className={isTablet ? 'flex-1 flex-col gap-5' : 'flex-col gap-5'}>
                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Identidade
                  </Text>

                  <IdentityFields draft={draft} set={setField} onUpload={handleUpload} />
                </Card>
              </View>

              <View className={isTablet ? 'flex-1 flex-col gap-5' : 'flex-col gap-5'}>
                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Localização & Contato
                  </Text>

                  <LocationFields
                    draft={draft}
                    set={setField}
                    onUpload={handleUpload}
                    onError={(message) => toast.show({ tone: 'error', message })}
                  />
                </Card>

                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">Operação</Text>

                  <OperationFields draft={draft} set={setField} onUpload={handleUpload} />
                </Card>
              </View>
            </View>

            <View className="border-border mt-6 flex-row items-center justify-end gap-3 border-t pt-5">
              <Button
                label={busy ? 'Salvando…' : 'Salvar alterações'}
                variant="solid"
                disabled={!canSave}
                busy={busy}
                icon={<Icon name="floppy" size={16} color="#0f0f0f" weight="bold" />}
                onPress={handleSubmit}
                className="max-w-xs flex-1"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAwareBody>
    </Screen>
  );
}
