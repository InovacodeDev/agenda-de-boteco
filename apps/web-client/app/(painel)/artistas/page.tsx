'use client';

import { type MusicianLeadSort, useMusicStylesQuery } from '@agenda/core';
import { Select, TextInput } from '@agenda/shared-ui';
import { MicrophoneStageIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { MusicianLeadCard } from '@/components/MusicianLeadCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMusicianLeads } from '@/hooks/use-musician-leads';

const DEBOUNCE_MS = 300;

/** Atrasa a atualização de um valor digitado, para não disparar a RPC a cada tecla. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Dispara `onIntersect` quando a sentinela entra em viewport, enquanto `enabled`. */
function useInfiniteScrollSentinel(onIntersect: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        onIntersect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return ref;
}

export default function ArtistasPage() {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [musicStyleId, setMusicStyleId] = useState('');
  const [sort, setSort] = useState<MusicianLeadSort>('recent');

  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_MS);
  const debouncedRegion = useDebouncedValue(region, DEBOUNCE_MS);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      region: debouncedRegion || undefined,
      musicStyleId: musicStyleId || undefined,
    }),
    [debouncedSearch, debouncedRegion, musicStyleId],
  );

  const { data: musicStyles = [] } = useMusicStylesQuery();
  const styleById = useMemo(() => new Map(musicStyles.map((s) => [s.id, s])), [musicStyles]);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useMusicianLeads(
    filters,
    sort,
  );
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  const sentinelRef = useInfiniteScrollSentinel(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
      <header>
        <h1 className="font-heading text-foreground text-2xl font-bold">Artistas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Músicos que se cadastraram para tocar no seu bar.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
        />

        <Select value={musicStyleId} onValueChange={setMusicStyleId} className="pr-3">
          <Select.Option value="">Todos os estilos</Select.Option>
          {musicStyles.map((style) => (
            <Select.Option key={style.id} value={style.id}>
              {style.emoji} {style.name}
            </Select.Option>
          ))}
        </Select>

        <TextInput
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Buscar por região..."
        />

        <Select value={sort} onValueChange={(v) => setSort(v as MusicianLeadSort)} className="pr-3">
          <Select.Option value="recent">Mais recentes</Select.Option>
          <Select.Option value="name">Nome</Select.Option>
          <Select.Option value="region">Região</Select.Option>
        </Select>
      </div>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : items.length > 0 ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            {items.map((lead) => (
              <MusicianLeadCard key={lead.id} lead={lead} styleById={styleById} />
            ))}
          </section>
          <div ref={sentinelRef} />
          {isFetchingNextPage ? (
            <p className="text-muted-foreground text-center text-sm">Carregando mais…</p>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<MicrophoneStageIcon size={32} weight="regular" aria-hidden />}
          message="Nenhum artista encontrado."
        />
      )}
    </div>
  );
}
