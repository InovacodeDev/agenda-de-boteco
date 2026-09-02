'use client';

import { XIcon } from '@phosphor-icons/react';
import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export function Sidebar({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        {/* ponytail: sem tailwindcss-animate no repo (nenhum @plugin/animate-in existente) — sem
            classes de enter/exit orquestradas por data-state (adicionar quando o plugin entrar). */}
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card p-6 shadow-lg"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <RadixDialog.Title className="font-heading text-lg font-bold text-foreground">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Fechar"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon size={20} weight="bold" />
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
