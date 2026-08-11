'use client';

import { Button } from './Button';

export function PageHeader({
  title,
  onNew,
}: {
  title: string;
  onNew: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
        {title}
      </h1>
      <Button onClick={onNew}>+ Novo</Button>
    </div>
  );
}
