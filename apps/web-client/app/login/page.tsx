'use client';

import {
  claimEstablishmentOwner,
  getFriendlyErrorMessage,
  isCurrentUserEstablishmentOwner,
  sendPasswordReset,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  useAuthStore,
} from '@agenda/core';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { GoogleIcon } from '@/components/GoogleIcon';
import logo from '@/public/logo.png';

type Tab = 'signIn' | 'signUp';
type Notice = { tone: 'error' | 'success' | 'denied'; message: string };

const DENIED_MESSAGE =
  'Esta conta não tem acesso ao painel do estabelecimento. Se você é dono de um bar, crie seu acesso na aba "Criar conta".';

/**
 * Marca que este navegador iniciou um cadastro de dono. O link de confirmação
 * do e-mail reabre esta tela já com sessão, e é aí que a promoção acontece —
 * ver o efeito de sessão abaixo. Fica em sessionStorage (não localStorage) para
 * não sobreviver ao fechamento da aba: a intenção vale para esta visita.
 *
 * Não é credencial nem autorização: quem forjar a chave e não tiver sessão
 * confirmada não promove nada, porque a RPC age sobre auth.uid().
 */
const SIGNUP_INTENT_KEY = 'web-client:signup-intent';

const TABS: { id: Tab; label: string }[] = [
  { id: 'signIn', label: 'Entrar' },
  { id: 'signUp', label: 'Criar conta' },
];

const FIELD_CLASS =
  'h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary';

const LABEL_CLASS = 'text-[13px] font-semibold text-foreground';

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

  /**
   * Ter conta no Agenda de Boteco não dá acesso ao painel. Ao ganhar sessão:
   * - quem chegou pelo link de confirmação do cadastro (marca em sessionStorage)
   *   é promovido a dono agora — a sessão prova que o e-mail é dele;
   * - quem já era dono entra;
   * - quem tem conta só do app público é recusado, com o caminho do cadastro.
   */
  useEffect(() => {
    if (status !== 'signedIn') return;
    let active = true;

    void (async () => {
      try {
        if (window.sessionStorage.getItem(SIGNUP_INTENT_KEY)) {
          window.sessionStorage.removeItem(SIGNUP_INTENT_KEY);
          await claimEstablishmentOwner();
          if (active) router.replace('/');
          return;
        }
        const isOwner = await isCurrentUserEstablishmentOwner();
        if (!active) return;
        if (isOwner) {
          router.replace('/');
          return;
        }
        await signOut();
        if (active) setNotice({ tone: 'denied', message: DENIED_MESSAGE });
      } catch (error: unknown) {
        if (active) setNotice({ tone: 'error', message: getFriendlyErrorMessage(error) });
      }
    })();

    return () => {
      active = false;
    };
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
    // Se o e-mail já existir no app público, o Supabase não cria conta nova nem
    // devolve erro — manda o e-mail de confirmação e devolve sucesso, para não
    // revelar quem tem cadastro. A promoção da conta existente acontece quando
    // o usuário volta pelo link, com sessão. Daí a mensagem ser a mesma nos dois
    // casos: qualquer diferença aqui vira um detector de e-mails cadastrados.
    window.sessionStorage.setItem(SIGNUP_INTENT_KEY, '1');
    void run(() => signUpWithPassword(email.trim(), password), {
      tone: 'success',
      message: 'Enviamos um e-mail para você confirmar o acesso ao painel.',
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
      <div className="flex w-full max-w-[440px] flex-col items-center">
        <Image
          src={logo}
          alt="Agenda de Boteco"
          priority
          className="h-20 w-20 rounded-[20px] bg-white object-contain p-2"
        />

        <h1 className="mt-5 text-center font-[family-name:var(--font-heading)] text-[30px] font-bold leading-tight tracking-tight text-foreground">
          Painel do Estabelecimento
        </h1>
        <p className="mt-1.5 text-center text-[15px] text-muted-foreground">
          Cadastre eventos e apareça no app dos amantes da noite
        </p>

        <div className="mt-7 w-full rounded-2xl border border-border bg-card p-5">
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
                className={`flex-1 rounded-lg py-2 text-[14px] font-medium transition-colors ${
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
            <p className="mt-4 rounded-xl bg-surface px-3.5 py-2.5 text-[12px] text-muted-foreground">
              Login indisponível: configuração do Supabase ausente.
            </p>
          ) : null}

          {notice?.tone === 'denied' ? (
            <div
              role="status"
              className="mt-4 flex flex-col items-start gap-2 rounded-xl border border-border bg-surface px-3.5 py-3"
            >
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {notice.message}
              </p>
              <button
                type="button"
                onClick={() => {
                  setTab('signUp');
                  setNotice(null);
                  setPassword('');
                }}
                className="text-[12px] font-semibold text-primary underline-offset-2 hover:underline"
              >
                Criar meu acesso
              </button>
            </div>
          ) : notice ? (
            <p
              role="status"
              className={`mt-4 text-[12px] ${
                notice.tone === 'error' ? 'text-destructive' : 'text-primary'
              }`}
            >
              {notice.message}
            </p>
          ) : null}

          <form
            className="mt-5 flex flex-col"
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
              className={`mt-1.5 ${FIELD_CLASS}`}
            />

            <div className="mt-4 flex items-baseline justify-between gap-4">
              <label htmlFor="password" className={LABEL_CLASS}>
                Senha
              </label>
              {tab === 'signIn' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReset}
                  className="text-[13px] font-medium text-primary underline-offset-2 hover:underline"
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
              className={`mt-1.5 ${FIELD_CLASS}`}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 h-12 w-full rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_rgba(29,215,94,0.45)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
            >
              {busy ? 'Aguarde…' : tab === 'signIn' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[12px] text-muted-foreground">ou continue com</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            disabled={busy || unavailable}
            onClick={() => {
              // Pela aba "Criar conta", o Google também é cadastro: a conta que
              // voltar do OAuth vira dona. O e-mail já vem verificado pelo
              // provedor, então a garantia é a mesma do link de confirmação.
              if (tab === 'signUp') {
                window.sessionStorage.setItem(SIGNUP_INTENT_KEY, '1');
              }
              void run(() => signInWithOAuth('google'));
            }}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface text-[14px] font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            <GoogleIcon className="h-[18px] w-[18px]" />
            Google
          </button>
        </div>
      </div>
    </main>
  );
}
