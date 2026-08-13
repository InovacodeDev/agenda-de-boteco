'use client';

import {
  catalogKeys,
  type Event,
  type EventStatus,
  formatEventDate,
  getFriendlyErrorMessage,
  MAX_RECURRENCE_COUNT,
  type OwnedEventInput,
  type OwnedEventRecurrence,
  saveOwnedEvent,
  saveRecurringOwnedEvents,
  shiftDate,
  useMusicStylesQuery,
} from '@agenda/core';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ImageDrop } from '@/components/ui/ImageDrop';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { useOwnedEstablishmentId } from '@/hooks/use-owned-establishment';

/**
 * Duração padrão de um evento de bar. O formulário da especificação não tem
 * campo de fim, mas `ends_at` é NOT NULL no banco — então o fim é derivado do
 * início. 4h cobre o happy hour e a noite de show típicos; o dono não precisa
 * declarar quando a festa acaba para publicar a agenda.
 */
const DEFAULT_DURATION_HOURS = 4;

/** Estilo musical é select simples na spec, mas a coluna é um array. */
const NO_STYLE = '';

interface EventDraft {
  bannerUrl: string;
  name: string;
  /** 'YYYY-MM-DD' — valor cru do <input type="date">. */
  date: string;
  /** 'HH:MM' — valor cru do <input type="time">; vazio = 00:00. */
  time: string;
  description: string;
  attraction: string;
  musicStyleId: string;
  coverCharge: string;
  capacity: string;
  courtesy: string;
  promo: string;
}

const EMPTY_DRAFT: EventDraft = {
  bannerUrl: '',
  name: '',
  date: '',
  time: '',
  description: '',
  attraction: '',
  musicStyleId: NO_STYLE,
  coverCharge: '',
  capacity: '',
  courtesy: '',
  promo: '',
};

/**
 * Junta data e hora locais em ISO com offset, que é o que o schema exige
 * (`.datetime({ offset: true })`). O construtor `new Date(ano, mês, dia, h, m)`
 * interpreta os números no fuso do navegador, e `toISOString()` devolve o mesmo
 * instante em UTC — sufixo 'Z', um offset válido. 22:00 em Florianópolis grava
 * 01:00Z do dia seguinte e volta a ser exibido como 22:00 pelo `formatTime`,
 * que também lê no fuso local. Montar a string à mão (`${date}T${time}:00`)
 * seria interpretado como UTC pelo Date e deslocaria o horário do dono em 3h.
 */
