'use client';

import { cn } from '@agenda/core';
import Link from 'next/link';

import { useUnreadCount } from '@/hooks/useUnreadCount';

import { NavIcon } from './icons';
import { isActive, NAV_ITEMS } from './navItems';
import { useNavPathname } from './useNavPathname';

export function BottomNav() {
  const pathname = useNavPathname();
  const unreadCount = useUnreadCount();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-popover md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname);
        const showBadge = item.href === '/notices' && unreadCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <span className="relative">
              <NavIcon name={item.icon} className="h-6 w-6" />
              {showBadge ? (
                <span
                  aria-label={`${unreadCount} não lidos`}
                  className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
