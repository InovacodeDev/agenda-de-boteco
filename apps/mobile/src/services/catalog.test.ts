/**
 * Contrato do service de catálogo: contagens exatas dos mocks, ordenação,
 * filtros, ids inexistentes e validação Zod ativa em todos os retornos.
 */
import { z } from 'zod';

import {
  citySchema,
  establishmentSchema,
  eventSchema,
  musicStyleSchema,
  notificationSchema,
} from '../data/schemas';
import {
  getEstablishment,
  getEvent,
  listCities,
  listEstablishments,
  listEvents,
  listEventsByEstablishment,
  listMusicStyles,
  listNotifications,
} from './catalog';

function isSortedAscByStartsAt(items: { starts_at: string }[]): boolean {
  return items.every(
    (item, index) =>
      index === 0 ||
      Date.parse(items[index - 1].starts_at) <= Date.parse(item.starts_at),
  );
}

describe('listEvents', () => {
  it('retorna os 12 eventos do mock', async () => {
    const events = await listEvents();
    expect(events).toHaveLength(12);
  });

  it('retorna ordenado por starts_at asc', async () => {
    const events = await listEvents();
    expect(isSortedAscByStartsAt(events)).toBe(true);
  });

  it('passa na validação Zod', async () => {
    const events = await listEvents();
    expect(() => z.array(eventSchema).parse(events)).not.toThrow();
  });
});

describe('getEvent', () => {
  it('retorna o evento pelo id', async () => {
    const event = await getEvent('ev1');
    expect(event).not.toBeNull();
    expect(event?.id).toBe('ev1');
    expect(event?.name).toBe('Samba na Varanda');
    expect(() => eventSchema.parse(event)).not.toThrow();
  });

  it('retorna null para id inexistente', async () => {
    await expect(getEvent('nao-existe')).resolves.toBeNull();
  });
});

describe('listEstablishments', () => {
  it('retorna os 8 estabelecimentos do mock sem filtro', async () => {
    const establishments = await listEstablishments();
    expect(establishments).toHaveLength(8);
  });

  it("filtra por cityId: 'fln' retorna 4 estabelecimentos", async () => {
    const establishments = await listEstablishments('fln');
    expect(establishments).toHaveLength(4);
    expect(establishments.every((item) => item.city_id === 'fln')).toBe(true);
  });

  it('retorna lista vazia para cityId sem estabelecimentos', async () => {
    await expect(listEstablishments('nao-existe')).resolves.toEqual([]);
  });

  it('passa na validação Zod', async () => {
    const establishments = await listEstablishments();
    expect(() =>
      z.array(establishmentSchema).parse(establishments),
    ).not.toThrow();
  });
});

describe('getEstablishment', () => {
  it('retorna o estabelecimento pelo id', async () => {
    const establishment = await getEstablishment('e1');
    expect(establishment).not.toBeNull();
    expect(establishment?.name).toBe('Boteco do Zé');
    expect(() => establishmentSchema.parse(establishment)).not.toThrow();
  });

  it('retorna null para id inexistente', async () => {
    await expect(getEstablishment('nao-existe')).resolves.toBeNull();
  });
});

describe('listEventsByEstablishment', () => {
  it("retorna ev1 e ev11 para 'e1', ordenado por starts_at asc", async () => {
    const events = await listEventsByEstablishment('e1');
    expect(events.map((event) => event.id)).toEqual(['ev1', 'ev11']);
    expect(isSortedAscByStartsAt(events)).toBe(true);
  });

  it('retorna lista vazia para estabelecimento inexistente', async () => {
    await expect(listEventsByEstablishment('nao-existe')).resolves.toEqual([]);
  });
});

describe('listMusicStyles', () => {
  it('retorna os 10 estilos do mock validados pelo Zod', async () => {
    const styles = await listMusicStyles();
    expect(styles).toHaveLength(10);
    expect(() => z.array(musicStyleSchema).parse(styles)).not.toThrow();
  });
});

describe('listCities', () => {
  it('retorna as 6 cidades do mock validadas pelo Zod', async () => {
    const cities = await listCities();
    expect(cities).toHaveLength(6);
    expect(() => z.array(citySchema).parse(cities)).not.toThrow();
  });
});

describe('listNotifications', () => {
  it('retorna as 4 notificações do mock', async () => {
    const notifications = await listNotifications();
    expect(notifications).toHaveLength(4);
  });

  it('retorna ordenado por created_at desc', async () => {
    const notifications = await listNotifications();
    const timestamps = notifications.map((item) =>
      Date.parse(item.created_at),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it('passa na validação Zod', async () => {
    const notifications = await listNotifications();
    expect(() => z.array(notificationSchema).parse(notifications)).not.toThrow();
  });
});
