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

import { GoogleIcon } from '@/components/GoogleIcon';
import logo from '@/public/logo.png';

type Tab = 'signIn' | 'signUp';
type Notice = { tone: 'error' | 'success'; message: string };

const TABS: { id: Tab; label: string }[] = [
  { id: 'signIn', label: 'Entrar' },
  { id: 'signUp', label: 'Criar conta' },
];

const FIELD_CLASS =
  'h-[54px] w-full rounded-xl border border-border bg-surface px-4 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary';

const LABEL_CLASS = 'text-[14px] font-semibold text-foreground';

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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[image:var(--gradient-night)] px-6 py-12">
      <div className="flex w-full max-w-[494px] flex-col items-center">
        <Image
          src={logo}
          alt="Agenda de Boteco"
          priority
          className="h-[92px] w-[92px] rounded-[22px] bg-white object-contain p-2.5"
        />

        <h1 className="mt-6 text-center font-[family-name:var(--font-heading)] text-[34px] font-bold leading-tight tracking-tight text-foreground">
          Painel do Estabelecimento
        </h1>
        <p className="mt-2 text-center text-[16px] text-muted-foreground">
          Cadastre eventos e apareça no app dos amantes da noite
        </p>

        <div className="mt-9 w-full rounded-2xl border border-border bg-card p-6">
          <div
            role="tablist"
            aria-label="Entrar ou criar conta"
            className="flex rounded-xl bg-surface p-1"
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
                className={`flex-1 rounded-lg py-2.5 text-[15px] font-medium transition-colors ${
                  tab === item.id
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {unavailable ? (
            <p className="mt-5 rounded-xl bg-surface px-4 py-3 text-[13px] text-muted-foreground">
              Login indisponível: configuração do Supabase ausente.
            </p>
          ) : null}

          {notice ? (
            <p
              role="status"
              className={`mt-5 text-[13px] ${
                notice.tone === 'error' ? 'text-destructive' : 'text-primary'
              }`}
            >
              {notice.message}
            </p>
          ) : null}

          <form
            className="mt-6 flex flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <label htmlFor="email" className={LABEL_CLASS}>
              E-mail
            </label>
            <input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@bar.com"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              className={`mt-2 ${FIELD_CLASS}`}
            />

            <div className="mt-5 flex items-baseline justify-between gap-4">
              <label htmlFor="password" className={LABEL_CLASS}>
                Senha
              </label>
              {tab === 'signIn' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReset}
                  className="text-[14px] font-medium text-primary underline-offset-2 hover:underline"
                >
                  Esqueci minha senha
                </button>
              ) : null}
            </div>
            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              type="password"
              autoComplete={tab === 'signIn' ? 'current-password' : 'new-password'}
              className={`mt-2 ${FIELD_CLASS}`}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 h-[54px] w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_rgba(29,215,94,0.45)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
            >
              {busy ? 'Aguarde…' : tab === 'signIn' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[13px] text-muted-foreground">ou continue com</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            disabled={busy || unavailable}
            onClick={() => void run(() => signInWithOAuth('google'))}
            className="flex h-[54px] w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-[15px] font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            <GoogleIcon className="h-5 w-5" />
            Google
          </button>
        </div>
      </div>
    </main>
  );
}
