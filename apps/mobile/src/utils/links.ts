export interface DirectionsDestination {
  lat: number;
  lng: number;
  /** Apenas informativo (acessibilidade/analytics) — não entra na URL. */
  label?: string;
}

/** URL universal de rotas do Google Maps (funciona em iOS, Android e web). */
export function buildDirectionsUrl(dest: DirectionsDestination): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}

/** Link wa.me, com texto pré-preenchido URL-encoded quando fornecido. */
export function buildWhatsAppUrl(phone: string, text?: string): string {
  const base = `https://wa.me/${phone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
