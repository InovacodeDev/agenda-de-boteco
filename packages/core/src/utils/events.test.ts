import type { Event } from '../schemas';
import { upcomingEventsForEstablishment } from './events';

const NOW = new Date(2026, 5, 11, 20, 0, 0, 0);

function ev(id: string, establishmentId: string, startsAt: Date): Event {
  return {
    id,
    name: id,
    attraction: 'x',
    description: '',
    banner_url: 'https://example.com/a.jpg',
    photo_urls: [],
    music_style_ids: [],
    establishment_id: establishmentId,
    starts_at: startsAt.toISOString(),
    ends_at: startsAt.toISOString(),
    cover_charge: 0,
  };
}

describe('upcomingEventsForEstablishment', () => {
  const events: Event[] = [
    ev('past', 'b1', new Date(2026, 5, 1, 20)),
    ev('soon', 'b1', new Date(2026, 5, 12, 20)),
    ev('later', 'b1', new Date(2026, 5, 20, 20)),
    ev('other', 'b2', new Date(2026, 5, 13, 20)),
  ];

  it('retorna só futuros do estabelecimento, ordenados asc', () => {
    const result = upcomingEventsForEstablishment(events, 'b1', NOW, 5);
    expect(result.map((e) => e.id)).toEqual(['soon', 'later']);
  });

  it('respeita o limite', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      ev(`e${i}`, 'b1', new Date(2026, 5, 12 + i, 20)),
    );
    expect(upcomingEventsForEstablishment(many, 'b1', NOW, 5)).toHaveLength(5);
  });

  it('retorna [] quando não há eventos futuros', () => {
    expect(upcomingEventsForEstablishment([events[0]], 'b1', NOW, 5)).toEqual([]);
  });

  it('não muta a entrada', () => {
    const copy = [...events];
    upcomingEventsForEstablishment(events, 'b1', NOW, 5);
    expect(events).toEqual(copy);
  });
});
