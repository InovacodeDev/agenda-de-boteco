import { Chip } from '@/components/ui/Chip';
import { QUICK_ATTRIBUTE_METAS } from '@/data/lookup';
import { useFiltersStore } from '@/store/useFiltersStore';
import { ScrollView } from '@/tw';
import type { DateBucket } from '@/utils/filters';

const DATE_CHIPS: Array<{ label: string; bucket: DateBucket }> = [
  { label: 'Hoje', bucket: 'today' },
  { label: 'Amanhã', bucket: 'tomorrow' },
  { label: 'Fim de semana', bucket: 'weekend' },
];

export interface QuickFilterChipsProps {
  /**
   * Aba Bares (`false`) esconde os chips de data/Free/Perto de mim: esses filtros
   * são propriedades do evento e `applyEstablishmentFilters` não os consome, então
   * na lista de bares eles ficariam clicáveis sem efeito nenhum.
   */
  showEventFilters?: boolean;
}

/**
 * Chips rápidos do feed. Aba Eventos: data, Free, Perto de mim e os 5 atributos
 * de destaque. Aba Bares: só os atributos.
 */
export function QuickFilterChips({ showEventFilters = true }: QuickFilterChipsProps) {
  const filters = useFiltersStore((state) => state.filters);
  const setDateBucket = useFiltersStore((state) => state.setDateBucket);
  const toggleFreeOnly = useFiltersStore((state) => state.toggleFreeOnly);
  const toggleNearMe = useFiltersStore((state) => state.toggleNearMe);
  const toggleAttribute = useFiltersStore((state) => state.toggleAttribute);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2"
    >
      {showEventFilters ? (
        <>
          {DATE_CHIPS.map(({ label, bucket }) => (
            <Chip
              key={bucket}
              label={label}
              selected={!filters.dateRange && filters.dateBucket === bucket}
              onPress={() => setDateBucket(filters.dateBucket === bucket ? 'any' : bucket)}
            />
          ))}
          <Chip label="Free" selected={filters.freeOnly} onPress={toggleFreeOnly} />
          <Chip label="Perto de mim" selected={filters.nearMe} onPress={toggleNearMe} />
        </>
      ) : null}
      {QUICK_ATTRIBUTE_METAS.map((meta) => (
        <Chip
          key={meta.id}
          label={meta.label}
          selected={filters.attributeIds.includes(meta.id)}
          onPress={() => toggleAttribute(meta.id)}
        />
      ))}
    </ScrollView>
  );
}
