'use client';

import {
  type CatalogPage,
  flattenPages,
  useEstablishmentsQuery,
  useEventsQuery,
  useNotificationsQuery,
} from '@agenda/core';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <span className="text-[12px] font-[family-name:var(--font-body)] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-[family-name:var(--font-heading)] text-[32px] font-bold leading-tight text-foreground">
        {value}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const establishmentsQuery = useEstablishmentsQuery();
  const eventsQuery = useEventsQuery();
  const notificationsQuery = useNotificationsQuery();

  const count = (q: {
    isLoading: boolean;
    data?: { pages: CatalogPage<unknown>[]; pageParams: unknown[] };
  }) => (q.isLoading ? '…' : flattenPages(q.data).length);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Estabelecimentos" value={count(establishmentsQuery)} />
        <StatCard label="Eventos" value={count(eventsQuery)} />
        <StatCard label="Avisos" value={count(notificationsQuery)} />
      </div>
    </div>
  );
}
