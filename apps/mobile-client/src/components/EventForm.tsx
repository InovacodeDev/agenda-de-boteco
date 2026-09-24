import {
  catalogKeys,
  currencyToMask,
  type Event,
  type EventStatus,
  formatEventDate,
  getFriendlyErrorMessage,
  MAX_RECURRENCE_COUNT,
  type OwnedEventInput,
  type OwnedEventRecurrence,
  parseCurrencyBR,
  saveOwnedEvent,
  saveRecurringOwnedEvents,
  shiftDate,
  uploadImage,
  useMusicStylesQuery,
  useOwnedEstablishmentId,
} from '@agenda/core';
import {
  Button,
  DatePickerField,
  Field,
  Icon,
  ImagePickerField,
  ScrollView,
  SelectField,
  SwitchRow,
  Text,
  TextArea,
  TextInput,
  TimePickerField,
  View,
} from '@agenda/shared-ui-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useResponsive } from '../hooks/useResponsive';

const DEFAULT_DURATION_HOURS = 4;
const NO_STYLE = '';

function toLocalIso(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = (time || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function toEndIso(startIso: string): string {
  const end = new Date(startIso);
  end.setHours(end.getHours() + DEFAULT_DURATION_HOURS);
  return end.toISOString();
}

function fromIso(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

export interface EventFormProps {
  event?: Event;
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isTablet } = useResponsive();
  const { data: establishmentId } = useOwnedEstablishmentId();
  const { data: musicStyles = [] } = useMusicStylesQuery();

  const isEditing = Boolean(event);

  const [bannerUrl, setBannerUrl] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [attraction, setAttraction] = useState('');
  const [musicStyleId, setMusicStyleId] = useState(NO_STYLE);
  const [coverCharge, setCoverCharge] = useState('');
  const [capacity, setCapacity] = useState('');
  const [courtesy, setCourtesy] = useState('');
  const [promo, setPromo] = useState('');

  const [repeat, setRepeat] = useState(false);
  const [recurrence, setRecurrence] = useState<OwnedEventRecurrence>({
    frequency: 'weekly',
    count: 4,
  });

  const [busy, setBusy] = useState<EventStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    queueMicrotask(() => {
      const { date: d, time: t } = fromIso(event.starts_at);
      setBannerUrl(event.banner_url || '');
      setName(event.name || '');
      setDate(d);
      setTime(t);
      setDescription(event.description || '');
      setAttraction(event.attraction || '');
      setMusicStyleId(event.music_style_ids[0] ?? NO_STYLE);
      setCoverCharge(event.cover_charge > 0 ? currencyToMask(event.cover_charge) : '');
      setCapacity(event.capacity ? String(event.capacity) : '');
      setCourtesy(event.courtesy || '');
      setPromo(event.promo || '');
    });
  }, [event]);

  const hasName = name.trim().length > 0;
  const hasDate = date.length > 0;
  const canSave = Boolean(establishmentId) && hasName && hasDate;

  const styleOptions = [
    { value: NO_STYLE, label: 'Sem estilo musical específico' },
    ...musicStyles.map((s) => ({
      value: s.id,
      label: s.name,
      emoji: s.emoji,
    })),
  ];

  const lastOccurrence =
    repeat && hasDate
      ? formatEventDate(
          shiftDate(toLocalIso(date, time), recurrence.count - 1, recurrence.frequency),
        )
      : null;

  const handleUpload = async (blob: Blob) => {
    return uploadImage(blob, { pathPrefix: 'events' });
  };

  const handleSave = async (status: EventStatus) => {
    if (!establishmentId || !canSave) return;
    setErrorMessage(null);
    setBusy(status);
    try {
      const startsAt = toLocalIso(date, time);
      const input: OwnedEventInput = {
        name: name.trim(),
        description: description.trim(),
        bannerUrl,
        attraction: attraction.trim(),
        musicStyleIds: musicStyleId === NO_STYLE ? [] : [musicStyleId],
        startsAt,
        endsAt: toEndIso(startsAt),
        coverCharge: parseCurrencyBR(coverCharge),
        capacity: Number(capacity) || null,
        courtesy: courtesy.trim(),
        promo: promo.trim(),
        status,
      };

      if (event) {
        await saveOwnedEvent(establishmentId, input, event.id);
      } else if (repeat) {
        await saveRecurringOwnedEvents(establishmentId, input, recurrence);
      } else {
        await saveOwnedEvent(establishmentId, input);
      }

      await queryClient.invalidateQueries({ queryKey: catalogKeys.events.root });
      router.replace('/(painel)/events');
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err));
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="p-5 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-4xl">
          {event?.recurrence_group_id ? (
            <View className="mb-4 rounded-xl border border-border bg-surface-elevated p-4">
              <Text className="font-body text-muted-foreground text-xs leading-relaxed">
                Este evento faz parte de uma repetição periódica. As alterações salvas valem exclusivamente para esta ocorrência.
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <Text className="font-body text-destructive text-xs leading-relaxed">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View className={isTablet ? 'flex-row gap-6' : 'flex-col gap-6'}>
            {/* Coluna 1 / Principal */}
            <View className={isTablet ? 'flex-1 flex-col gap-5' : 'flex-col gap-5'}>
              <ImagePickerField
                label="Banner do Evento"
                value={bannerUrl}
                onChange={setBannerUrl}
                onUpload={handleUpload}
                aspect={[16, 9]}
              />

              <Field label="Nome do Evento" required>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Sexta do Samba & Chopp"
                />
              </Field>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Data" required>
                    <DatePickerField value={date} onValueChange={setDate} />
                  </Field>
                </View>
                <View className="w-32">
                  <Field label="Horário">
                    <TimePickerField value={time} onValueChange={setTime} />
                  </Field>
                </View>
              </View>

              <Field label="Descrição">
                <TextArea
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Conte os detalhes do evento, promoções e atrações…"
                  rows={4}
                />
              </Field>
            </View>

            {/* Coluna 2 / Detalhes e Recorrência */}
            <View className={isTablet ? 'flex-1 flex-col gap-5' : 'flex-col gap-5'}>
              <Field label="Atração Principal">
                <TextInput
                  value={attraction}
                  onChangeText={setAttraction}
                  placeholder="Nome da banda, DJ ou artista"
                />
              </Field>

              <Field label="Estilo Musical">
                <SelectField
                  value={musicStyleId}
                  onValueChange={setMusicStyleId}
                  options={styleOptions}
                  searchable
                  placeholder="Selecione o estilo…"
                />
              </Field>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Entrada (R$)">
                    <TextInput
                      type="currency"
                      value={coverCharge}
                      onChangeText={setCoverCharge}
                      placeholder="0,00"
                    />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label="Capacidade">
                    <TextInput
                      keyboardType="number-pad"
                      value={capacity}
                      onChangeText={setCapacity}
                      placeholder="Ex: 150"
                    />
                  </Field>
                </View>
              </View>

              <Field label="Cortesia">
                <TextInput
                  value={courtesy}
                  onChangeText={setCourtesy}
                  placeholder="Ex: Mulheres free até 21h"
                />
              </Field>

              <Field label="Promoção Especial">
                <TextInput
                  value={promo}
                  onChangeText={setPromo}
                  placeholder="Ex: Chopp duplo até 20h"
                />
              </Field>

              {!isEditing ? (
                <View className="rounded-2xl border border-border bg-card p-4">
                  <SwitchRow
                    label="Repetir este evento"
                    description="Para agendas fixas, como a noite de sertanejo de toda quinta."
                    checked={repeat}
                    onCheckedChange={setRepeat}
                  />

                  {repeat ? (
                    <View className="mt-4 flex-col gap-4 border-t border-border/60 pt-4">
                      <Field label="Frequência de Repetição">
                        <SelectField
                          value={recurrence.frequency}
                          onValueChange={(v) =>
                            setRecurrence((curr: OwnedEventRecurrence) => ({
                              ...curr,
                              frequency: v === 'monthly' ? 'monthly' : 'weekly',
                            }))
                          }
                          options={[
                            { value: 'weekly', label: 'Toda semana' },
                            { value: 'monthly', label: 'Todo mês' },
                          ]}
                        />
                      </Field>

                      <Field label={`Ocorrências (até ${MAX_RECURRENCE_COUNT})`}>
                        <TextInput
                          keyboardType="number-pad"
                          value={String(recurrence.count)}
                          onChangeText={(v) => {
                            const num = Math.min(Math.max(Number(v) || 1, 1), MAX_RECURRENCE_COUNT);
                            setRecurrence((curr: OwnedEventRecurrence) => ({ ...curr, count: num }));
                          }}
                        />
                      </Field>

                      <View className="rounded-xl bg-surface p-3">
                        <Text className="font-body text-muted-foreground text-xs leading-relaxed">
                          Serão criados{' '}
                          <Text className="font-body-bold text-foreground">
                            {recurrence.count} eventos
                          </Text>
                          {lastOccurrence ? `, o último em ${lastOccurrence}.` : '.'}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          {/* Botões de Ação */}
          <View className="mt-8 flex-row items-center justify-end gap-3 border-t border-border pt-6">
            <Button
              label="Salvar rascunho"
              variant="outline"
              disabled={!canSave || busy !== null}
              busy={busy === 'draft'}
              icon={<Icon name="floppy" size={16} color="#fafafa" />}
              onPress={() => handleSave('draft')}
              className="flex-1"
            />
            <Button
              label="Publicar evento"
              variant="solid"
              disabled={!canSave || busy !== null}
              busy={busy === 'published'}
              icon={<Icon name="upload" size={16} color="#0f0f0f" weight="bold" />}
              onPress={() => handleSave('published')}
              className="flex-1"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
