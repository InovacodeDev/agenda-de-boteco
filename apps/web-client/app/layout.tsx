import './globals.css';

import { fontVariables } from '@agenda/core/next-fonts';
import type { Metadata } from 'next';

import { Providers } from '@/app/providers';

export const metadata: Metadata = {
  title: 'Agenda de Boteco — Painel do Estabelecimento',
  description: 'Gerencie o perfil, a agenda e os eventos do seu bar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVariables} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
