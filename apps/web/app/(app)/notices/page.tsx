'use client';

import {
  FEATURES,
  isNotificationUnread,
  useNotificationsQuery,
  useNotificationsStore,
} from '@agenda/core';

import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { NotificationCard } from '@/components/notification/NotificationCard';

function BellIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function NotificationsContent() {
  const readIds = useNotificationsStore((state) => state.readIds);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);

  const { data: notifications } = useNotificationsQuery();
  const list = notifications ?? [];

  const isUnread = (n: { id: string; read: boolean }) => isNotificationUnread(readIds, n);
  const hasUnread = list.some(isUnread);

  return (
    <section className="flex flex-col gap-4 pt-2">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-[family-name:var(--font-heading)] font-bold leading-tight text-foreground">
            Avisos
          </h1>
          <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
            Shows, promos e novidades dos seus bares.
          </p>
        </div>
        {hasUnread ? (
          <button
            type="button"
            onClick={() => markAllRead(list.map((n) => n.id))}
            className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[12px] font-[family-name:var(--font-body)] font-medium text-foreground transition-opacity hover:opacity-80"
          >
            Marcar todas como lidas
          </button>
        ) : null}
      </header>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-card px-6 py-16 text-center">
          <span className="text-muted-foreground">
            <BellIcon size={32} />
          </span>
          <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
            Nenhum aviso por aqui ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              unread={isUnread(notification)}
              onPress={markRead}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function NotificationsPage() {
  if (!FEATURES.notifications) {
    return (
      <UnderConstruction
        version="v3"
        icon={<BellIcon size={40} />}
        title="Os avisos estão a caminho"
        description="Logo logo a gente te cutuca quando seu bar favorito soltar um show, uma promo ou um happy hour imperdível. Chega na v3 — deixa que a gente avisa, você só aparece."
      />
    );
  }
  return <NotificationsContent />;
}
