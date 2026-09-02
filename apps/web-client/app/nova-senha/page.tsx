'use client';

import { getFriendlyErrorMessage, updatePassword, useAuthStore } from '@agenda/core';
import { Button, INPUT_CLASS } from '@agenda/shared-ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Destino do link de recuperação. O Supabase entrega a sessão de recovery pela
 * URL (detectSessionInUrl), então quando esta tela monta o usuário já está
 * autenticado — só falta gravar a nova senha.
 */
export default function NovaSenhaPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = password.length >= 6 && !busy && status === 'signedIn';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      await updatePassword(password);
      router.replace('/');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]"
      >
        <div className="flex flex-col gap-1">
          <h1 className="font-[family-name:var(--font-heading)] text-[22px] font-bold text-foreground">
            Definir nova senha
          </h1>
          <p className="text-[13px] text-muted-foreground">Use ao menos 6 caracteres.</p>
        </div>

        {status !== 'signedIn' ? (
          <p className="rounded-2xl bg-surface-elevated p-3 text-[13px] text-muted-foreground">
            Link inválido ou expirado. Peça uma nova recuperação na tela de login.
          </p>
        ) : null}

        {errorMessage ? <p className="text-[13px] text-destructive">{errorMessage}</p> : null}

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nova senha"
          type="password"
          autoComplete="new-password"
          aria-label="Nova senha"
          className={INPUT_CLASS}
        />

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {busy ? 'Salvando…' : 'Salvar senha'}
        </Button>
      </form>
    </main>
  );
}
