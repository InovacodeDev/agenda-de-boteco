import { useFeatureFlag } from '@agenda/core';

export type PanelFlag = 'panel-metrics' | 'panel-reviews' | 'panel-settings';

/** Mesmas flags e rotas do `Sidebar` do web-client — o PostHog é o mesmo projeto. */
const ROUTE_BY_FLAG: Record<PanelFlag, string> = {
  'panel-metrics': '/metrics',
  'panel-reviews': '/reviews',
  'panel-settings': '/settings',
};

export function usePanelFlags(): Record<PanelFlag, boolean> {
  return {
    'panel-metrics': useFeatureFlag('panel-metrics'),
    'panel-reviews': useFeatureFlag('panel-reviews'),
    'panel-settings': useFeatureFlag('panel-settings'),
  };
}

export function isBlockedPanelRoute(
  pathname: string,
  flags: Record<PanelFlag, boolean>,
): boolean {
  return (Object.keys(ROUTE_BY_FLAG) as PanelFlag[]).some(
    (flag) => !flags[flag] && pathname.includes(ROUTE_BY_FLAG[flag]),
  );
}
