/** Badge de contagem de não-lidos. Não renderiza nada quando count é 0. */
export function NavBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  return (
    <span
      aria-label={`${count} não lidos`}
      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
