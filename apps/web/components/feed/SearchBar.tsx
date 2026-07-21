'use client';

import { SearchIcon, SlidersIcon } from '@/components/ui/icons';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onOpenFilters: () => void;
  /** Exibe um ponto no botão de filtros quando há filtro ativo. */
  hasFilters?: boolean;
}

/** Busca do feed + botão de filtros (ponytail: sheet de filtros é Task de Fase 2). */
export function SearchBar({ value, onChange, onOpenFilters, hasFilters = false }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-surface-elevated px-4">
        <SearchIcon size={18} className="shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar evento, banda ou bar"
          aria-label="Buscar evento, banda ou bar"
          className="h-12 flex-1 bg-transparent text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={hasFilters ? 'Abrir filtros (filtros ativos)' : 'Abrir filtros'}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-foreground transition-opacity hover:opacity-80"
      >
        <SlidersIcon size={18} />
        {hasFilters ? (
          <span className="absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-surface-elevated bg-primary" />
        ) : null}
      </button>
    </div>
  );
}
