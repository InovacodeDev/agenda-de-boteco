'use client';

import {
  type City,
  type DateBucket,
  DEFAULT_EVENT_FILTERS,
  type EstablishmentAttribute,
  type EventFilters,
  isVirtualCityId,
  QUICK_ATTRIBUTE_METAS,
  resolveCityFromLocation,
  type SortBy,
  useCitiesQuery,
  useFiltersStore,
  useMusicStylesQuery,
} from '@agenda/core';
import { useEffect, useState } from 'react';

import { AttributeSearchModal } from '@/components/filters/AttributeSearchModal';
import { CitySearchModal } from '@/components/filters/CitySearchModal';
import { DateRangeField } from '@/components/filters/DateRangeField';
import { FilterSection } from '@/components/filters/FilterSection';
import { FilterSlider } from '@/components/filters/FilterSlider';
import { SwitchRow } from '@/components/filters/SwitchRow';
import { InfoIcon, XIcon } from '@/components/ui/icons';
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
  title,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Tooltip nativa — usada pelos chips de atributo para explicar o que filtram. */
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      title={title}
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
  const storedFilters = useFiltersStore((state) => state.filters);
  const replaceFilters = useFiltersStore((state) => state.replaceFilters);
  const { data: cities } = useCitiesQuery();
  const { data: musicStyles } = useMusicStylesQuery();
  const [isCitySearchOpen, setIsCitySearchOpen] = useState(false);
  const [isAttributeSearchOpen, setIsAttributeSearchOpen] = useState(false);

  // estado provisório: só aplica ao clicar "Aplicar"
  const [draft, setDraft] = useState<EventFilters>(storedFilters);
  // Re-semeia o rascunho na transição closed->open (adjusting state during
  // render, per React docs — mesmo padrão do CitySearchModal).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setDraft(storedFilters);
  }

  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);

  useEffect(() => {
    // com uma busca aberta (cidade/atributo), Escape é dela — não fecha a sidebar atrás.
    if (!isOpen || isCitySearchOpen || isAttributeSearchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isCitySearchOpen, isAttributeSearchOpen, onClose]);

  const patch = (partial: Partial<EventFilters>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const toggleDraftCity = (cityId: string) =>
    patch({
      cityIds: draft.cityIds.includes(cityId)
        ? draft.cityIds.filter((id) => id !== cityId)
        : [...draft.cityIds, cityId],
    });

  const toggleDraftAttribute = (attributeId: EstablishmentAttribute) =>
    patch({
      attributeIds: draft.attributeIds.includes(attributeId)
        ? draft.attributeIds.filter((id) => id !== attributeId)
        : [...draft.attributeIds, attributeId],
    });

  const toggleDraftStyle = (styleId: string) =>
    patch({
      styleIds: draft.styleIds.includes(styleId)
        ? draft.styleIds.filter((id) => id !== styleId)
        : [...draft.styleIds, styleId],
    });

  // ponytail: sem reverse geocode no web — passa geocode vazio, então só a
  // cidade de catálogo mais próxima (<= 40 km) rende um chip selecionável;
  // fora disso resolveCityFromLocation devolve cidade virtual, que não entra
  // no multi-select e mantém o chip "Minha localização".
  const handleUseMyLocation = () => {
    if (!navigator.geolocation || !cities) return;
    setResolvingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { city } = resolveCityFromLocation(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { city: null, uf: null },
          cities,
        );
        setCurrentCity(city);
        if (!isVirtualCityId(city.id)) toggleDraftCity(city.id);
        setResolvingLocation(false);
      },
      () => setResolvingLocation(false),
      { enableHighAccuracy: true },
    );
  };

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
          'fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[40vw] sm:min-w-[360px] sm:max-w-[560px] bg-card border-l border-border h-full flex flex-col shadow-2xl transition-transform duration-300 ease-out',
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
          <FilterSection title="Data">
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map(({ label, bucket }) => (
                <Chip
                  key={bucket}
                  label={label}
                  selected={!draft.dateRange && draft.dateBucket === bucket}
                  onClick={() => patch({ dateBucket: bucket, dateRange: null })}
                />
              ))}
            </div>
            <DateRangeField
              value={draft.dateRange}
              onChange={(range) => patch({ dateRange: range, dateBucket: 'any' })}
            />
          </FilterSection>

          <FilterSection title="Ordenar por">
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={draft.sortBy === opt.value}
                  onClick={() => patch({ sortBy: opt.value })}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Cidade">
            <div className="flex flex-wrap gap-2">
              {/* Cidade virtual (geolocalização fora do catálogo) não entra no multi
                  — o recorte de cidadeIds é estrito de catálogo (feed vazio se marcada).
                  Cai no chip "Minha localização" em vez de prometer um filtro que não filtra. */}
              {currentCity && !isVirtualCityId(currentCity.id) ? (
                <Chip
                  key={currentCity.id}
                  label={`${currentCity.name} (atual)`}
                  selected={draft.cityIds.includes(currentCity.id)}
                  onClick={() => toggleDraftCity(currentCity.id)}
                />
              ) : (
                <Chip
                  label={resolvingLocation ? 'Buscando...' : 'Minha localização'}
                  selected={false}
                  onClick={handleUseMyLocation}
                />
              )}
              {(cities ?? [])
                .filter((c) => c.id !== currentCity?.id)
                .slice(0, 5)
                .map((city) => (
                  <Chip
                    key={city.id}
                    label={city.name}
                    selected={draft.cityIds.includes(city.id)}
                    onClick={() => toggleDraftCity(city.id)}
                  />
                ))}
              <Chip
                label={
                  draft.cityIds.length > 0
                    ? `Buscar cidade (${draft.cityIds.length})`
                    : 'Buscar cidade'
                }
                selected={draft.cityIds.length > 0}
                onClick={() => setIsCitySearchOpen(true)}
              />
            </div>
          </FilterSection>

          <FilterSection title="Distância" trailing={`${draft.maxDistanceKm} km`}>
            <FilterSlider
              value={draft.maxDistanceKm}
              minimumValue={1}
              maximumValue={50}
              onValueChange={(value) => patch({ maxDistanceKm: value })}
            />
          </FilterSection>

          <FilterSection title="Estilo musical">
            <div className="flex flex-wrap gap-2">
              {(musicStyles ?? []).map((style) => (
                <Chip
                  key={style.id}
                  label={`${style.emoji} ${style.name}`}
                  selected={draft.styleIds.includes(style.id)}
                  onClick={() => toggleDraftStyle(style.id)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Diferenciais">
            {/* Legenda sempre visível: o combinador é E, não OU — sem ela o usuário
                lê "Pet Friendly + Área Kids" como união e estranha o feed vazio. */}
            <p className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-body)] text-muted-foreground">
              <InfoIcon size={12} className="shrink-0" />
              Mostra apenas bares com todos os selecionados
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ATTRIBUTE_METAS.map((meta) => (
                <Chip
                  key={meta.id}
                  label={meta.label}
                  title={meta.description}
                  selected={draft.attributeIds.includes(meta.id)}
                  onClick={() => toggleDraftAttribute(meta.id)}
                />
              ))}
              <Chip
                label={
                  draft.attributeIds.length > 0
                    ? `Buscar diferencial (${draft.attributeIds.length})`
                    : 'Buscar diferencial'
                }
                selected={draft.attributeIds.length > 0}
                onClick={() => setIsAttributeSearchOpen(true)}
              />
            </div>
          </FilterSection>

          <FilterSection title="Avaliação mínima" trailing={`${draft.minRating} ★`}>
            <FilterSlider
              value={draft.minRating}
              minimumValue={0}
              maximumValue={5}
              step={0.5}
              onValueChange={(value) => patch({ minRating: value })}
            />
          </FilterSection>

          <FilterSection
            title="Preço máximo"
            trailing={draft.maxPrice === null ? 'Sem limite' : `R$ ${draft.maxPrice}`}
          >
            <FilterSlider
              value={draft.maxPrice ?? MAX_PRICE_LIMIT}
              minimumValue={0}
              maximumValue={MAX_PRICE_LIMIT}
              step={5}
              onValueChange={(value) => patch({ maxPrice: value >= MAX_PRICE_LIMIT ? null : value })}
            />
          </FilterSection>

          <SwitchRow
            title="Aberto agora"
            subtitle="Apenas estabelecimentos abertos"
            value={draft.openNow}
            onValueChange={(value) => patch({ openNow: value })}
          />
        </div>

        <div className="border-t border-border px-6 py-4 bg-card flex gap-3">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_EVENT_FILTERS)}
            className="flex-1 rounded-2xl border border-foreground/30 py-3 text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground transition-opacity hover:opacity-80"
          >
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={() => {
              replaceFilters(draft);
              onClose();
            }}
            className="flex-1 rounded-2xl bg-primary py-3 text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-80"
          >
            Aplicar
          </button>
        </div>
      </aside>

      <CitySearchModal
        isOpen={isCitySearchOpen}
        initialSelected={draft.cityIds}
        onClose={() => setIsCitySearchOpen(false)}
        onConfirm={(ids) => {
          patch({ cityIds: ids });
          setIsCitySearchOpen(false);
        }}
      />

      <AttributeSearchModal
        isOpen={isAttributeSearchOpen}
        initialSelected={draft.attributeIds}
        onClose={() => setIsAttributeSearchOpen(false)}
        onConfirm={(ids) => {
          patch({ attributeIds: ids });
          setIsAttributeSearchOpen(false);
        }}
      />
    </>
  );
}
