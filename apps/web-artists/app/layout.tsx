import './globals.css';

import { fontVariables } from '@agenda/core/next-fonts';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';

import { Providers } from '@/app/providers';

export const metadata: Metadata = {
  title: 'Agenda de Boteco — Para Artistas',
  description: 'Cadastre-se para que os bares da sua região entrem em contato e marquem seu show.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVariables} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
