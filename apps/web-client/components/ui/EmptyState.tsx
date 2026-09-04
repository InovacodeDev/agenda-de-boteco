import type { ReactNode } from 'react';

// ponytail: cópia local em vez de reuso. O EmptyState do design system existe em
// duas versões e nenhuma serve: o de apps/mobile é React Native (@/tw) e o de
// apps/web mora na árvore de outro app (sem alias entre apps). Promover para
// @agenda/core exigiria mover JSX para um pacote hoje platform-agnostic.
export function EmptyState({
  icon,
  message,
  children,
}: {
  icon?: ReactNode;
  message: string;
  /** CTA opcional — Link ou botão, renderizado sob a mensagem. */
  children?: ReactNode;
}) {
  return (
    <div className="border-border bg-card flex flex-col items-center justify-center gap-4 rounded-2xl border px-6 py-16 text-center">
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <p className="text-muted-foreground text-sm">{message}</p>
      {children}
    </div>
  );
}
