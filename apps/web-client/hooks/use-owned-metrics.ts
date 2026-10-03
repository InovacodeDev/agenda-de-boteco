'use client';

import { catalogKeys } from '@agenda/core';

export const metricsKeys = catalogKeys.panel;

export {
  aggregateMetrics,
  type DayBucket,
  type EventMetricsSummary,
  useOwnedFavoritesCount,
  useOwnedMetrics,
} from '@agenda/core';
