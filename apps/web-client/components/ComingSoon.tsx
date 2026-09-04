'use client';

import Link from 'next/link';

/** Placeholder das telas ainda não implementadas (spec seção 2). */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-card)]">
        <span
          aria-hidden
          className="h-16 w-16 rounded-full bg-primary/15 shadow-[var(--shadow-neon)]"
        />
        <h1 className="font-[family-name:var(--font-heading)] text-[20px] font-bold text-foreground">
          {title}
        </h1>
        <p className="text-[14px] text-muted-foreground">{description}</p>
        <span className="rounded-md bg-primary/15 px-3 py-1 text-[12px] font-semibold text-primary">
          Em breve
        </span>
        <Link
          href="/"
          className="rounded-full bg-surface-elevated px-5 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
