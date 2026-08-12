import './globals.css';

import { fontVariables } from '@agenda/core/next-fonts';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';

const DESCRIPTION =
  'Descubra shows, samba, sertanejo e transmissão de jogo nos bares da sua cidade. ' +
  'Filtre por estilo musical, distância e diferenciais do bar. Grátis, sem anúncios.';

// Base absoluta das imagens de OG/Twitter. NEXT_PUBLIC_SITE_URL manda quando
// houver domínio próprio; na Vercel, VERCEL_URL já resolve por deploy. Sem
// nenhum dos dois (dev), localhost basta — o crawler não roda ali.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:8087');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Agenda de Boteco · Eventos e bares da sua cidade',
    template: '%s · Agenda de Boteco',
  },
  description: DESCRIPTION,
  keywords: ['bares', 'eventos', 'música ao vivo', 'boteco', 'samba', 'agenda cultural'],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Agenda de Boteco',
    title: 'Agenda de Boteco · Eventos e bares da sua cidade',
    description: DESCRIPTION,
    images: [{ url: '/logo.png', width: 811, height: 582, alt: 'Agenda de Boteco' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agenda de Boteco · Eventos e bares da sua cidade',
    description: DESCRIPTION,
    images: ['/logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVariables} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
