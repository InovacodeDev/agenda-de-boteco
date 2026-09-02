import { CITIES } from '../data';
import type { City } from '../schemas';
import type { LocationStatus } from '../types';
import {
  buildVirtualCity,
  coarseLatLng,
  haversineDistanceKm,
  isVirtualCityId,
  type LatLng,
  nearestCity,
  resolveCityFromLocation,
  resolveMapOrigin,
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

describe('resolveMapOrigin', () => {
  const city: City = {
    id: 'fln',
    name: 'Florianópolis',
    uf: 'SC',
    lat: -27.5954,
    lng: -48.548,
  };
  const cityCenter: LatLng = { lat: city.lat, lng: city.lng };
  const nearby: LatLng = { lat: -27.591, lng: -48.523 };

  it('retorna as coords quando o usuário está dentro do raio da cidade ativa', () => {
    expect(resolveMapOrigin(nearby, 'granted', city)).toEqual(nearby);
  });

  it('cai para o centro da cidade quando o usuário está fora do raio', () => {
    // Curitiba/PR — ~250 km de Florianópolis, muito além dos 40 km.
    const faraway: LatLng = { lat: -25.4284, lng: -49.2733 };
    expect(resolveMapOrigin(faraway, 'granted', city)).toEqual(cityCenter);
  });

  it('cai para o centro da cidade quando o status não é granted', () => {
    const statuses: LocationStatus[] = ['idle', 'loading', 'denied'];
    for (const status of statuses) {
      expect(resolveMapOrigin(nearby, status, city)).toEqual(cityCenter);
    }
  });

  it('cai para o centro da cidade quando não há coords', () => {
    expect(resolveMapOrigin(null, 'granted', city)).toEqual(cityCenter);
  });

  it('retorna null quando a cidade ativa ainda não resolveu', () => {
    expect(resolveMapOrigin(nearby, 'granted', undefined)).toBeNull();
  });

  it('usa as coords do usuário quando a cidade ativa é virtual (mesma posição)', () => {
    const coords: LatLng = { lat: -3.119, lng: -60.0217 };
    const virtual = buildVirtualCity(coords, { city: 'Manaus', uf: 'AM' });
    expect(resolveMapOrigin(coords, 'granted', virtual)).toEqual(coords);
  });
});

describe('isVirtualCityId', () => {
  it('reconhece ids virtuais (prefixo geo:)', () => {
    expect(isVirtualCityId('geo:-27.595,-48.548')).toBe(true);
  });

  it('rejeita ids de catálogo', () => {
    expect(isVirtualCityId('fln')).toBe(false);
    expect(isVirtualCityId('sao')).toBe(false);
  });
});

describe('buildVirtualCity', () => {
  const coords: LatLng = { lat: -26.3045, lng: -48.8487 }; // Joinville/SC

  it('usa nome e UF do reverse geocode', () => {
    const city = buildVirtualCity(coords, { city: 'Joinville', uf: 'SC' });
    expect(city.name).toBe('Joinville');
    expect(city.uf).toBe('SC');
  });

  it('preserva as coordenadas reais (não arredondadas) na City', () => {
    const city = buildVirtualCity(coords, { city: 'Joinville', uf: 'SC' });
    expect(city.lat).toBe(-26.3045);
    expect(city.lng).toBe(-48.8487);
  });

  it('deriva um id virtual estável a partir das coords arredondadas (3 casas)', () => {
    const city = buildVirtualCity(coords, { city: 'Joinville', uf: 'SC' });
    expect(city.id).toBe('geo:-26.304,-48.849');
    expect(isVirtualCityId(city.id)).toBe(true);
  });

  it('o id é estável para micro-variações de GPS dentro do mesmo bucket', () => {
    const a = buildVirtualCity({ lat: -26.3041, lng: -48.8486 }, { city: 'X', uf: 'SC' });
    const b = buildVirtualCity({ lat: -26.3043, lng: -48.8488 }, { city: 'X', uf: 'SC' });
    expect(a.id).toBe(b.id);
    expect(a.id).toBe('geo:-26.304,-48.849');
  });

  it('usa rótulo genérico quando o geocode não traz cidade', () => {
    const city = buildVirtualCity(coords, { city: null, uf: 'SC' });
    expect(city.name).toBe('Sua localização');
  });

  it('usa -- quando a UF é ausente ou inválida (citySchema exige 2 chars)', () => {
    expect(buildVirtualCity(coords, { city: 'X', uf: null }).uf).toBe('--');
    expect(buildVirtualCity(coords, { city: 'X', uf: 'Santa Catarina' }).uf).toBe('--');
  });

  it('normaliza a UF para maiúsculas', () => {
    expect(buildVirtualCity(coords, { city: 'X', uf: 'sc' }).uf).toBe('SC');
  });
});

describe('resolveCityFromLocation', () => {
  const noGeocode = { city: null, uf: null };

  it('usa a cidade do catálogo quando o usuário está dentro do raio metropolitano', () => {
    // Centro de Florianópolis — praticamente sobre a cidade do catálogo "fln".
    const coords: LatLng = { lat: -27.5954, lng: -48.548 };
    const result = resolveCityFromLocation(coords, noGeocode, CITIES);
    expect(result.isCatalog).toBe(true);
    expect(result.city.id).toBe('fln');
  });

  it('cria cidade virtual quando o usuário está longe de qualquer cidade do catálogo', () => {
    // Manaus/AM — distante de todas as cidades do catálogo.
    const coords: LatLng = { lat: -3.119, lng: -60.0217 };
    const result = resolveCityFromLocation(coords, { city: 'Manaus', uf: 'AM' }, CITIES);
    expect(result.isCatalog).toBe(false);
    expect(result.city.name).toBe('Manaus');
    expect(result.city.uf).toBe('AM');
    expect(isVirtualCityId(result.city.id)).toBe(true);
    // Mantém as coords reais (feed de proximidade usa a posição do usuário).
    expect(result.city.lat).toBe(-3.119);
  });

  it('cria cidade virtual quando o catálogo está vazio', () => {
    const coords: LatLng = { lat: -27.5954, lng: -48.548 };
    const result = resolveCityFromLocation(coords, { city: 'Floripa', uf: 'SC' }, []);
    expect(result.isCatalog).toBe(false);
    expect(isVirtualCityId(result.city.id)).toBe(true);
  });
});
