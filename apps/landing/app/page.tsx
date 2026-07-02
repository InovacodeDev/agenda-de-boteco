import { DownloadButtons } from '@/components/DownloadButtons';

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[linear-gradient(160deg,#1A122B,#0F0F0F)]">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 text-[40px]">
            🍺
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-[40px] font-bold leading-tight text-foreground">
            Agenda de <span className="text-primary">Boteco</span>
          </h1>
          <p className="max-w-md text-[16px] leading-6 text-muted-foreground">
            Os melhores eventos e bares da sua cidade, sempre à mão. Baixe o app e
            descubra o que rola na noite.
          </p>
        </div>

        <DownloadButtons />

        <a
          href="/app"
          className="text-[14px] font-semibold text-primary underline-offset-4 hover:underline"
        >
          Entrar no app web →
        </a>
      </div>

      <footer className="flex flex-col items-center gap-2 px-6 pb-8 text-center">
        <p className="text-[12px] text-muted-foreground">
          © 2026 Agenda de Boteco ·{' '}
          <a href="/app/privacidade" className="hover:text-foreground">
            Privacidade
          </a>
        </p>
        <a href="/admin" className="text-[12px] text-muted-foreground hover:text-foreground">
          Painel admin
        </a>
      </footer>
    </main>
  );
}
