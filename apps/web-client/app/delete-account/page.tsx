'use client';

import { useAuthStore } from '@agenda/core';
import { TrashIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal';

/**
 * Rota independente das configurações: a exclusão de conta precisa continuar
 * acessível (LGPD) mesmo com a flag panel-settings desligada. Exige sessão.
 */
export default function DeleteAccountPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'signedOut' || status === 'unavailable') router.replace('/login');
  }, [status, router]);

  if (status !== 'signedIn') {
    return (
      <div className="text-muted-foreground flex min-h-dvh items-center justify-center text-[14px]">
        Carregando…
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <section className="border-destructive/30 bg-destructive/5 rounded-2xl border p-6">
        <h1 className="font-heading text-destructive text-lg font-bold">
          Zona de Perigo: Exclusão Definitiva
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Exclua definitivamente sua conta de operador e desvincule o estabelecimento.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-destructive text-destructive-foreground mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
        >
          <TrashIcon size={16} weight="bold" />
          Excluir conta
        </button>
      </section>
      <Link href="/" className="text-primary text-sm font-medium hover:underline">
        Voltar ao painel
      </Link>
      <DeleteAccountModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
}
