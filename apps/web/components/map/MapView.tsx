'use client';

import 'leaflet/dist/leaflet.css';

import { type Establishment } from '@agenda/core';
import L from 'leaflet';
import Link from 'next/link';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

export interface MapViewProps {
  establishments: Establishment[];
  center: [number, number];
}

// ponytail: divIcon inline resolve o clássico "marker quebrado" do leaflet no bundler
// (os PNGs default resolvem caminhos errados) sem precisar copiar assets nem mexer no webpack.
const markerIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:var(--color-primary,#ff4da6);border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,0.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
});

/** Mapa interativo (OpenStreetMap) com um marker por bar da cidade ativa. */
export default function MapView({ establishments, center }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-[60vh] min-h-[400px] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {establishments.map((establishment) => (
        <Marker
          key={establishment.id}
          position={[establishment.lat, establishment.lng]}
          icon={markerIcon}
        >
          <Popup>
            <Link
              href={`/establishment/${establishment.id}`}
              className="font-semibold text-primary"
            >
              {establishment.name}
            </Link>
            <div className="text-muted-foreground">{establishment.neighborhood}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
