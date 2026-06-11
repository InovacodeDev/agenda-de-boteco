import { CITIES } from '../data/mock';
import { haversineDistanceKm, type LatLng, nearestCity } from './geo';

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
