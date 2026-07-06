'use client';

import {
  deleteEvent,
  type Event,
  type EventWriteInput,
  eventWriteSchema,
  upsertEvent,
  useEstablishmentsQuery,
  useEventsQuery,
  useMusicStylesQuery,
} from '@agenda/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { type Column,DataTable } from '@/components/ui/DataTable';
import { Field } from '@/components/ui/Field';
import { ImageUpload, ImageUploadMulti } from '@/components/ui/ImageUpload';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { issuesToErrors } from '@/lib/formErrors';

// ISO com offset <-> valor do <input type="datetime-local"> ('YYYY-MM-DDTHH:mm').
// O input dá hora local; toISOString() devolve UTC com offset que o schema exige.
function isoToLocal(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Ajusta para fuso local antes de cortar (toISOString seria UTC).
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function localToIso(local: string): string {
  if (!local) return '';
  const d = new Date(local); // interpretado como hora local
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

type FormState = {
  name: string;
  attraction: string;
  description: string;
  banner_url: string;
  photo_urls: string[];
  music_style_ids: string[];
  establishment_id: string;
  starts_at: string; // datetime-local
  ends_at: string; // datetime-local
  cover_charge: string;
  courtesy: string;
  promo: string;
};

const EMPTY: FormState = {
  name: '',
  attraction: '',
  description: '',
  banner_url: '',
  photo_urls: [],
  music_style_ids: [],
  establishment_id: '',
  starts_at: '',
  ends_at: '',
  cover_charge: '0',
  courtesy: '',
  promo: '',
};

function toForm(e: Event): FormState {
  return {
    name: e.name,
    attraction: e.attraction,
    description: e.description,
    banner_url: e.banner_url,
    photo_urls: e.photo_urls,
    music_style_ids: e.music_style_ids,
    establishment_id: e.establishment_id,
    starts_at: isoToLocal(e.starts_at),
    ends_at: isoToLocal(e.ends_at),
    cover_charge: String(e.cover_charge),
    courtesy: e.courtesy ?? '',
    promo: e.promo ?? '',
  };
}

export default function EventosPage() {
  const qc = useQueryClient();
  const events = useEventsQuery();
  const establishments = useEstablishmentsQuery();
  const musicStyles = useMusicStylesQuery();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const estName = useMemo(() => {
    const map = new Map((establishments.data ?? []).map((e) => [e.id, e.name]));
    return (id: string) => map.get(id) ?? id;
  }, [establishments.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleStyle = (id: string) =>
    setForm((f) => ({
      ...f,
      music_style_ids: f.music_style_ids.includes(id)
        ? f.music_style_ids.filter((s) => s !== id)
        : [...f.music_style_ids, id],
    }));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
    setSubmitError(null);
    setOpen(true);
  };

  const openEdit = (row: Event) => {
    setEditingId(row.id);
    setForm(toForm(row));
    setErrors({});
    setSubmitError(null);
    setOpen(true);
  };

  const handleDelete = async (row: Event) => {
    if (!confirm(`Excluir "${row.name}"?`)) return;
    await deleteEvent(row.id);
    await qc.invalidateQueries({ queryKey: ['events'] });
  };

  const handleSubmit = async () => {
    const candidate: EventWriteInput = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name,
      attraction: form.attraction,
      description: form.description,
      banner_url: form.banner_url,
      photo_urls: form.photo_urls,
      music_style_ids: form.music_style_ids,
      establishment_id: form.establishment_id,
      starts_at: localToIso(form.starts_at),
      ends_at: localToIso(form.ends_at),
      cover_charge: Number(form.cover_charge),
      courtesy: form.courtesy || undefined,
      promo: form.promo || undefined,
    };

    const result = eventWriteSchema.safeParse(candidate);
    if (!result.success) {
      setErrors(issuesToErrors(result.error));
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await upsertEvent(result.data);
      await qc.invalidateQueries({ queryKey: ['events'] });
      setOpen(false);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Event>[] = [
    { key: 'name', header: 'Nome', render: (r) => r.name },
    { key: 'attraction', header: 'Atração', render: (r) => r.attraction },
    { key: 'establishment', header: 'Estabelecimento', render: (r) => estName(r.establishment_id) },
    {
      key: 'starts_at',
      header: 'Início',
      render: (r) => new Date(r.starts_at).toLocaleString('pt-BR'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Eventos" onNew={openNew} />

      {events.isLoading ? (
        <p className="text-[14px] text-muted-foreground">Carregando…</p>
      ) : events.error ? (
        <p className="text-[14px] text-destructive">Erro ao carregar eventos.</p>
      ) : (events.data ?? []).length === 0 ? (
        <p className="text-[14px] text-muted-foreground">Nenhum item ainda.</p>
      ) : (
        <DataTable
          columns={columns}
          rows={events.data ?? []}
          onEdit={openEdit}
          onDelete={(r) => void handleDelete(r)}
        />
      )}

      <Modal
        title={editingId ? 'Editar evento' : 'Novo evento'}
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex flex-col gap-3">
            {submitError ? (
              <p className="text-[13px] text-destructive">{submitError}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={saving} onClick={() => void handleSubmit()}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome" error={errors.name}>
            <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Atração" error={errors.attraction}>
            <TextInput
              value={form.attraction}
              onChange={(e) => set('attraction', e.target.value)}
            />
          </Field>
          <Field label="Estabelecimento" error={errors.establishment_id}>
            <Select
              value={form.establishment_id}
              onChange={(e) => set('establishment_id', e.target.value)}
            >
              <option value="">Selecione…</option>
              {(establishments.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Couvert (R$)" error={errors.cover_charge}>
            <TextInput
              type="number"
              min={0}
              value={form.cover_charge}
              onChange={(e) => set('cover_charge', e.target.value)}
            />
          </Field>
          <Field label="Início" error={errors.starts_at}>
            <TextInput
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => set('starts_at', e.target.value)}
            />
          </Field>
          <Field label="Fim" error={errors.ends_at}>
            <TextInput
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => set('ends_at', e.target.value)}
            />
          </Field>
          <Field label="Banner" error={errors.banner_url}>
            <ImageUpload
              value={form.banner_url}
              onChange={(url) => set('banner_url', url)}
              pathPrefix="events"
            />
          </Field>
          <Field label="Cortesia (opcional)" error={errors.courtesy}>
            <TextInput value={form.courtesy} onChange={(e) => set('courtesy', e.target.value)} />
          </Field>
          <Field label="Promo (opcional)" error={errors.promo}>
            <TextInput value={form.promo} onChange={(e) => set('promo', e.target.value)} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Descrição" error={errors.description}>
              <TextArea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Fotos" error={errors.photo_urls}>
              <ImageUploadMulti
                value={form.photo_urls}
                onChange={(urls) => set('photo_urls', urls)}
                pathPrefix="events"
              />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Estilos musicais" error={errors.music_style_ids}>
              <div className="flex flex-wrap gap-2 pt-1">
                {(musicStyles.data ?? []).map((s) => {
                  const checked = form.music_style_ids.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors ${
                        checked
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface-elevated text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStyle(s.id)}
                        className="sr-only"
                      />
                      <span>
                        {s.emoji} {s.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
