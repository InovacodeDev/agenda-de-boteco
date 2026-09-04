'use client';

import { deleteImage, MAX_IMAGE_BYTES, uploadImage } from '@agenda/core';
import { INPUT_CLASS } from '@agenda/shared-ui';
import { useCallback, useRef, useState } from 'react';

// Dropzone + preview para os campos de imagem do catálogo. Sobe o arquivo ao
// bucket catalog-images e devolve a URL pública via onChange. Dropzone nativa
// (<input type=file> + drag events) — sem react-dropzone.

type PendingState = { preview: string } | { error: string } | null;

function validate(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Só imagens são aceitas.';
  if (file.size > MAX_IMAGE_BYTES) return 'Imagem acima de 8MB.';
  return null;
}

// --- Dropzone genérica ------------------------------------------------------

function Dropzone({
  onFiles,
  multiple,
  busy,
  label,
}: {
  onFiles: (files: File[]) => void;
  multiple: boolean;
  busy: boolean;
  label: string;
}) {
  const [dragging, setDragging] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  // <label> nativo: clicar abre o seletor uma única vez, sem .click()
  // programático (que reabria o diálogo duas vezes por reborbulhamento do
  // clique do input aninhado). O label também é acessível por teclado por padrão.
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      className={`relative flex min-h-[7rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-surface-elevated hover:border-primary/60'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      <span className="text-[13px] font-[family-name:var(--font-body)] text-foreground">
        {busy ? 'Enviando…' : label}
      </span>
      <span className="text-[12px] text-muted-foreground">
        Arraste e solte ou clique para escolher · PNG, JPG, WebP até 8MB
      </span>
    </label>
  );
}

// Link "colar URL" que abre um input inline. Preserva o fluxo de URL externa.
function PasteUrl({ onAdd }: { onAdd: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        ou colar URL
      </button>
    );
  }

  const submit = () => {
    const url = value.trim();
    if (url) onAdd(url);
    setValue('');
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <input
        autoFocus
        value={value}
        placeholder="https://…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        className={INPUT_CLASS}
      />
      <button
        type="button"
        onClick={submit}
        className="shrink-0 rounded-2xl bg-surface-elevated px-4 text-[13px] font-medium text-foreground hover:opacity-80"
      >
        Adicionar
      </button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remover imagem"
      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[14px] leading-none text-white transition-opacity hover:opacity-80"
    >
      ×
    </button>
  );
}

// --- Single -----------------------------------------------------------------

export function ImageUpload({
  value,
  onChange,
  pathPrefix = 'establishments',
}: {
  value: string;
  onChange: (url: string) => void;
  pathPrefix?: string;
}) {
  const [pending, setPending] = useState<PendingState>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const err = validate(file);
      if (err) {
        setPending({ error: err });
        return;
      }
      const preview = URL.createObjectURL(file);
      setPending({ preview });
      try {
        const url = await uploadImage(file, { pathPrefix });
        if (value) {
          void deleteImage(value).catch(() => {});
        }
        onChange(url);
      } catch (e: unknown) {
        setPending({ error: e instanceof Error ? e.message : 'Falha no upload.' });
        return;
      } finally {
        URL.revokeObjectURL(preview);
      }
      setPending(null);
    },
    [onChange, pathPrefix, value],
  );

  const busy = pending !== null && 'preview' in pending;
  const shownUrl = busy ? (pending as { preview: string }).preview : value;

  return (
    <div className="flex flex-col gap-2">
      {shownUrl ? (
        <div className="relative w-full overflow-hidden rounded-2xl bg-surface-elevated">
          <img src={shownUrl} alt="" className="h-40 w-full object-cover" />
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[13px] text-white">
              Enviando…
            </div>
          ) : (
            <RemoveButton
              onClick={() => {
                if (value) {
                  void deleteImage(value).catch(() => {});
                }
                onChange('');
              }}
            />
          )}
        </div>
      ) : (
        <Dropzone onFiles={(f) => void handleFiles(f)} multiple={false} busy={busy} label="Enviar imagem" />
      )}
      {pending && 'error' in pending ? (
        <span className="text-[12px] text-destructive">{pending.error}</span>
      ) : null}
      <PasteUrl
        onAdd={(url) => {
          if (value) {
            void deleteImage(value).catch(() => {});
          }
          onChange(url);
        }}
      />
    </div>
  );
}

// --- Multi (grid + reorder) -------------------------------------------------

type Uploading = { id: string; preview: string; error?: string };

export function ImageUploadMulti({
  value,
  onChange,
  pathPrefix = 'events',
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  pathPrefix?: string;
}) {
  // Uploads em voo (preview otimista); ao concluir, migram para `value`.
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const dragIndex = useRef<number | null>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      // Acumula sobre o value atual: enviar várias no mesmo lote encadeia os
      // onChange (evita que cada upload sobrescreva o value do closure e só a
      // última foto sobreviva).
      let acc = [...value];
      for (const file of files) {
        const err = validate(file);
        const preview = URL.createObjectURL(file);
        const id = `${file.name}-${file.size}-${preview}`;
        if (err) {
          setUploading((u) => [...u, { id, preview, error: err }]);
          continue;
        }
        setUploading((u) => [...u, { id, preview }]);
        try {
          const url = await uploadImage(file, { pathPrefix });
          acc = [...acc, url];
          onChange(acc);
        } catch (e: unknown) {
          setUploading((u) =>
            u.map((x) =>
              x.id === id ? { ...x, error: e instanceof Error ? e.message : 'Falha no upload.' } : x,
            ),
          );
          continue;
        } finally {
          URL.revokeObjectURL(preview);
        }
        setUploading((u) => u.filter((x) => x.id !== id));
      }
    },
    [onChange, pathPrefix, value],
  );

  const removeAt = (i: number) => {
    const url = value[i];
    if (url) {
      void deleteImage(url).catch(() => {});
    }
    onChange(value.filter((_, idx) => idx !== i));
  };

  // ponytail: HTML5 drag nativo para reorder; trocar por dnd-kit se a UX incomodar.
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const busy = uploading.some((u) => !u.error);

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 || uploading.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null) reorder(dragIndex.current, i);
                dragIndex.current = null;
              }}
              className="relative aspect-square cursor-move overflow-hidden rounded-2xl bg-surface-elevated"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <RemoveButton onClick={() => removeAt(i)} />
              <span className="absolute bottom-1.5 left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1.5 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
            </div>
          ))}
          {uploading.map((u) => (
            <div
              key={u.id}
              className="relative aspect-square overflow-hidden rounded-2xl bg-surface-elevated"
            >
              <img src={u.preview} alt="" className="h-full w-full object-cover opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center text-center text-[12px] text-white">
                {u.error ? (
                  <span className="px-2 text-destructive-foreground">{u.error}</span>
                ) : (
                  <span className="rounded-full bg-black/50 px-2 py-1">Enviando…</span>
                )}
              </div>
              {u.error ? (
                <RemoveButton onClick={() => setUploading((s) => s.filter((x) => x.id !== u.id))} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <Dropzone
        onFiles={(f) => void handleFiles(f)}
        multiple
        busy={busy}
        label="Enviar fotos"
      />
      <PasteUrl onAdd={(url) => onChange([...value, url])} />
    </div>
  );
}
