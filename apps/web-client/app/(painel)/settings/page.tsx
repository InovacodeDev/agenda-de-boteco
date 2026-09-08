'use client';

import { useFeatureFlag } from '@agenda/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AccountSection } from '@/components/settings/AccountSection';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';

export default function SettingsPage() {
  const router = useRouter();
  const enabled = useFeatureFlag('panel-settings');
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) router.replace('/');
  }, [enabled, router]);

  if (!enabled) return null;

  const showNotice = (message: string) => {
    setGlobalNotice(message);
    setTimeout(() => {
      setGlobalNotice(null);
    }, 4000);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie preferências de conta, notificações e privacidade.
          </p>
        </div>

        {globalNotice ? (
          <div
            role="status"
            className="border-primary/30 bg-primary/10 text-primary animate-fade-in rounded-xl border px-3.5 py-1.5 text-xs font-medium"
          >
            {globalNotice}
          </div>
        ) : null}
      </header>

      <AccountSection onSuccessNotice={showNotice} />
      <NotificationsSection />
      <DangerZoneSection />
    </div>
  );
}
