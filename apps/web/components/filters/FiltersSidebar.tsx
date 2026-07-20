'use client';

import {
  type DateBucket,
  type SortBy,
  useCitiesQuery,
  useFiltersStore,
  useMusicStylesQuery,
} from '@agenda/core';
import { useState } from 'react';

import { CitySearchModal } from '@/components/filters/CitySearchModal';
import { DateRangeField } from '@/components/filters/DateRangeField';
import { FilterSection } from '@/components/filters/FilterSection';
import { FilterSlider } from '@/components/filters/FilterSlider';
import { SwitchRow } from '@/components/filters/SwitchRow';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const DATE_OPTIONS: Array<{ label: string; bucket: DateBucket }> = [
  { label: 'Qualquer dia', bucket: 'any' },
  { label: 'Hoje', bucket: 'today' },
  { label: 'Amanhã', bucket: 'tomorrow' },
  { label: 'Fim de semana', bucket: 'weekend' },
];

const SORT_OPTIONS: Array<{ label: string; value: SortBy }> = [
  { label: 'Data', value: 'date' },
  { label: 'Distância', value: 'distance' },
  { label: 'Avaliação', value: 'rating' },
  { label: 'Preço', value: 'price' },
];

const MAX_PRICE_LIMIT = 100;

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-[family-name:var(--font-body)] font-medium transition-colors',
        selected ? 'bg-primary text-primary-foreground' : 'bg-surface-elevated text-muted-foreground',
      )}
    >
      {label}
    </button>
  );
}

export interface FiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FiltersSidebar({ isOpen, onClose }: FiltersSidebarProps) {
  const filters = useFiltersStore((state) => state.filters);
  const setQuery = useFiltersStore((state) => state.setQuery);
  const setDateBucket = useFiltersStore((state) => state.setDateBucket);
  const setDateRange = useFiltersStore((state) => state.setDateRange);
  const setSortBy = useFiltersStore((state) => state.setSortBy);
  const toggleStyle = useFiltersStore((state) => state.toggleStyle);
  const setMaxDistanceKm = useFiltersStore((state) => state.setMaxDistanceKm);
  const setMinRating = useFiltersStore((state) => state.setMinRating);
  const setMaxPrice = useFiltersStore((state) => state.setMaxPrice);
  const toggleFreeOnly = useFiltersStore((state) => state.toggleFreeOnly);
  const toggleNearMe = useFiltersStore((state) => state.toggleNearMe);
  const setOpenNow = useFiltersStore((state) => state.setOpenNow);
  const resetFilters = useFiltersStore((state) => state.resetFilters);
  const toggleCity = useFiltersStore((state) => state.toggleCity);
  const setCityIds = useFiltersStore((state) => state.setCityIds);
  const { data: cities } = useCitiesQuery();
  const [isCitySearchOpen, setIsCitySearchOpen] = useState(false);

  const { data: musicStyles } = useMusicStylesQuery();

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-background/60 backdrop-blur-xs z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      <aside
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-card border-l border-border h-full flex flex-col shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[20px] font-[family-name:var(--font-heading)] font-bold text-foreground">
            Filtros
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar filtros"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-foreground transition-opacity hover:opacity-80 focus:outline-none"
          >
            <XIcon size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 scrollbar-thin">
          <FilterSection title="Busca">
            <input
              value={filters.query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar evento, banda ou bar"
              aria-label="Buscar evento, banda ou bar"
              className="h-12 w-full rounded-2xl bg-surface-elevated px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </FilterSection>

          <FilterSection title="Data">
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map(({ label, bucket }) => (
                <Chip
                  key={bucket}
                  label={label}
                  selected={!filters.dateRange && filters.dateBucket === bucket}
                  onClick={() => setDateBucket(bucket)}
                />
              ))}
            </div>
            <DateRangeField value={filters.dateRange} onChange={setDateRange} />
          </FilterSection>

          <FilterSection title="Ordenar por">
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={filters.sortBy === opt.value}
                  onClick={() => setSortBy(opt.value)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Cidade">
            <div className="flex flex-wrap gap-2">
              {(cities ?? []).slice(0, 5).map((city) => (
                <Chip
                  key={city.id}
                  label={city.name}
                  selected={filters.cityIds.includes(city.id)}
                  onClick={() => toggleCity(city.id)}
                />
              ))}
              <Chip
                label="Buscar cidade"
                selected={false}
                onClick={() => setIsCitySearchOpen(true)}
              />
            </div>
          </FilterSection>

          <FilterSection title="Distância" trailing={`${filters.maxDistanceKm} km`}>
            <FilterSlider
              value={filters.maxDistanceKm}
              minimumValue={1}
              maximumValue={50}
              onValueChange={setMaxDistanceKm}
            />
          </FilterSection>

          <FilterSection title="Estilo musical">
            <div className="flex flex-wrap gap-2">
              {(musicStyles ?? []).map((style) => (
                <Chip
                  key={style.id}
                  label={`${style.emoji} ${style.name}`}
                  selected={filters.styleIds.includes(style.id)}
                  onClick={() => toggleStyle(style.id)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Avaliação mínima" trailing={`${filters.minRating} ★`}>
            <FilterSlider
              value={filters.minRating}
              minimumValue={0}
              maximumValue={5}
              step={0.5}
              onValueChange={setMinRating}
            />
          </FilterSection>

          <FilterSection
            title="Preço máximo"
            trailing={filters.maxPrice === null ? 'Sem limite' : `R$ ${filters.maxPrice}`}
          >
            <FilterSlider
              value={filters.maxPrice ?? MAX_PRICE_LIMIT}
              minimumValue={0}
              maximumValue={MAX_PRICE_LIMIT}
              step={5}
              onValueChange={(value) => setMaxPrice(value >= MAX_PRICE_LIMIT ? null : value)}
            />
          </FilterSection>

          <div className="flex flex-col gap-4 border-t border-border pt-6">
            <SwitchRow
              title="Apenas grátis"
              subtitle="Eventos sem cobrança de entrada"
              value={filters.freeOnly}
              onValueChange={toggleFreeOnly}
            />
            <SwitchRow
              title="Perto de mim"
              subtitle="Dentro do raio de distância"
              value={filters.nearMe}
              onValueChange={toggleNearMe}
            />
            <SwitchRow
              title="Aberto agora"
              subtitle="Apenas estabelecimentos abertos"
              value={filters.openNow}
              onValueChange={setOpenNow}
            />
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 bg-card flex gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="flex-1 rounded-2xl border border-foreground/30 py-3 text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground transition-opacity hover:opacity-80"
          >
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-primary py-3 text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-80"
          >
            Aplicar
          </button>
        </div>
      </aside>

      <CitySearchModal
        isOpen={isCitySearchOpen}
        initialSelected={filters.cityIds}
        onClose={() => setIsCitySearchOpen(false)}
        onConfirm={(ids) => {
          setCityIds(ids);
          setIsCitySearchOpen(false);
        }}
      />
    </>
  );
}
