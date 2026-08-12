'use client';

import { MAX_IMAGE_BYTES, uploadImage } from '@agenda/core';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { useState } from 'react';

/**
 * Área tracejada de upload do onboarding. Mais enxuta que a ImageUpload do
 * admin (sem "colar URL" nem instruções de arraste): aqui o design pede só o
 * ícone e "Clique para enviar". Sobe ao bucket e devolve a URL pública.
 */
export function ImageDrop({
  value,
  onChange,
  label,
  className = '',
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Só imagens são aceitas.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Imagem acima de 8MB.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadImage(file, { pathPrefix: 'establishments' }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha no upload.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[14px] font-medium text-foreground">{label}</span>

      {/* <label> nativo: clicar abre o seletor uma vez só, sem .click() manual. */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-surface/40 text-center transition-colors hover:border-primary/60 ${className}`}
      >
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {value ? (
          // <img> e não next/image: a URL vem do bucket do Supabase, que exigiria
          // configurar remotePatterns só para o preview do upload.
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <UploadSimpleIcon size={24} className="text-muted-foreground" weight="regular" />
            <span className="text-[14px] text-muted-foreground">
              {busy ? 'Enviando…' : 'Clique para enviar'}
            </span>
          </>
        )}
      </label>

      {error ? <span className="text-[12px] text-destructive">{error}</span> : null}
    </div>
  );
}
