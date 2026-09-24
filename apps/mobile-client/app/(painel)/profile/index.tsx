import {
  catalogKeys,
  ESTABLISHMENT_ATTRIBUTES,
  type EstablishmentAttribute,
  getFriendlyErrorMessage,
  listCities,
  maskPhoneBR,
  PRICE_RANGE_LABELS,
  type PriceRange,
  updateOwnedEstablishment,
  uploadImage,
  useOwnedEstablishment,
} from '@agenda/core';
import {
  Badge,
  Button,
  Card,
  Field,
  Icon,
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
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

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

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { isTablet } = useResponsive();
  const { data: establishment, isPending } = useOwnedEstablishment();

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

  const [busy, setBusy] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: cities = [] } = useQuery({
    queryKey: catalogKeys.cities,
    queryFn: listCities,
  });

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: `${c.name} - ${c.uf}`,
  }));

  useEffect(() => {
    if (!establishment) return;
    queueMicrotask(() => {
      setName(establishment.name || '');
      setDescription(establishment.description || '');
      setLogoUrl(establishment.logo_url || '');
      setCoverUrl(establishment.cover_url || '');
      setCityId(establishment.city_id || '');
      setAddress(establishment.address || '');
      setNeighborhood(establishment.neighborhood || '');
      setWhatsapp(establishment.whatsapp ? maskPhoneBR(establishment.whatsapp) : '');
      setInstagram(establishment.instagram || '');
      setOpeningHours(establishment.opening_hours || '');
      setPriceRange(establishment.price_range || '');
      setAmbiance(establishment.ambiance || '');
      setMenuUrl(establishment.menu_pdf_url || '');
      setAttributes(establishment.attributes || []);
    });
  }, [establishment]);

  const toggleAttribute = (attrId: EstablishmentAttribute) => {
    setSavedSuccess(false);
    setAttributes((curr) =>
      curr.includes(attrId) ? curr.filter((id) => id !== attrId) : [...curr, attrId],
    );
  };

  const handleUpload = async (blob: Blob) => {
    return uploadImage(blob, { pathPrefix: 'establishments' });
  };

  const canSave =
    Boolean(establishment) && name.trim().length > 0 && Boolean(cityId) && !busy;

  const handleSubmit = async () => {
    if (!establishment || !canSave) return;
    setErrorMessage(null);
    setSavedSuccess(false);
    setBusy(true);
    try {
      await updateOwnedEstablishment(establishment.id, {
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
        priceRange: priceRange as PriceRange,
        ambiance,
        menuUrl: menuUrl.trim(),
        attributes,
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

                  <ImagePickerField
                    label="Logotipo do Bar"
                    value={logoUrl}
                    onChange={(url) => {
                      setSavedSuccess(false);
                      setLogoUrl(url);
                    }}
                    onUpload={handleUpload}
                    aspect={[1, 1]}
                  />

                  <ImagePickerField
                    label="Foto de Capa do Perfil"
                    value={coverUrl}
                    onChange={(url) => {
                      setSavedSuccess(false);
                      setCoverUrl(url);
                    }}
                    onUpload={handleUpload}
                    aspect={[16, 9]}
                  />

                  <Field label="Nome do Estabelecimento" required>
                    <TextInput
                      value={name}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setName(val);
                      }}
                      placeholder="Ex: Bar do Zé"
                    />
                  </Field>

                  <Field label="Descrição da Casa">
                    <TextArea
                      value={description}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setDescription(val);
                      }}
                      placeholder="Conte sobre o ambiente, culinária e atrações…"
                      rows={3}
                    />
                  </Field>
                </Card>
              </View>

              {/* Coluna 2: Localização e Operação */}
              <View className={isTablet ? 'flex-1 flex-col gap-5' : 'flex-col gap-5'}>
                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Localização & Contato
                  </Text>

                  <Field label="Cidade" required>
                    <SelectField
                      value={cityId}
                      onValueChange={(val) => {
                        setSavedSuccess(false);
                        setCityId(val);
                      }}
                      options={cityOptions}
                      searchable
                      placeholder="Selecione a cidade…"
                    />
                  </Field>

                  <Field label="Bairro">
                    <TextInput
                      value={neighborhood}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setNeighborhood(val);
                      }}
                      placeholder="Ex: Centro"
                    />
                  </Field>

                  <Field label="Endereço Completo">
                    <TextInput
                      value={address}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setAddress(val);
                      }}
                      placeholder="Rua, número e complemento"
                    />
                  </Field>

                  <Field label="WhatsApp de Contato">
                    <TextInput
                      keyboardType="phone-pad"
                      value={whatsapp}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setWhatsapp(maskPhoneBR(val));
                      }}
                      placeholder="(00) 00000-0000"
                    />
                  </Field>

                  <Field label="Instagram">
                    <TextInput
                      autoCapitalize="none"
                      value={instagram}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setInstagram(val);
                      }}
                      placeholder="@seubar"
                    />
                  </Field>
                </Card>

                <Card className="flex-col gap-4 p-5">
                  <Text className="font-heading text-foreground text-base font-bold">
                    Operação e Diferenciais
                  </Text>

                  <Field label="Horário de Funcionamento">
                    <TextInput
                      value={openingHours}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setOpeningHours(val);
                      }}
                      placeholder="Ex: Ter a Dom das 18h às 02h"
                    />
                  </Field>

                  <Field label="Faixa de Preço">
                    <SelectField
                      value={priceRange}
                      onValueChange={(val) => {
                        setSavedSuccess(false);
                        setPriceRange(val);
                      }}
                      options={PRICE_RANGES}
                      placeholder="Selecione o tíquete médio…"
                    />
                  </Field>

                  <Field label="Tipo de Ambiente">
                    <SelectField
                      value={ambiance}
                      onValueChange={(val) => {
                        setSavedSuccess(false);
                        setAmbiance(val);
                      }}
                      options={AMBIANCES}
                      placeholder="Selecione o ambiente…"
                    />
                  </Field>

                  <Field label="Link do Cardápio Digital">
                    <TextInput
                      autoCapitalize="none"
                      value={menuUrl}
                      onChangeText={(val) => {
                        setSavedSuccess(false);
                        setMenuUrl(val);
                      }}
                      placeholder="https://meucardapio.com.br"
                    />
                  </Field>

                  <Field label="Diferenciais da Casa">
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
