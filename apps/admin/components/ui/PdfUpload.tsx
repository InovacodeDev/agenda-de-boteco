'use client';

import { MAX_IMAGE_BYTES, uploadImage } from '@agenda/core';
import { useCallback, useState } from 'react';

type PendingState = { previewName: string } | { error: string } | null;

function validate(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Só arquivos PDF são aceitos.';
  if (file.size > MAX_IMAGE_BYTES) return 'Arquivo acima de 8MB.';
  return null;
}

export function PdfUpload({
  value,
  onChange,
  pathPrefix = 'menus',
}: {
  value: string;
  onChange: (url: string) => void;
  pathPrefix?: string;
}) {
  const [pending, setPending] = useState<PendingState>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const err = validate(file);
      if (err) {
        setPending({ error: err });
        return;
      }
      setPending({ previewName: file.name });
      try {
        const url = await uploadImage(file, { pathPrefix });
        onChange(url);
      } catch (e: unknown) {
        setPending({ error: e instanceof Error ? e.message : 'Falha no upload.' });
        return;
      }
      setPending(null);
    },
    [onChange, pathPrefix],
  );

  const pick = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    void handleFiles(Array.from(list));
  };

  const busy = pending !== null && 'previewName' in pending;

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-elevated p-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[18px]">📄</span>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[13px] font-medium text-foreground hover:underline"
            >
              Visualizar Cardápio (PDF)
            </a>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-full bg-black/10 px-2 py-1 text-[12px] font-bold text-muted-foreground hover:bg-black/20 hover:text-foreground"
          >
            Remover
          </button>
        </div>
      ) : (
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
          className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-surface-elevated hover:border-primary/60'
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = '';
            }}
          />
          <span className="text-[13px] font-body text-foreground">
            {busy ? `Enviando ${(pending as { previewName: string }).previewName}…` : 'Enviar PDF do Cardápio'}
          </span>
          <span className="text-[12px] text-muted-foreground">
            Arraste e solte ou clique para escolher · PDF de até 8MB
          </span>
        </label>
      )}
      {pending && 'error' in pending ? (
        <span className="text-[12px] text-destructive">{pending.error}</span>
      ) : null}
    </div>
  );
}
