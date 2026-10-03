import {
  catalogKeys,
  createOwnedEstablishment,
  ESTABLISHMENT_ATTRIBUTES,
  type EstablishmentAttribute,
  getFriendlyErrorMessage,
  isCurrentUserEstablishmentOwner,
  listCities,
  maskPhoneBR,
  PRICE_RANGE_LABELS,
  signOut,
  uploadImage,
  useAuthStore,
} from '@agenda/core';
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  ImagePickerField,
  Pressable,
  Screen,
  ScreenHeader,
  ScrollView,
  SelectField,
  Text,
  TextArea,
  TextInput,
  View,
} from '@agenda/shared-ui-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

const STEPS = ['Identidade', 'Localização & Contato', 'Operação'] as const;

const AMBIANCES = [
  { value: 'Boteco tradicional', label: 'Boteco tradicional' },
  { value: 'Pub', label: 'Pub' },
  { value: 'Bar moderno', label: 'Bar moderno' },
  { value: 'Restaurante-bar', label: 'Restaurante-bar' },
  { value: 'Cervejaria', label: 'Cervejaria' },
  { value: 'Choperia', label: 'Choperia' },
  { value: 'Casa de shows', label: 'Casa de shows' },
  { value: 'Lounge', label: 'Lounge' },
];

const PRICE_RANGES = Object.entries(PRICE_RANGE_LABELS).map(([value, label]) => ({
  value,
  label: `${value} - ${label}`,
}));

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [cityId, setCityId] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');

  const [openingHours, setOpeningHours] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [ambiance, setAmbiance] = useState('');
  const [menuUrl, setMenuUrl] = useState('');
  const [attributes, setAttributes] = useState<EstablishmentAttribute[]>([]);

  const { data: cities = [] } = useQuery({
    queryKey: catalogKeys.cities,
    queryFn: listCities,
  });

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: `${c.name} - ${c.uf}`,
  }));

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
    step === 0 ? name.trim().length > 0 : step === 1 ? Boolean(cityId) : true;

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

  const toggleAttribute = (attrId: EstablishmentAttribute) => {
    setAttributes((curr) =>
      curr.includes(attrId) ? curr.filter((id) => id !== attrId) : [...curr, attrId],
    );
  };

  const handleFinish = async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await createOwnedEstablishment({
        name: name.trim(),
        description: description.trim(),
        logoUrl,
        coverUrl,
        cityId,
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
        openingHours: openingHours.trim(),
        priceRange,
        ambiance,
        menuUrl: menuUrl.trim(),
        attributes,
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
            className="h-9 px-2 text-xs"
          />
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-5 py-6"
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
                <Text className="font-body text-destructive text-xs leading-relaxed">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {step === 0 ? (
              <View className="flex-col gap-5">
                <Field label="Nome do bar ou boteco" required>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Bar do Zé"
                  />
                </Field>

                <Field label="Descrição curta" helperText="Conte um pouco sobre o clima e a proposta do local.">
                  <TextArea
                    value={description}
                    onChangeText={setDescription}
                    placeholder="O melhor boteco de samba e chopp gelado da região…"
                    rows={3}
                  />
                </Field>

                <ImagePickerField
                  label="Logotipo do Bar"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  onUpload={handleUpload}
                  aspect={[1, 1]}
                />

                <ImagePickerField
                  label="Foto de Capa do Perfil"
                  value={coverUrl}
                  onChange={setCoverUrl}
                  onUpload={handleUpload}
                  aspect={[16, 9]}
                />
              </View>
            ) : step === 1 ? (
              <View className="flex-col gap-5">
                <Field label="Cidade" required helperText="Onde seu estabelecimento está localizado.">
                  <SelectField
                    value={cityId}
                    onValueChange={setCityId}
                    options={cityOptions}
                    placeholder="Selecione a cidade…"
                    searchable
                    searchPlaceholder="Buscar cidade…"
                  />
                </Field>

                <Field label="Bairro">
                  <TextInput
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    placeholder="Ex: Centro"
                  />
                </Field>

                <Field label="Endereço completo">
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Rua, número e complemento"
                  />
                </Field>

                <Field label="WhatsApp de contato">
                  <TextInput
                    keyboardType="phone-pad"
                    value={whatsapp}
                    onChangeText={(val) => setWhatsapp(maskPhoneBR(val))}
                    placeholder="(00) 00000-0000"
                  />
                </Field>

                <Field label="Instagram">
                  <TextInput
                    autoCapitalize="none"
                    value={instagram}
                    onChangeText={setInstagram}
                    placeholder="@seubar"
                  />
                </Field>
              </View>
            ) : (
              <View className="flex-col gap-5">
                <Field label="Horário de funcionamento">
                  <TextInput
                    value={openingHours}
                    onChangeText={setOpeningHours}
                    placeholder="Ex: Ter a Dom das 18h às 02h"
                  />
                </Field>

                <Field label="Faixa de preço">
                  <SelectField
                    value={priceRange}
                    onValueChange={setPriceRange}
                    options={PRICE_RANGES}
                    placeholder="Selecione a faixa de preço…"
                  />
                </Field>

                <Field label="Tipo de ambiente">
                  <SelectField
                    value={ambiance}
                    onValueChange={setAmbiance}
                    options={AMBIANCES}
                    placeholder="Selecione o ambiente…"
                  />
                </Field>

                <Field label="Link do Cardápio Digital (opcional)">
                  <TextInput
                    autoCapitalize="none"
                    value={menuUrl}
                    onChangeText={setMenuUrl}
                    placeholder="https://meucardapio.com.br"
                  />
                </Field>

                <Field label="Diferenciais e Atributos">
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    {ESTABLISHMENT_ATTRIBUTES.map((attr) => {
                      const selected = attributes.includes(attr.id);
                      return (
                        <Pressable
                          key={attr.id}
                          onPress={() => toggleAttribute(attr.id)}
                        >
                          <Badge
                            label={attr.label}
                            variant={selected ? 'published' : 'muted'}
                            className="px-3 py-1.5"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>
              </View>
            )}

            <View className="mt-8 flex-row items-center justify-end gap-3">
              {step > 0 ? (
                <Button
                  label="Voltar"
                  variant="outline"
                  onPress={handleBack}
                  className="flex-1"
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
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Deseja sair do cadastro?"
        message="Se sair agora, o cadastro do estabelecimento precisará ser preenchido novamente ao entrar."
        confirmLabel="Sair da conta"
        cancelLabel="Continuar preenchendo"
        destructive
        onConfirm={async () => {
          setConfirmSignOut(false);
          await signOut();
          router.replace('/login');
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
