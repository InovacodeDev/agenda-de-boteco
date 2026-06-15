import { CITIES } from '../data/mock';
import type { City } from '../data/schemas';
import type { LocationStatus } from '../hooks/useUserLocation';
import {
  coarseLatLng,
  haversineDistanceKm,
  type LatLng,
  nearestCity,
  resolveNearbyOrigin,
} from './geo';

const FLN: LatLng = { lat: -27.5954, lng: -48.548 };
const SAO: LatLng = { lat: -23.5505, lng: -46.6333 };

describe('haversineDistanceKm', () => {
  it('retorna 0 para o mesmo ponto', () => {
    expect(haversineDistanceKm(FLN, FLN)).toBe(0);
  });

  it('calcula a distância Florianópolis → São Paulo', () => {
    expect(haversineDistanceKm(FLN, SAO)).toBeCloseTo(489.03, 1);
  });

  it('mede 1 grau de latitude no equador (~111,19 km)', () => {
    const origin: LatLng = { lat: 0, lng: 0 };
    const oneDegreeNorth: LatLng = { lat: 1, lng: 0 };
    expect(haversineDistanceKm(origin, oneDegreeNorth)).toBeCloseTo(111.19, 1);
  });

  it('é simétrica', () => {
    expect(haversineDistanceKm(FLN, SAO)).toBe(haversineDistanceKm(SAO, FLN));
  });
});

describe('nearestCity', () => {
  it('retorna a cidade mais próxima das coordenadas', () => {
    expect(nearestCity({ lat: -27.6, lng: -48.5 }, CITIES).id).toBe('fln');
    expect(nearestCity({ lat: -25.4, lng: -49.3 }, CITIES).id).toBe('cwb');
    expect(nearestCity({ lat: -22.9, lng: -43.2 }, CITIES).id).toBe('rio');
  });

  it('lança erro quando a lista de cidades está vazia', () => {
    expect(() => nearestCity(FLN, [])).toThrow('nearestCity: lista de cidades vazia');
  });
});

describe('coarseLatLng', () => {
  it('arredonda para 3 casas por default', () => {
    expect(coarseLatLng({ lat: -27.595412, lng: -48.547987 })).toEqual({
      lat: -27.595,
      lng: -48.548,
    });
  });

  it('respeita o parâmetro decimals', () => {
    expect(coarseLatLng({ lat: -27.595412, lng: -48.547987 }, 1)).toEqual({
      lat: -27.6,
      lng: -48.5,
    });
    expect(coarseLatLng({ lat: -27.595412, lng: -48.547987 }, 0)).toEqual({
      lat: -28,
      lng: -49,
    });
  });

  it('é idempotente', () => {
    const raw: LatLng = { lat: -27.595412, lng: -48.547987 };
    const once = coarseLatLng(raw);
    expect(coarseLatLng(once)).toEqual(once);
  });

  it('funciona com coordenadas negativas (hemisfério sul)', () => {
    expect(coarseLatLng({ lat: -27.5954, lng: -48.548 })).toEqual({
      lat: -27.595,
      lng: -48.548,
    });
  });
});

describe('resolveNearbyOrigin', () => {
  const city: City = {
    id: 'fln',
    name: 'Florianópolis',
    uf: 'SC',
    lat: -27.5954,
    lng: -48.548,
  };
  const coords: LatLng = { lat: -27.591, lng: -48.523 };

  it('retorna coords quando status granted e coords presente', () => {
    expect(resolveNearbyOrigin(coords, 'granted', city)).toEqual(coords);
  });

  it('cai para o centro da cidade quando coords é null', () => {
    expect(resolveNearbyOrigin(null, 'granted', city)).toEqual({
      lat: city.lat,
      lng: city.lng,
    });
  });

  it('cai para o centro da cidade quando status não é granted', () => {
    const statuses: LocationStatus[] = ['idle', 'loading', 'denied'];
    for (const status of statuses) {
      expect(resolveNearbyOrigin(coords, status, city)).toEqual({
        lat: city.lat,
        lng: city.lng,
      });
    }
  });
});
