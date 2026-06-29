'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useUnreadCount } from '@/hooks/useUnreadCount';
import { cn } from '@/lib/cn';

import { NavIcon } from './icons';
import { NavBadge } from './NavBadge';
import { isActive, NAV_ITEMS } from './navItems';

export function Sidebar() {
  const pathname = usePathname();
  const unreadCount = useUnreadCount();

  return (
    <aside className="hidden w-[245px] shrink-0 border-r border-border bg-popover md:flex md:flex-col">
      <div className="sticky top-0 flex h-screen flex-col gap-6 px-4 py-8">
        <Link
          href="/"
          className="px-2 font-[family-name:var(--font-heading)] text-xl font-bold text-primary"
        >
          Agenda de Boteco
        </Link>

        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-4 rounded-lg px-3 py-3 text-foreground transition-colors hover:bg-surface',
                  active ? 'bg-surface font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                <NavIcon name={item.icon} />
                <span className="text-base">{item.label}</span>
                {item.href === '/avisos' ? <NavBadge count={unreadCount} /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
