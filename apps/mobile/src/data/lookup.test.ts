import {
  CITIES_BY_ID,
  cityByIdOrDefault,
  ESTABLISHMENTS_BY_ID,
  EVENTS_BY_ID,
  MUSIC_STYLES_BY_ID,
  musicStylesForEvent,
} from './lookup';
import { CITIES, ESTABLISHMENTS, EVENTS, MUSIC_STYLES } from './mock';
import type { Event } from './schemas';

describe('índices por id', () => {
  it('indexa todos os itens do catálogo pelos próprios ids', () => {
    expect(Object.keys(CITIES_BY_ID)).toHaveLength(CITIES.length);
    expect(Object.keys(ESTABLISHMENTS_BY_ID)).toHaveLength(ESTABLISHMENTS.length);
    expect(Object.keys(EVENTS_BY_ID)).toHaveLength(EVENTS.length);
    expect(Object.keys(MUSIC_STYLES_BY_ID)).toHaveLength(MUSIC_STYLES.length);
  });

  it('aponta para o mesmo objeto da lista de origem (mesma referência)', () => {
    for (const event of EVENTS) {
      expect(EVENTS_BY_ID[event.id]).toBe(event);
    }
    for (const establishment of ESTABLISHMENTS) {
      expect(ESTABLISHMENTS_BY_ID[establishment.id]).toBe(establishment);
    }
  });

  it('retorna undefined para id inexistente', () => {
    expect(EVENTS_BY_ID['nao-existe']).toBeUndefined();
    expect(ESTABLISHMENTS_BY_ID['nao-existe']).toBeUndefined();
  });
});

describe('cityByIdOrDefault', () => {
  it('retorna a cidade correspondente quando o id existe', () => {
    const city = CITIES[1];
    expect(cityByIdOrDefault(city.id)).toBe(city);
  });

  it('cai na primeira cidade do catálogo quando o id é desconhecido', () => {
    expect(cityByIdOrDefault('nao-existe')).toBe(CITIES[0]);
  });
});

describe('musicStylesForEvent', () => {
  const baseEvent = EVENTS[0];

  it('resolve os estilos na mesma ordem dos ids do evento', () => {
    const styles = musicStylesForEvent(baseEvent);
    expect(styles.map((style) => style.id)).toEqual(
      baseEvent.music_style_ids.filter((id) => MUSIC_STYLES_BY_ID[id] !== undefined),
    );
  });

  it('retorna a mesma referência de array em chamadas repetidas (cache)', () => {
    expect(musicStylesForEvent(baseEvent)).toBe(musicStylesForEvent(baseEvent));
  });

  it('ignora ids de estilo desconhecidos', () => {
    const event: Event = {
      ...baseEvent,
      id: 'ev-teste',
      music_style_ids: ['rock', 'estilo-inexistente'],
    };
    const styles = musicStylesForEvent(event);
    expect(styles).toHaveLength(1);
    expect(styles[0].id).toBe('rock');
  });
});
