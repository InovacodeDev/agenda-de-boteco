'use client';

import {
  ESTABLISHMENT_ATTRIBUTES,
  type EstablishmentAttribute,
  getAttributeMeta,
} from '@agenda/core';
import { CaretDownIcon, XIcon } from '@phosphor-icons/react';
import { useMemo, useRef, useState } from 'react';

import { AttributeIcon } from './AttributeIcon';

/** Ignora acento e caixa, para "musica" achar "Música ao Vivo". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Seleção múltipla de diferenciais com busca, no formato do autocomplete
 * multi-valor: os escolhidos viram chips removíveis dentro do próprio campo e
 * saem da lista de sugestões. Não cria valores novos — a lista é o enum do
 * banco, e um atributo fora dele não seria pesquisável no app nem no site.
 */
export function AttributeAutocomplete({
  value,
  onChange,
  inputClassName,
}: {
  value: EstablishmentAttribute[];
  onChange: (next: EstablishmentAttribute[]) => void;
  inputClassName: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const available = useMemo(() => {
    const q = normalize(query);
    return ESTABLISHMENT_ATTRIBUTES.filter(
      (attr) => !value.includes(attr.id) && (!q || normalize(attr.label).includes(q)),
    );
  }, [query, value]);

  const add = (id: EstablishmentAttribute) => {
    onChange([...value, id]);
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (id: EstablishmentAttribute) =>
    onChange(value.filter((item) => item !== id));

  return (
    <div
      className="relative"
      onBlur={(event) => {
        // Clicar numa opção dispara blur no input antes do click; só fecha
        // quando o foco sai do componente inteiro.
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        blurTimer.current = setTimeout(() => {
          setOpen(false);
          setQuery('');
        }, 120);
      }}
      onFocus={() => {
        if (blurTimer.current) clearTimeout(blurTimer.current);
      }}
    >
      {/* O campo inteiro é clicável e leva o foco ao input, como no MUI. */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`${inputClassName} flex min-h-12 flex-wrap items-center gap-1.5 pr-10`}
      >
        {value.map((id) => {
          const meta = getAttributeMeta(id);
          return (
            <span
              key={id}
              className="flex items-center gap-1.5 rounded-full bg-primary py-1 pl-2.5 pr-1.5 text-[13px] font-medium text-primary-foreground"
            >
              <AttributeIcon name={meta.icon} size={14} />
              {meta.label}
              <button
                type="button"
                aria-label={`Remover ${meta.label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  remove(id);
                }}
                className="rounded-full p-0.5 transition-opacity hover:opacity-70"
              >
                <XIcon size={12} weight="bold" />
              </button>
            </span>
          );
        })}

        <input
          ref={inputRef}
          id="attributes"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            // Backspace no campo vazio remove o último chip, como no MUI.
            if (e.key === 'Backspace' && !query && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={value.length === 0 ? 'Busque e selecione os diferenciais' : ''}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          className="min-w-[10ch] flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <CaretDownIcon
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />

      {open ? (
        <div className="absolute z-10 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover p-1.5 shadow-[var(--shadow-card)]">
          {available.map((attr) => (
            <button
              key={attr.id}
              type="button"
              title={attr.description}
              onClick={() => add(attr.id)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-surface-elevated"
            >
              <AttributeIcon name={attr.icon} />
              {attr.label}
            </button>
          ))}

          {available.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">
              {value.length === ESTABLISHMENT_ATTRIBUTES.length
                ? 'Todos os diferenciais já foram selecionados.'
                : 'Nenhum diferencial encontrado.'}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
