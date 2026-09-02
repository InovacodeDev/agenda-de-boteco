'use client';

import type { Event } from '@agenda/core';
import { EyeIcon, HeartIcon, MagnifyingGlassIcon, MapPinIcon } from '@phosphor-icons/react';

import type { EventMetricsSummary } from '@/hooks/use-owned-metrics';

export function EventMetricsRow({
  event,
  summary,
  onViewDetails,
}: {
  event: Event;
  summary: EventMetricsSummary;
  onViewDetails: () => void;
}) {
  const clicks =
    summary.clicksByKind.click_map + summary.clicksByKind.click_contact + summary.clicksByKind.click_share;

  return (
    <tr className="border-border border-b last:border-0">
      <td className="text-foreground py-3 pr-4 text-sm font-medium">{event.name}</td>
      <td className="text-muted-foreground py-3 pr-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <EyeIcon size={14} weight="regular" aria-hidden />
          {summary.views}
        </span>
      </td>
      <td className="text-muted-foreground py-3 pr-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <MapPinIcon size={14} weight="regular" aria-hidden />
          {clicks}
        </span>
      </td>
      <td className="text-muted-foreground py-3 pr-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <HeartIcon size={14} weight="regular" aria-hidden />
          {summary.favorites}
        </span>
      </td>
      <td className="py-3">
        <button
          type="button"
          onClick={onViewDetails}
          title="Ver detalhes"
          aria-label={`Ver detalhes de métricas de ${event.name}`}
          className="bg-surface-elevated text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
        >
          <MagnifyingGlassIcon size={16} weight="regular" aria-hidden />
        </button>
      </td>
    </tr>
  );
}
