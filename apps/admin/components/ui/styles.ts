// Vocabulário visual espelhando apps/web (SearchBar, FiltersSidebar, botões),
// traduzido para o tema claro. Centralizado para não duplicar a string.
//
// Inputs: h-12 + rounded-2xl + surface-elevated, sem borda (igual web); foco via ring.
export const INPUT_CLASS =
  'h-12 w-full rounded-2xl bg-surface-elevated px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary';

// Botões: rounded-2xl, semibold, hover por opacidade — como os CTAs do web.
export const BTN_PRIMARY =
  'flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-50';

export const BTN_GHOST =
  'flex h-12 items-center justify-center rounded-2xl bg-surface-elevated px-5 text-[14px] font-[family-name:var(--font-body)] font-medium text-foreground transition-opacity hover:opacity-80 disabled:opacity-50';

export const BTN_DANGER =
  'flex h-12 items-center justify-center rounded-2xl bg-destructive px-5 text-[14px] font-[family-name:var(--font-body)] font-semibold text-destructive-foreground transition-opacity hover:opacity-80 disabled:opacity-50';
