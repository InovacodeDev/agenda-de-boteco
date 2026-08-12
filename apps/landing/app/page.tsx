import Image from 'next/image';

import { DownloadButtons } from '@/components/DownloadButtons';

// Em produção os apps vivem sob /app e /admin no mesmo domínio (rewrites do
// vercel.json), então o path relativo basta. Em dev, apontar para as URLs dos
// apps rodando em portas próprias via env (o basePath deles já inclui /app|/admin).
const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? '';
const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_URL ?? '';

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[linear-gradient(160deg,#1A122B,#0F0F0F)]">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="Agenda de Boteco"
            width={811}
            height={582}
            priority
            className="h-auto w-[min(280px,70vw)] min-w-[150px]"
          />
          <p className="max-w-md text-[16px] leading-6 text-muted-foreground">
            Os melhores eventos e bares da sua cidade, sempre à mão. Baixe o app e
            descubra o que rola na noite.
          </p>
        </div>

        <DownloadButtons />

        <a
          href={`${WEB_BASE}/app`}
          className="text-[14px] font-semibold text-primary underline-offset-4 hover:underline"
        >
          Entrar no app web →
        </a>
      </div>

      <footer className="flex flex-col items-center gap-2 px-6 pb-8 text-center">
        <p className="text-[12px] text-muted-foreground">
          © 2026 Agenda de Boteco ·{' '}
          <a href={`${WEB_BASE}/app/privacidade`} className="hover:text-foreground">
            Privacidade
          </a>{' '}
          ·{' '}
          <a href="/suporte" className="hover:text-foreground">
            Suporte
          </a>
        </p>
        <a href={`${ADMIN_BASE}/admin`} className="text-[12px] text-muted-foreground hover:text-foreground">
          Painel admin
        </a>
      </footer>
    </main>
  );
}
