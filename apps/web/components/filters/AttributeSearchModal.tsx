'use client';

import {
  ESTABLISHMENT_ATTRIBUTES,
  type EstablishmentAttribute,
  type EstablishmentAttributeMeta,
  normalizeText,
} from '@agenda/core';
import { useMemo, useState } from 'react';

import { AttributeIcon, XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export interface AttributeSearchModalProps {
  isOpen: boolean;
  initialSelected: EstablishmentAttribute[];
  onClose: () => void;
  onConfirm: (ids: EstablishmentAttribute[]) => void;
}

export function AttributeSearchModal({
  isOpen,
  initialSelected,
  onClose,
  onConfirm,
}: AttributeSearchModalProps) {
  const [selected, setSelected] = useState<EstablishmentAttribute[]>(initialSelected);
  const [query, setQuery] = useState('');
  // Reset the draft when the modal transitions from closed to open (adjusting
  // state during render, per React docs — avoids a cascading-render effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setSelected(initialSelected);
      setQuery('');
    }
  }

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return ESTABLISHMENT_ATTRIBUTES;
    return ESTABLISHMENT_ATTRIBUTES.filter((meta) =>
      normalizeText(`${meta.label} ${meta.description}`).includes(q),
    );
  }, [query]);

  const toggle = (id: EstablishmentAttribute) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((a) => a !== id) : [...current, id],
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-[16px] font-[family-name:var(--font-heading)] font-bold text-foreground">
            Buscar diferencial
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca de diferencial"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-foreground transition-opacity hover:opacity-80"
          >
            <XIcon size={16} />
          </button>
        </header>
        <div className="px-5 pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome do diferencial"
            aria-label="Buscar diferencial"
            autoFocus
            className="h-11 w-full rounded-2xl bg-surface-elevated px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 scrollbar-thin">
          {results.map((meta: EstablishmentAttributeMeta) => {
            const isSelected = selected.includes(meta.id);
            return (
              <button
                key={meta.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(meta.id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-primary/15' : 'bg-surface-elevated hover:opacity-80',
                )}
              >
                <AttributeIcon icon={meta.icon} size={18} className="shrink-0 text-primary" />
                <span className="flex-1">
                  <span className="block text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
                    {meta.label}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
                {isSelected ? (
                  <span className="text-primary text-[13px] font-semibold">✓</span>
                ) : null}
              </button>
            );
          })}
          {results.length === 0 ? (
            <p className="text-center text-[13px] text-muted-foreground">
              Nenhum diferencial encontrado.
            </p>
          ) : null}
        </div>
        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="w-full rounded-2xl bg-primary py-3 text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-80"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
