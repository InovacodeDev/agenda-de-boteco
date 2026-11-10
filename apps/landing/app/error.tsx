'use client';

import { reportException } from '@agenda/core';
import { RouteErrorFallback } from '@agenda/shared-ui';
import { useEffect } from 'react';

export default function Error({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    reportException(error, { method: 'next.routeError' });
  }, [error]);

  return <RouteErrorFallback onRetry={retry} />;
}
