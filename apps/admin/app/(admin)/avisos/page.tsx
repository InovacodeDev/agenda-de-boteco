'use client';

import {
  type AppNotification,
  deleteNotification,
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
  type NotificationWriteInput,
  notificationWriteSchema,
  upsertNotification,
  useEstablishmentsQuery,
  useEventsQuery,
  useNotificationsQuery,
} from '@agenda/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { type Column,DataTable } from '@/components/ui/DataTable';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { issuesToErrors } from '@/lib/formErrors';

const TYPES: NotificationType[] = ['style', 'city', 'favorite', 'promo'];

type FormState = {
  title: string;
  body: string;
  type: NotificationType;
  event_id: string;
  establishment_id: string;
};

const EMPTY: FormState = {
  title: '',
  body: '',
  type: 'promo',
  event_id: '',
  establishment_id: '',
};

function toForm(n: AppNotification): FormState {
  return {
    title: n.title,
    body: n.body,
    type: n.type,
    event_id: n.event_id ?? '',
    establishment_id: n.establishment_id ?? '',
  };
}

export default function AvisosPage() {
  const qc = useQueryClient();
  const notifications = useNotificationsQuery();
  const events = useEventsQuery();
  const establishments = useEstablishmentsQuery();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
    setSubmitError(null);
    setOpen(true);
  };

  const openEdit = (row: AppNotification) => {
    setEditingId(row.id);
    setForm(toForm(row));
    setErrors({});
    setSubmitError(null);
    setOpen(true);
  };

  const handleDelete = async (row: AppNotification) => {
    if (!confirm(`Excluir "${row.title}"?`)) return;
    await deleteNotification(row.id);
    await qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const handleSubmit = async () => {
    const candidate: NotificationWriteInput = {
      ...(editingId ? { id: editingId } : {}),
      title: form.title,
      body: form.body,
      type: form.type,
      event_id: form.event_id || undefined,
      establishment_id: form.establishment_id || undefined,
    };

    const result = notificationWriteSchema.safeParse(candidate);
    if (!result.success) {
      setErrors(issuesToErrors(result.error));
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await upsertNotification(result.data);
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      setOpen(false);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AppNotification>[] = [
    { key: 'title', header: 'Título', render: (r) => r.title },
    { key: 'type', header: 'Tipo', render: (r) => NOTIFICATION_TYPE_LABELS[r.type] },
    {
      key: 'created_at',
      header: 'Criado em',
      render: (r) => new Date(r.created_at).toLocaleString('pt-BR'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Avisos" onNew={openNew} />

      {notifications.isLoading ? (
        <p className="text-[14px] text-muted-foreground">Carregando…</p>
      ) : notifications.error ? (
        <p className="text-[14px] text-destructive">Erro ao carregar avisos.</p>
      ) : (notifications.data ?? []).length === 0 ? (
        <p className="text-[14px] text-muted-foreground">Nenhum item ainda.</p>
      ) : (
        <DataTable
          columns={columns}
          rows={notifications.data ?? []}
          onEdit={openEdit}
          onDelete={(r) => void handleDelete(r)}
        />
      )}

      <Modal
        title={editingId ? 'Editar aviso' : 'Novo aviso'}
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
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Título" error={errors.title}>
              <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Mensagem" error={errors.body}>
              <TextArea value={form.body} onChange={(e) => set('body', e.target.value)} />
            </Field>
          </div>
          <Field label="Tipo" error={errors.type}>
            <Select
              value={form.type}
              onChange={(e) => set('type', e.target.value as NotificationType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {NOTIFICATION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Evento (opcional)" error={errors.event_id}>
            <Select
              value={form.event_id}
              onChange={(e) => set('event_id', e.target.value)}
            >
              <option value="">Nenhum</option>
              {(events.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estabelecimento (opcional)" error={errors.establishment_id}>
            <Select
              value={form.establishment_id}
              onChange={(e) => set('establishment_id', e.target.value)}
            >
              <option value="">Nenhum</option>
              {(establishments.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
