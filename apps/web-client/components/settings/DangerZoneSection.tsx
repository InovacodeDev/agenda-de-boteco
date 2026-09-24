'use client';

import { ShieldWarningIcon, TrashIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { DeleteAccountModal } from './DeleteAccountModal';

export function DangerZoneSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section
      aria-label="Privacidade e Exclusão"
      className="border-destructive/30 bg-destructive/5 rounded-2xl border p-6 md:p-7"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-destructive/15 text-destructive flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <ShieldWarningIcon size={24} weight="bold" />
        </div>
        <div>
          <h2 className="font-heading text-foreground text-lg font-bold">
            Privacidade e Exclusão
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie a conformidade de dados e o encerramento da sua conta de operador.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Seus dados são tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            Consulte nossos termos legais a qualquer momento:
          </p>
          <div className="flex items-center gap-4 pt-1">
            <Link
              href="/privacy"
              className="text-primary hover:underline font-medium transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>

        <div className="border-destructive/20 border-t pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <span className="font-heading text-foreground text-sm font-semibold">
                Zona de perigo
              </span>
              <span className="text-muted-foreground text-xs">
                Exclua definitivamente sua conta de operador e desvincule o estabelecimento.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="bg-destructive text-destructive-foreground hover:opacity-90 inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-opacity"
            >
              <TrashIcon size={16} weight="bold" />
              Excluir conta
            </button>
          </div>
        </div>
      </div>

      <DeleteAccountModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
