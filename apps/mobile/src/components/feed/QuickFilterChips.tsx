import { useFiltersStore } from '../../store/useFiltersStore';
import { ScrollView } from '../../tw';
import type { DateBucket } from '../../utils/filters';
import { Chip } from '../ui/Chip';

const DATE_CHIPS: Array<{ label: string; bucket: DateBucket }> = [
  { label: 'Hoje', bucket: 'today' },
  { label: 'Amanhã', bucket: 'tomorrow' },
  { label: 'Fim de semana', bucket: 'weekend' },
];

/** Chips rápidos do feed: Hoje, Amanhã, Fim de semana, Free, Perto de mim */
export function QuickFilterChips() {
  const filters = useFiltersStore((state) => state.filters);
  const setDateBucket = useFiltersStore((state) => state.setDateBucket);
  const toggleFreeOnly = useFiltersStore((state) => state.toggleFreeOnly);
  const toggleNearMe = useFiltersStore((state) => state.toggleNearMe);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2"
    >
      {DATE_CHIPS.map(({ label, bucket }) => (
        <Chip
          key={bucket}
          label={label}
          selected={filters.dateBucket === bucket}
          onPress={() => setDateBucket(filters.dateBucket === bucket ? 'any' : bucket)}
        />
      ))}
      <Chip label="Free" selected={filters.freeOnly} onPress={toggleFreeOnly} />
      <Chip label="Perto de mim" selected={filters.nearMe} onPress={toggleNearMe} />
    </ScrollView>
  );
}
