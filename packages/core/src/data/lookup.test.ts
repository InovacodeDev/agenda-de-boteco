import type { Event } from '../schemas';
import { indexById, musicStylesForEvent } from './lookup';
import { CITIES, ESTABLISHMENTS, EVENTS, MUSIC_STYLES } from './mock';

describe('indexById', () => {
  it('indexa todos os itens da lista pelos próprios ids', () => {
    expect(Object.keys(indexById(CITIES))).toHaveLength(CITIES.length);
    expect(Object.keys(indexById(ESTABLISHMENTS))).toHaveLength(ESTABLISHMENTS.length);
    expect(Object.keys(indexById(EVENTS))).toHaveLength(EVENTS.length);
    expect(Object.keys(indexById(MUSIC_STYLES))).toHaveLength(MUSIC_STYLES.length);
  });

  it('aponta para o mesmo objeto da lista de origem (mesma referência)', () => {
    const eventsById = indexById(EVENTS);
    for (const event of EVENTS) {
      expect(eventsById[event.id]).toBe(event);
    }
    const establishmentsById = indexById(ESTABLISHMENTS);
    for (const establishment of ESTABLISHMENTS) {
      expect(establishmentsById[establishment.id]).toBe(establishment);
    }
  });

  it('retorna undefined para id inexistente', () => {
    expect(indexById(EVENTS)['nao-existe']).toBeUndefined();
    expect(indexById(ESTABLISHMENTS)['nao-existe']).toBeUndefined();
  });
});

describe('musicStylesForEvent', () => {
  const stylesById = indexById(MUSIC_STYLES);
  const baseEvent = EVENTS[0];

  it('resolve os estilos na mesma ordem dos ids do evento', () => {
    const styles = musicStylesForEvent(baseEvent, stylesById);
    expect(styles.map((style) => style.id)).toEqual(
      baseEvent.music_style_ids.filter((id) => stylesById[id] !== undefined),
    );
  });

  it('retorna a mesma referência de array em chamadas repetidas (cache)', () => {
    expect(musicStylesForEvent(baseEvent, stylesById)).toBe(
      musicStylesForEvent(baseEvent, stylesById),
    );
  });

  it('ignora ids de estilo desconhecidos', () => {
    const event: Event = {
      ...baseEvent,
      id: 'ev-teste',
      music_style_ids: ['rock', 'estilo-inexistente'],
    };
    const styles = musicStylesForEvent(event, stylesById);
    expect(styles).toHaveLength(1);
    expect(styles[0].id).toBe('rock');
  });
});
