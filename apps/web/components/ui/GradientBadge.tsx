import { SparklesIcon } from './icons';

export interface GradientBadgeProps {
  label: string;
}

/** Badge "Cortesia"/"Promoção" com gradiente laranja→rosa do protótipo. */
export function GradientBadge({ label }: GradientBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 self-start rounded-full bg-[linear-gradient(135deg,#F9A91F,#FF4DA6)] px-3 py-1 text-primary-foreground">
      <SparklesIcon size={12} />
      <span className="text-[12px] font-[family-name:var(--font-body)] font-semibold">{label}</span>
    </span>
  );
}
