'use client';

import {
  deleteEstablishment,
  type Establishment,
  type EstablishmentWriteInput,
  establishmentWriteSchema,
  type MenuItem,
  PRICE_RANGE_LABELS,
  type PriceRange,
  upsertEstablishment,
  useCitiesQuery,
  useEstablishmentsQuery,
} from '@agenda/core';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { type Column,DataTable } from '@/components/ui/DataTable';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { TextInput } from '@/components/ui/TextInput';
import { issuesToErrors } from '@/lib/formErrors';

const PRICE_RANGES: PriceRange[] = ['$', '$$', '$$$', '$$$$'];

// ponytail: form em string-only; converte para os tipos do schema no submit.
// menu_items e highlights como textarea (uma linha = um item) — editor de
// linhas dedicado seria over-engineering para um painel admin interno.
type FormState = {
  name: string;
  description: string;
  logo_url: string;
  cover_url: string;
  address: string;
  neighborhood: string;
  city_id: string;
  lat: string;
  lng: string;
  whatsapp: string;
  instagram: string;
  opening_hours: string;
  menu_items: string; // "Nome | 12.50" por linha
  price_range: PriceRange;
  ambiance: string;
  highlights: string; // um por linha
};

const EMPTY: FormState = {
  name: '',
  description: '',
  logo_url: '',
  cover_url: '',
  address: '',
  neighborhood: '',
  city_id: '',
  lat: '',
  lng: '',
  whatsapp: '',
  instagram: '',
  opening_hours: '',
  menu_items: '',
  price_range: '$$',
  ambiance: '',
  highlights: '',
};

function toForm(e: Establishment): FormState {
  return {
    name: e.name,
    description: e.description,
    logo_url: e.logo_url,
    cover_url: e.cover_url,
    address: e.address,
    neighborhood: e.neighborhood,
    city_id: e.city_id,
    lat: String(e.lat),
    lng: String(e.lng),
    whatsapp: e.whatsapp,
    instagram: e.instagram ?? '',
    opening_hours: e.opening_hours,
    menu_items: e.menu_items.map((m) => `${m.name} | ${m.price}`).join('\n'),
    price_range: e.price_range,
    ambiance: e.ambiance,
    highlights: e.highlights.join('\n'),
  };
}

function parseMenu(raw: string): MenuItem[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, price] = line.split('|').map((s) => s.trim());
      return { name: name ?? '', price: Number(price) };
    });
}

function lines(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function EstabelecimentosPage() {
  const qc = useQueryClient();
  const establishments = useEstablishmentsQuery();
  const cities = useCitiesQuery();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cityName = useMemo(() => {
    const map = new Map((cities.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? id;
  }, [cities.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
    setSubmitError(null);
    setOpen(true);
  };

  const openEdit = (row: Establishment) => {
    setEditingId(row.id);
    setForm(toForm(row));
    setErrors({});
    setSubmitError(null);
    setOpen(true);
  };

  const handleDelete = async (row: Establishment) => {
    if (!confirm(`Excluir "${row.name}"?`)) return;
    await deleteEstablishment(row.id);
    await qc.invalidateQueries({ queryKey: ['establishments'] });
  };

  const handleSubmit = async () => {
    const candidate: EstablishmentWriteInput = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name,
      description: form.description,
      logo_url: form.logo_url,
      cover_url: form.cover_url,
      address: form.address,
      neighborhood: form.neighborhood,
      city_id: form.city_id,
      lat: Number(form.lat),
      lng: Number(form.lng),
      whatsapp: form.whatsapp,
      instagram: form.instagram || undefined,
      opening_hours: form.opening_hours,
      menu_items: parseMenu(form.menu_items),
      price_range: form.price_range,
      ambiance: form.ambiance,
      highlights: lines(form.highlights),
    };

    const result = establishmentWriteSchema.safeParse(candidate);
    if (!result.success) {
      setErrors(issuesToErrors(result.error));
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await upsertEstablishment(result.data);
      await qc.invalidateQueries({ queryKey: ['establishments'] });
      setOpen(false);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Establishment>[] = [
    { key: 'name', header: 'Nome', render: (r) => r.name },
    { key: 'neighborhood', header: 'Bairro', render: (r) => r.neighborhood },
    { key: 'city', header: 'Cidade', render: (r) => cityName(r.city_id) },
    { key: 'price', header: 'Faixa', render: (r) => PRICE_RANGE_LABELS[r.price_range] },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Estabelecimentos" onNew={openNew} />

      {establishments.isLoading ? (
        <p className="text-[14px] text-muted-foreground">Carregando…</p>
      ) : establishments.error ? (
        <p className="text-[14px] text-destructive">Erro ao carregar estabelecimentos.</p>
      ) : (establishments.data ?? []).length === 0 ? (
        <p className="text-[14px] text-muted-foreground">Nenhum item ainda.</p>
      ) : (
        <DataTable
          columns={columns}
          rows={establishments.data ?? []}
          onEdit={openEdit}
          onDelete={(r) => void handleDelete(r)}
        />
      )}

      <Modal
        title={editingId ? 'Editar estabelecimento' : 'Novo estabelecimento'}
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
          <Field label="Cidade" error={errors.city_id}>
            <Select
              value={form.city_id}
              onChange={(e) => set('city_id', e.target.value)}
            >
              <option value="">Selecione…</option>
              {(cities.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bairro" error={errors.neighborhood}>
            <TextInput
              value={form.neighborhood}
              onChange={(e) => set('neighborhood', e.target.value)}
            />
          </Field>
          <Field label="Endereço" error={errors.address}>
            <TextInput value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Latitude" error={errors.lat}>
            <TextInput
              type="number"
              value={form.lat}
              onChange={(e) => set('lat', e.target.value)}
            />
          </Field>
          <Field label="Longitude" error={errors.lng}>
            <TextInput
              type="number"
              value={form.lng}
              onChange={(e) => set('lng', e.target.value)}
            />
          </Field>
          <Field label="Logo URL" error={errors.logo_url}>
            <TextInput value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} />
          </Field>
          <Field label="Capa URL" error={errors.cover_url}>
            <TextInput
              value={form.cover_url}
              onChange={(e) => set('cover_url', e.target.value)}
            />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp}>
            <TextInput value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          </Field>
          <Field label="Instagram (opcional)" error={errors.instagram}>
            <TextInput
              value={form.instagram}
              onChange={(e) => set('instagram', e.target.value)}
            />
          </Field>
          <Field label="Horário de funcionamento" error={errors.opening_hours}>
            <TextInput
              value={form.opening_hours}
              onChange={(e) => set('opening_hours', e.target.value)}
            />
          </Field>
          <Field label="Faixa de preço" error={errors.price_range}>
            <Select
              value={form.price_range}
              onChange={(e) => set('price_range', e.target.value as PriceRange)}
            >
              {PRICE_RANGES.map((p) => (
                <option key={p} value={p}>
                  {PRICE_RANGE_LABELS[p]}
                </option>
              ))}
            </Select>
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
            <Field label="Ambiente" error={errors.ambiance}>
              <TextInput
                value={form.ambiance}
                onChange={(e) => set('ambiance', e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Destaques (um por linha)" error={errors.highlights}>
              <TextArea
                value={form.highlights}
                onChange={(e) => set('highlights', e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Cardápio (Nome | preço, um por linha)" error={errors.menu_items}>
              <TextArea
                value={form.menu_items}
                placeholder="Chopp | 12.50"
                onChange={(e) => set('menu_items', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
