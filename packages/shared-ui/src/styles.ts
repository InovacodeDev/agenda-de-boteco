// Vocabulário visual compartilhado entre painéis claro (admin) e escuro
// (web-client, web, landing). As classes referenciam tokens de tema
// (bg-surface-elevated, text-foreground, bg-primary...), então o mesmo arquivo
// serve aos dois temas — só o @theme do globals.css de cada app muda o valor.
//
// Inputs: h-12 + rounded-2xl + surface-elevated, sem borda; foco via ring.
export const INPUT_CLASS =
  'h-12 w-full rounded-2xl bg-surface-elevated px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary';

// Select: como o input. O ícone da seta é filho do flex do Trigger (Radix),
// não posicionado à parte — pr-4 dá a ele a mesma margem do pl-4 do texto.
export const SELECT_CLASS =
  'h-12 w-full rounded-2xl bg-surface-elevated pl-4 pr-4 text-[14px] font-[family-name:var(--font-body)] text-foreground outline-none focus:ring-2 focus:ring-primary';

// Botões: rounded-2xl, semibold, hover por opacidade.
export const BTN_PRIMARY =
  'flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-[14px] font-[family-name:var(--font-body)] font-semibold text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-50';

export const BTN_GHOST =
  'flex h-12 items-center justify-center rounded-2xl bg-surface-elevated px-5 text-[14px] font-[family-name:var(--font-body)] font-medium text-foreground transition-opacity hover:opacity-80 disabled:opacity-50';

export const BTN_DANGER =
  'flex h-12 items-center justify-center rounded-2xl bg-destructive px-5 text-[14px] font-[family-name:var(--font-body)] font-semibold text-destructive-foreground transition-opacity hover:opacity-80 disabled:opacity-50';
