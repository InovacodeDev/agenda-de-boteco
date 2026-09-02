'use client';

import type { Event } from '@agenda/core';
import { Sidebar } from '@agenda/shared-ui';
import { EyeIcon, HeartIcon, MapPinIcon, PhoneIcon, ShareNetworkIcon } from '@phosphor-icons/react';

import { MetricsSparkline } from '@/components/MetricsSparkline';
import type { DayBucket, EventMetricsSummary } from '@/hooks/use-owned-metrics';

const CLICK_ROWS: { key: 'click_map' | 'click_contact' | 'click_share'; label: string; icon: typeof MapPinIcon }[] = [
  { key: 'click_map', label: 'Como chegar', icon: MapPinIcon },
  { key: 'click_contact', label: 'WhatsApp/telefone', icon: PhoneIcon },
  { key: 'click_share', label: 'Compartilhar', icon: ShareNetworkIcon },
];

export function EventMetricsDrawer({
  event,
  summary,
  byDay,
  open,
  onOpenChange,
}: {
  event: Event | null;
  summary: EventMetricsSummary | null;
  byDay: DayBucket[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sidebar open={open} onOpenChange={onOpenChange} title={event?.name ?? 'Detalhes do evento'}>
      {event && summary ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <EyeIcon size={16} weight="regular" className="text-muted-foreground" aria-hidden />
            <span className="text-foreground text-sm font-medium">{summary.views} visualizações</span>
          </div>

          <div className="flex flex-col gap-3">
            {CLICK_ROWS.map(({ key, label, icon: RowIcon }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                  <RowIcon size={14} weight="regular" aria-hidden />
                  {label}
                </span>
                <span className="text-foreground text-sm font-medium">{summary.clicksByKind[key]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                <HeartIcon size={14} weight="regular" aria-hidden />
                Favoritos
              </span>
              <span className="text-foreground text-sm font-medium">{summary.favorites}</span>
            </div>
          </div>

          <div>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium uppercase">Evolução</h3>
            <MetricsSparkline data={byDay} />
          </div>
        </div>
      ) : null}
    </Sidebar>
  );
}
