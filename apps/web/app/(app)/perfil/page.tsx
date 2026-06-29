'use client';

import { useActiveCity, useAuthStore, useFavoritesStore } from '@agenda/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  ChevronRightIcon,
  LogoutIcon,
  MapPinIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from '@/components/profile/icons';
import { HeartIcon } from '@/components/ui/icons';

function SignedOutProfile() {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 px-8 pt-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card">
        <UserIcon size={28} className="text-muted-foreground" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-[family-name:var(--font-heading)] text-[20px] font-bold text-foreground">
          Entre na sua conta
        </h2>
        <p className="text-center text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          Para favoritar, avaliar e receber avisos dos bares que você ama.
        </p>
      </div>
      <Link
        href="/login"
        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Entrar
      </Link>
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-card p-4">
      <span className="truncate font-[family-name:var(--font-heading)] text-[20px] font-bold text-foreground">
        {value}
      </span>
      <span className="text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  border,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  border?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-4 py-4 transition-colors hover:bg-card/50 ${
        border ? 'border-b border-border' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-[15px] font-medium font-[family-name:var(--font-body)] text-foreground">
          {label}
        </span>
      </div>
      <ChevronRightIcon size={16} className="text-muted-foreground" />
    </Link>
  );
}

function SignedInProfile() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();

  const eventIds = useFavoritesStore((state) => state.eventIds);
  const establishmentIds = useFavoritesStore((state) => state.establishmentIds);
  const totalFavorites = eventIds.length + establishmentIds.length;

  const city = useActiveCity();

  const name = user?.name || 'Você';
  const email = user?.email || '';
  const firstLetter = name[0]?.toUpperCase() ?? 'V';

  const handleSignOut = () => {
    if (window.confirm('Sair da conta? Você precisará entrar novamente para favoritar e receber avisos.')) {
      void signOut();
      router.push('/');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex items-center gap-4 rounded-2xl bg-card p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <span className="font-[family-name:var(--font-heading)] text-[28px] font-bold text-primary">
            {firstLetter}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          <span className="truncate text-[18px] font-semibold font-[family-name:var(--font-body)] text-foreground">
            {name}
          </span>
          {email ? (
            <span className="truncate text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
              {email}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <StatCard value={totalFavorites} label="Favoritos" />
        <StatCard value={city?.name ?? '…'} label="Cidade" />
        <StatCard value={0} label="Reviews" />
      </div>

      <div className="overflow-hidden rounded-2xl bg-card">
        <MenuItem
          href="/favoritos"
          border
          icon={<HeartIcon filled size={18} className="text-primary" />}
          label="Meus favoritos"
        />
        <MenuItem
          href="/cidade"
          border
          icon={<MapPinIcon size={18} className="text-primary" />}
          label="Mudar cidade"
        />
        <MenuItem
          href="/privacidade"
          icon={<ShieldIcon size={18} className="text-primary" />}
          label="Privacidade"
        />
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-3 pb-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-transparent transition-colors hover:bg-destructive/10"
        >
          <LogoutIcon size={16} className="text-destructive" />
          <span className="text-[15px] font-semibold font-[family-name:var(--font-body)] text-destructive">
            Sair
          </span>
        </button>

        <Link
          href="/excluir-conta"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-transparent transition-colors hover:bg-card/50"
        >
          <TrashIcon size={16} className="text-muted-foreground" />
          <span className="text-[14px] font-medium font-[family-name:var(--font-body)] text-muted-foreground">
            Excluir conta
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const status = useAuthStore((state) => state.status);

  return (
    <section className="flex min-h-[70vh] flex-col">
      <header className="flex flex-col gap-1 pb-2 pt-2">
        <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
          Perfil
        </h1>
      </header>
      {status === 'signedIn' ? <SignedInProfile /> : <SignedOutProfile />}
    </section>
  );
}