function toLocalIso(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = (time || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

/** Início + DEFAULT_DURATION_HOURS, em ISO com offset. */
function toEndIso(startIso: string): string {
  const end = new Date(startIso);
  end.setHours(end.getHours() + DEFAULT_DURATION_HOURS);
  return end.toISOString();
}

/** ISO gravado → os dois valores locais que os inputs date/time esperam. */
function fromIso(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

function toInput(draft: EventDraft, status: EventStatus): OwnedEventInput {
  const startsAt = toLocalIso(draft.date, draft.time);
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    bannerUrl: draft.bannerUrl,
    attraction: draft.attraction.trim(),
    musicStyleIds: draft.musicStyleId === NO_STYLE ? [] : [draft.musicStyleId],
    startsAt,
    endsAt: toEndIso(startsAt),
    // Vírgula aceita: o placeholder é "0,00" e o teclado do dono é pt-BR.
    coverCharge: Number(draft.coverCharge.replace(',', '.')) || 0,
    capacity: Number(draft.capacity) || null,
    courtesy: draft.courtesy.trim(),
    promo: draft.promo.trim(),
    status,
  };
}

export function EventForm({ event }: { event?: Event }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: establishmentId } = useOwnedEstablishmentId();
  const { data: musicStyles = [] } = useMusicStylesQuery();

  const isEditing = Boolean(event);

  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  const [repeat, setRepeat] = useState(false);
  const [recurrence, setRecurrence] = useState<OwnedEventRecurrence>({
    frequency: 'weekly',
    count: 4,
  });
  const [busy, setBusy] = useState<EventStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preenche o formulário quando o evento chega do servidor (modo edição).
  // queueMicrotask evita o setState síncrono no efeito (AGENTS.md §5).
  useEffect(() => {
    if (!event) return;
    queueMicrotask(() => {
      const { date, time } = fromIso(event.starts_at);
      setDraft({
        bannerUrl: event.banner_url,
        name: event.name,
        date,
        time,
        description: event.description,
        attraction: event.attraction,
        musicStyleId: event.music_style_ids[0] ?? NO_STYLE,
        coverCharge: event.cover_charge > 0 ? String(event.cover_charge) : '',
        capacity: event.capacity ? String(event.capacity) : '',
        courtesy: event.courtesy ?? '',
        promo: event.promo ?? '',
      });
    });
  }, [event]);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setErrorMessage(null);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const hasName = draft.name.trim().length > 0;
  // A data é exigida até no rascunho: `starts_at` é NOT NULL no banco, e uma
  // data-sentinela (1970) apareceria como evento real na agenda do dono.
  const hasDate = draft.date.length > 0;
  const canSave = Boolean(establishmentId) && hasName && hasDate;

  const blockedReason = !hasName
    ? 'Dê um nome ao evento para salvar.'
    : !hasDate
      ? 'Escolha a data do evento para salvar.'
      : null;

  // Última ocorrência da série, para o dono ver o horizonte antes de gerar N
  // linhas. shiftDate é o mesmo helper que o core usa ao gravar, então a prévia
  // não pode divergir do resultado. formatEventDate e não formatRelativeDay: a
  // última ocorrência de uma série semanal longa cai meses à frente, e um
  // 'Amanhã' ou um dia da semana solto não diz ao dono até onde a série vai.
  const lastOccurrence =
    repeat && hasDate
      ? formatEventDate(
          shiftDate(
            toLocalIso(draft.date, draft.time),
            recurrence.count - 1,
            recurrence.frequency,
          ),
        )
      : null;

  const handleSave = async (status: EventStatus) => {
    if (!establishmentId || !canSave) return;
    setErrorMessage(null);
    setBusy(status);
    try {
      const input = toInput(draft, status);
      if (event) {
        await saveOwnedEvent(establishmentId, input, event.id);
      } else if (repeat) {
        await saveRecurringOwnedEvents(establishmentId, input, recurrence);
      } else {
        await saveOwnedEvent(establishmentId, input);
      }
      // Prefixo 'events' cobre owned, detail e byEstablishment de uma vez.
      await queryClient.invalidateQueries({ queryKey: catalogKeys.events.root });
      router.push('/eventos');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
      setBusy(null);
    }
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mx-auto flex w-full max-w-4xl flex-col gap-6"
    >
      <header>
        <h1 className="font-heading text-foreground text-2xl font-bold">
          {isEditing ? 'Editar evento' : 'Novo evento'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rascunhos ficam só para você; eventos publicados aparecem no app dos usuários.
        </p>
      </header>

      {event?.recurrence_group_id ? (
        <p
          role="status"
          className="border-border bg-surface-elevated text-muted-foreground rounded-2xl border p-4 text-[13px]"
        >
          Este evento faz parte de uma repetição. As alterações valem só para esta ocorrência.
        </p>
      ) : null}

      <section
        aria-label="Dados do evento"
        className="shadow-card border-border bg-card flex flex-col gap-5 rounded-2xl border p-7"
      >
        <ImageDrop
          label="Banner do evento"
          value={draft.bannerUrl}
          onChange={(url) => set('bannerUrl', url)}
          className="h-[200px]"
        />

        <Field label="Nome do evento *">
          <TextInput
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex: Sexta do Sertanejo"
          />
        </Field>

        <div className="grid grid-cols-2 gap-6">
          <Field label="Data *">
            <TextInput
              type="date"
              value={draft.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </Field>

          <Field label="Horário">
            <TextInput
              type="time"
              value={draft.time}
              onChange={(e) => set('time', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Descrição">
          <TextArea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Conte o que vai rolar nesse evento..."
            rows={4}
          />
        </Field>

        <div className="grid grid-cols-2 gap-6">
          <Field label="Atração principal">
            <TextInput
              value={draft.attraction}
              onChange={(e) => set('attraction', e.target.value)}
              placeholder="Banda, DJ, artista..."
            />
          </Field>

          <Field label="Estilo musical">
            <Select
              value={draft.musicStyleId}
              onChange={(e) => set('musicStyleId', e.target.value)}
            >
              <option value={NO_STYLE}>Selecione</option>
              {musicStyles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.emoji} {style.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Field label="Entrada (R$)">
            <TextInput
              inputMode="decimal"
              value={draft.coverCharge}
              onChange={(e) => set('coverCharge', e.target.value)}
              placeholder="0,00"
            />
          </Field>

          <Field label="Capacidade">
            <TextInput
              type="number"
              min={1}
              value={draft.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              placeholder="Ex: 200"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Field label="Cortesia">
            <TextInput
              value={draft.courtesy}
              onChange={(e) => set('courtesy', e.target.value)}
              placeholder="Ex: Mulheres free"
            />
          </Field>

          <Field label="Promoção">
            <TextInput
              value={draft.promo}
              onChange={(e) => set('promo', e.target.value)}
              placeholder="Ex: Chopp em dobro até 22h"
            />
          </Field>
        </div>
      </section>

      {/* Recorrência só na criação: editar uma ocorrência não recria a série. */}
      {isEditing ? null : (
        <section
          aria-label="Repetição"
          className="shadow-card border-border bg-card flex flex-col gap-5 rounded-2xl border p-7"
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
              className="accent-primary h-4 w-4"
            />
            <span className="text-foreground text-sm font-medium">Repetir este evento</span>
          </label>

          {repeat ? (
            <>
              <div className="grid grid-cols-2 gap-6">
                <Field label="Frequência">
                  <Select
                    value={recurrence.frequency}
                    onChange={(e) =>
                      setRecurrence((current) => ({
                        ...current,
                        frequency: e.target.value === 'monthly' ? 'monthly' : 'weekly',
                      }))
                    }
                  >
                    <option value="weekly">Toda semana</option>
                    <option value="monthly">Todo mês</option>
                  </Select>
                </Field>

                <Field label={`Ocorrências (até ${MAX_RECURRENCE_COUNT})`}>
                  <TextInput
                    type="number"
                    min={1}
                    max={MAX_RECURRENCE_COUNT}
                    value={recurrence.count}
                    onChange={(e) =>
                      setRecurrence((current) => ({
                        ...current,
                        count: Math.min(
                          Math.max(Number(e.target.value) || 1, 1),
                          MAX_RECURRENCE_COUNT,
                        ),
                      }))
                    }
                  />
                </Field>
              </div>

              {/* O dono precisa saber que está criando N eventos, não um. */}
              <p className="text-muted-foreground text-[13px]">
                {lastOccurrence
                  ? // formatEventDate já termina em ponto ('Sex., 4 de set.'), então a
                    // frase não acrescenta outro — senão sai 'set..'.
                    `Serão criados ${recurrence.count} eventos, o último em ${lastOccurrence}`
                  : `Serão criados ${recurrence.count} eventos. Escolha a data para ver a última ocorrência.`}
              </p>
            </>
          ) : null}
        </section>
      )}

      <div className="flex items-center justify-end gap-4">
        {errorMessage ? (
          <p className="text-destructive flex-1 text-[13px]">{errorMessage}</p>
        ) : blockedReason ? (
          <p className="text-muted-foreground flex-1 text-[13px]">{blockedReason}</p>
        ) : null}

        <Button variant="ghost" onClick={() => router.push('/eventos')} disabled={busy !== null}>
          Cancelar
        </Button>
        <Button
          variant="ghost"
          onClick={() => void handleSave('draft')}
          disabled={!canSave || busy !== null}
        >
          {busy === 'draft' ? 'Salvando…' : 'Salvar rascunho'}
        </Button>
        <Button onClick={() => void handleSave('published')} disabled={!canSave || busy !== null}>
          {busy === 'published' ? 'Publicando…' : 'Publicar evento'}
        </Button>
      </div>
    </form>
  );
}
