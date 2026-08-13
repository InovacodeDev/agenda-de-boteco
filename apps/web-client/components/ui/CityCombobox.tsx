'use client';

import type { City } from '@agenda/core';
import { CaretDownIcon } from '@phosphor-icons/react';
import { useMemo, useRef, useState } from 'react';

/** UFs para a cidade nova. `cities` exige a sigla, e o dono só digita o nome. */
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

/** Mesma normalização do slugify do banco, para o filtro casar com a dedup. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Campo de cidade: digitável, com autocomplete sobre o catálogo. Se o texto não
 * casar com nenhuma cidade, oferece criar — pedindo a UF, que a tabela exige.
 * O autocomplete existe justamente para que um typo não vire cidade nova.
 */
export function CityCombobox({
  cities,
  value,
  onSelect,
  onCreate,
  inputClassName,
}: {
  cities: City[];
  /** Id da cidade escolhida, ou '' enquanto não houver escolha. */
  value: string;
  onSelect: (cityId: string) => void;
  onCreate: (name: string, uf: string) => Promise<void>;
  inputClassName: string;
}) {
  const selected = cities.find((city) => city.id === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [uf, setUf] = useState('');
  const [creating, setCreating] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enquanto o campo está fechado, mostra a cidade escolhida; ao digitar, o texto.
  const text = open ? query : (selected?.name ?? '');

  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q) return cities;
    return cities.filter((city) => normalize(city.name).includes(q));
  }, [cities, query]);

  // Só oferece criar quando nada bate exatamente — evita duplicar por acento.
  const exact = matches.some((city) => normalize(city.name) === normalize(query));
  const canOfferCreate = query.trim().length >= 2 && !exact;

  const close = () => {
    setOpen(false);
    setQuery('');
    setUf('');
  };

  const handleCreate = async () => {
    if (!uf || creating) return;
    setCreating(true);
    try {
      await onCreate(query.trim(), uf);
      close();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        // Só fecha quando o foco sai do combobox inteiro — clicar numa opção
        // dispara blur no input antes do click, e fechar aqui o cancelaria.
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        blurTimer.current = setTimeout(close, 120);
      }}
      onFocus={() => {
        if (blurTimer.current) clearTimeout(blurTimer.current);
      }}
    >
      <input
        id="city"
        value={text}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery(selected?.name ?? '');
          setOpen(true);
        }}
        placeholder="São Paulo"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        className={`${inputClassName} pr-10`}
      />
      <CaretDownIcon
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />

      {open ? (
        <div className="absolute z-10 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover p-1.5 shadow-[var(--shadow-card)]">
          {matches.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => {
                onSelect(city.id);
                close();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-surface-elevated"
            >
              {city.name}
              <span className="text-[12px] text-muted-foreground">{city.uf}</span>
            </button>
          ))}

          {matches.length === 0 && !canOfferCreate ? (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">
              Nenhuma cidade encontrada.
            </p>
          ) : null}

          {canOfferCreate ? (
            <div className="mt-1 flex flex-col gap-2 border-t border-border px-3 pb-1 pt-2.5">
              <span className="text-[13px] text-muted-foreground">
                Cadastrar <span className="text-foreground">{query.trim()}</span> — escolha o
                estado:
              </span>
              <div className="flex gap-2">
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  aria-label="Estado da nova cidade"
                  className="h-10 rounded-lg border border-border bg-surface px-2.5 text-[14px] text-foreground outline-none focus:border-primary"
                >
                  <option value="">UF</option>
                  {UFS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!uf || creating}
                  onClick={() => void handleCreate()}
                  className="h-10 flex-1 rounded-lg bg-primary px-3 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Cadastrando…' : 'Cadastrar cidade'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
