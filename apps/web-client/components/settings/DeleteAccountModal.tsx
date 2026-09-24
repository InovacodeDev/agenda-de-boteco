'use client';

import { getFriendlyErrorMessage, requestAccountDeletion } from '@agenda/core';
import { WarningIcon, XIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await requestAccountDeletion();
      router.replace('/login');
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="shadow-card border-border bg-card w-full max-w-md rounded-2xl border p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/15 text-destructive flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <WarningIcon size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-heading text-foreground text-base font-bold">
                Excluir Conta do Estabelecimento
              </h3>
              <span className="text-destructive text-xs font-semibold">Ação irreversível</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors disabled:opacity-50"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs leading-relaxed">
          <p className="text-muted-foreground">
            Ao solicitar a exclusão definitiva da sua conta:
          </p>
          <ul className="border-border/60 bg-surface/50 text-foreground space-y-2 rounded-xl border p-3.5">
            <li className="flex items-start gap-2">
              <span className="text-destructive font-bold">•</span>
              <span>Seu acesso de operador a este estabelecimento será cancelado.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive font-bold">•</span>
              <span>Todos os eventos futuros cadastrados serão retirados do app público.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive font-bold">•</span>
              <span>Seus dados de perfil serão enfileirados para exclusão definitiva.</span>
            </li>
          </ul>
        </div>

        {error ? (
          <p className="text-destructive mt-3 text-xs">{error}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-foreground hover:bg-surface-elevated rounded-xl px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className="bg-destructive text-destructive-foreground shadow-card inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Excluindo…' : 'Sim, excluir definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}
