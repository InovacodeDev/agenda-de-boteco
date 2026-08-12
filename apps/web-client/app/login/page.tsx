'use client';

import {
  getFriendlyErrorMessage,
  sendPasswordReset,
  signInWithOAuth,
  signInWithPassword,
  signUpWithPassword,
  useAuthStore,
} from '@agenda/core';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { INPUT_CLASS } from '@/components/ui/styles';
import logo from '@/public/logo.png';

type Tab = 'signIn' | 'signUp';
type Notice = { tone: 'error' | 'success'; message: string };

const TABS: { id: Tab; label: string }[] = [
  { id: 'signIn', label: 'Entrar' },
  { id: 'signUp', label: 'Criar conta' },
];

export default function LoginPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [tab, setTab] = useState<Tab>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const unavailable = status === 'unavailable';
  const canSubmit = email.trim().length > 0 && password.length >= 6 && !busy && !unavailable;

  useEffect(() => {
    if (status === 'signedIn') {
      router.replace('/');
    }
  }, [status, router]);

  /** Envolve a ação: limpa aviso, trava o botão e traduz o erro do Supabase. */
  const run = async (action: () => Promise<void>, onDone?: Notice) => {
    setNotice(null);
    setBusy(true);
    try {
      await action();
      if (onDone) setNotice(onDone);
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (tab === 'signIn') {
      void run(() => signInWithPassword(email.trim(), password));
      return;
    }
    void run(() => signUpWithPassword(email.trim(), password), {
      tone: 'success',
      message: 'Conta criada. Confira seu e-mail para confirmar o cadastro.',
    });
  };

  const handleReset = () => {
    if (!email.trim()) {
      setNotice({ tone: 'error', message: 'Informe seu e-mail para recuperar a senha.' });
      return;
    }
    void run(() => sendPasswordReset(email.trim()), {
      tone: 'success',
      message: 'Enviamos um link de recuperação para o seu e-mail.',
    });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-1">
          <Image src={logo} alt="Agenda de Boteco" priority className="mb-1 h-auto w-32" />
          <h1 className="font-[family-name:var(--font-heading)] text-[24px] font-bold leading-tight text-foreground">
            Painel do Estabelecimento
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Gerencie o perfil e a agenda do seu bar.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Entrar ou criar conta"
          className="flex gap-1 rounded-2xl bg-surface p-1"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setNotice(null);
              }}
              className={`flex-1 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors ${
                tab === item.id
                  ? 'bg-surface-elevated text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {unavailable ? (
          <p className="rounded-2xl bg-surface-elevated p-3 text-[13px] text-muted-foreground">
            Login indisponível: configuração do Supabase ausente.
          </p>
        ) : null}

        {notice ? (
          <p
            role="status"
            className={`text-[13px] ${
              notice.tone === 'error' ? 'text-destructive' : 'text-primary'
            }`}
          >
            {notice.message}
          </p>
        ) : null}

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@seubar.com.br"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Seu e-mail"
            className={INPUT_CLASS}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            type="password"
            autoComplete={tab === 'signIn' ? 'current-password' : 'new-password'}
            aria-label="Sua senha"
            className={INPUT_CLASS}
          />
          <Button type="submit" disabled={!canSubmit} className="w-full">
            {busy ? 'Aguarde…' : tab === 'signIn' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        {tab === 'signIn' ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleReset}
            className="text-[12px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Esqueci minha senha
          </button>
        ) : null}

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[12px] text-muted-foreground">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="ghost"
          disabled={busy || unavailable}
          onClick={() => void run(() => signInWithOAuth('google'))}
          className="w-full"
        >
          Continuar com Google
        </Button>
      </div>
    </main>
  );
}
