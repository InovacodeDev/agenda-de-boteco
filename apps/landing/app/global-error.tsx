'use client';

import './globals.css';

import { reportException } from '@agenda/core';
import { RouteErrorFallback } from '@agenda/shared-ui';
import { useEffect } from 'react';

export default function GlobalError({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    reportException(error, { method: 'next.globalError' });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-background">
        <RouteErrorFallback onRetry={retry} />
      </body>
    </html>
  );
}
