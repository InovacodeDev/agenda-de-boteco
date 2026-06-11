import type { MapStyleElement } from 'react-native-maps';

/**
 * Estilo dark do Google Maps alinhado aos tokens do tema
 * (background #0F0F0F, surfaces #1C1C1C/#242424, texto #A6A6A6).
 */
export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#0F0F0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A6A6A6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F0F0F' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#292929' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#171717' }],
  },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#242424' }] },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2E2E2E' }],
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#141414' }] },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5C5C5C' }],
  },
];
