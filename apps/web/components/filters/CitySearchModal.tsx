'use client';

import { type City, normalizeText, useCitiesQuery } from '@agenda/core';
import { useMemo, useState } from 'react';

import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export interface CitySearchModalProps {
  isOpen: boolean;
  initialSelected: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export function CitySearchModal({ isOpen, initialSelected, onClose, onConfirm }: CitySearchModalProps) {
  const { data: cities } = useCitiesQuery();
  const [selected, setSelected] = useState<string[]>(initialSelected);
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
    const list = cities ?? [];
    if (!q) return list;
    return list.filter((c) => normalizeText(c.name).includes(q));
  }, [cities, query]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-[16px] font-[family-name:var(--font-heading)] font-bold text-foreground">
            Buscar cidade
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca de cidade"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-foreground transition-opacity hover:opacity-80"
          >
            <XIcon size={16} />
          </button>
        </header>
        <div className="px-5 pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome da cidade"
            aria-label="Buscar cidade"
            autoFocus
            className="h-11 w-full rounded-2xl bg-surface-elevated px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 scrollbar-thin">
          {results.map((city: City) => {
            const isSelected = selected.includes(city.id);
            return (
              <button
                key={city.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(city.id)}
                className={cn(
                  'flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-primary/15' : 'bg-surface-elevated hover:opacity-80',
                )}
              >
                <span>
                  <span className="block text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
                    {city.name}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">{city.uf}</span>
                </span>
                {isSelected ? <span className="text-primary text-[13px] font-semibold">✓</span> : null}
              </button>
            );
          })}
          {results.length === 0 ? (
            <p className="text-center text-[13px] text-muted-foreground">Nenhuma cidade encontrada.</p>
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
