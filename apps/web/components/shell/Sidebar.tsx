'use client';

import { cn } from '@agenda/core';
import Image from 'next/image';
import Link from 'next/link';

import { useUnreadCount } from '@/hooks/useUnreadCount';
import logo from '@/public/logo.png';

import { NavIcon } from './icons';
import { NavBadge } from './NavBadge';
import { isActive, NAV_ITEMS } from './navItems';
import { useNavPathname } from './useNavPathname';

export function Sidebar() {
  const pathname = useNavPathname();
  const unreadCount = useUnreadCount();

  return (
    <aside className="hidden w-61.25 shrink-0 border-r border-border bg-popover md:flex md:flex-col">
      <div className="sticky top-0 flex h-screen flex-col gap-6 px-4 py-8">
        <Link href="/" className="px-2" aria-label="Agenda de Boteco">
          <Image src={logo} alt="Agenda de Boteco" priority className="h-auto w-40" />
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
                {item.href === '/notices' ? <NavBadge count={unreadCount} /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
