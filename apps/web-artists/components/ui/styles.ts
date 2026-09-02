// Vocabulário visual espelhando o painel do estabelecimento (web-client): as
// classes referenciam tokens de tema, então só globals.css muda entre os apps.
export const INPUT_CLASS =
  'h-12 w-full rounded-2xl bg-surface-elevated px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary';

export const BTN_PRIMARY =
  'flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-50';

export const BTN_GHOST =
  'flex h-12 items-center justify-center rounded-2xl bg-surface-elevated px-5 text-[14px] font-[family-name:var(--font-body)] font-medium text-foreground transition-opacity hover:opacity-80 disabled:opacity-50';
