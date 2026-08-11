'use client';

import { type AppNotification, type NotificationType, relativeTime } from '@agenda/core';
import { useRouter } from 'next/navigation';
import { memo, type ReactNode } from 'react';

import { HeartIcon, MapPinIcon } from '@/components/ui/icons';

// ponytail: ícones de tipo de aviso (music/promo) ainda não existem no icons.tsx
// compartilhado — inline aqui no arquivo do lote para não tocar o shared.
function MusicIcon({ size = 18 }: { size?: number }) {
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
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

function WandIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="m6 21 9-9-3-3-9 9 3 3ZM14.5 6.5 17 9l2-2-2.5-2.5L14.5 6.5ZM16 2l.8 2.2L19 5l-2.2.8L16 8l-.8-2.2L13 5l2.2-.8L16 2ZM5 4l.6 1.6L7 6l-1.4.4L5 8l-.6-1.6L3 6l1.4-.4L5 4Z" />
    </svg>
  );
}

function iconFor(type: NotificationType): ReactNode {
  switch (type) {
    case 'style':
      return <MusicIcon />;
    case 'city':
      return <MapPinIcon size={18} />;
    case 'favorite':
      return <HeartIcon size={18} />;
    case 'promo':
      return <WandIcon />;
  }
}

export interface NotificationCardProps {
  notification: AppNotification;
  unread: boolean;
  /** Recebe o id do aviso — permite passar um handler estável à lista. */
  onPress: (id: string) => void;
}

/**
 * Card de aviso: ícone por tipo, dot verde e borda sutil quando não lido.
 * Espelha o NotificationCard do mobile em DOM/Tailwind.
 */
export const NotificationCard = memo(function NotificationCard({
  notification,
  unread,
  onPress,
}: NotificationCardProps) {
  const router = useRouter();

  const open = () => {
    onPress(notification.id);
    if (notification.event_id) {
      router.push(`/event/${notification.event_id}`);
    } else if (notification.establishment_id) {
      router.push(`/establishment/${notification.establishment_id}`);
    }
  };

  return (
    <button
      type="button"
      aria-label={notification.title}
      onClick={open}
      className={`flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-left transition-opacity hover:opacity-90 ${
        unread ? 'border border-primary/40' : ''
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          unread ? 'bg-primary/15 text-primary' : 'bg-surface text-muted-foreground'
        }`}
      >
        {iconFor(notification.type)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-[family-name:var(--font-body)] font-semibold text-foreground">
          {notification.title}
        </span>
        <span className="line-clamp-2 text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
          {notification.body}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[11px] font-[family-name:var(--font-body)] text-muted-foreground">
          {relativeTime(notification.created_at)}
        </span>
        {unread ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
      </span>
    </button>
  );
});
