'use client';

import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import * as RadixSelect from '@radix-ui/react-select';
import type { ReactNode } from 'react';

import { SELECT_CLASS } from './styles';

// Radix não aceita Item com value="" (reservado para "sem seleção" no runtime
// interno). Opções vazias ("Nenhum"/"Selecione…") usam este sentinel por fora,
// convertido de volta a "" na fronteira do Select — a API pública continua
// aceitando value="" como qualquer outro <select> controlado.
const EMPTY_VALUE = '__select-empty__';

type SelectOptionProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

function SelectOption({ value, children, className = '' }: SelectOptionProps) {
  return (
    <RadixSelect.Item
      value={value === '' ? EMPTY_VALUE : value}
      className={`relative flex h-10 cursor-pointer select-none items-center rounded-lg pl-4 pr-9 text-[14px] text-foreground outline-none data-[highlighted]:bg-surface-elevated data-[highlighted]:outline-none ${className}`}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-3 inline-flex items-center">
        <CheckIcon size={16} weight="bold" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}

export function Select({
  value,
  onValueChange,
  children,
  className = '',
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  placeholder?: string;
}) {
  return (
    // relative: contém o <select> nativo oculto que o Radix usa para bubbling
    // de formulário (position: absolute, sem ancestral posicionado ele escapa
    // pro <html>, e o navegador soma essa altura ao scrollHeight do documento —
    // fazendo a página inteira ganhar uma barra de rolagem fantasma.
    <div className="relative">
      <RadixSelect.Root
        value={value === '' ? EMPTY_VALUE : value}
        onValueChange={(next) => onValueChange(next === EMPTY_VALUE ? '' : next)}
      >
        <RadixSelect.Trigger
          className={`${SELECT_CLASS} flex items-center justify-between ${className}`}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon className="text-muted-foreground">
            <CaretDownIcon size={16} weight="bold" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-[--radix-select-content-available-height] w-[--radix-select-trigger-width] overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-lg"
          >
            <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}

Select.Option = SelectOption;
