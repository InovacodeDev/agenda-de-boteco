'use client';

import {
  claimEstablishmentOwner,
  getFriendlyErrorMessage,
  identifyAnalyticsUser,
  isCurrentUserEstablishmentOwner,
  sendPasswordReset,
  signInWithEmailOtp,
  signInWithOAuth,
  signInWithPassword,
  signOut,
  updatePassword,
  useAuthStore,
  verifyEmailOtp,
} from '@agenda/core';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { GoogleIcon } from '@/components/GoogleIcon';
import logo from '@/public/logo.png';

type Tab = 'signIn' | 'signUp';
type Notice = { tone: 'error' | 'success' | 'denied'; message: string };

/**
 * O cadastro é em duas etapas: pedimos o código por e-mail ('email') e depois
 * recebemos código + senha ('code'). Vale tanto para quem nunca teve conta
 * quanto para quem já usa o app público — nos dois casos o código é a prova de
 * posse do e-mail, e só depois dele a senha é gravada e o acesso liberado.
 */
type SignUpStep = 'email' | 'code';

const DENIED_MESSAGE =
  'Esta conta não tem acesso ao painel do estabelecimento. Se você é dono de um bar, crie seu acesso na aba "Criar conta".';

/**
 * Marca que o Google foi acionado pela aba "Criar conta". Só o OAuth precisa
 * disso: ele recarrega a página, e a intenção não sobrevive em memória. Não é
 * credencial — quem forjar a chave sem sessão não promove nada, porque a RPC
 * age sobre auth.uid(), e o e-mail do Google já vem verificado pelo provedor.
 */
const OAUTH_SIGNUP_KEY = 'web-client:oauth-signup';

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
  const user = useAuthStore((state) => state.user);

  const [tab, setTab] = useState<Tab>('signIn');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  /** Ligado enquanto o cadastro conclui, para o efeito de sessão não interferir. */
  const [claiming, setClaiming] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const unavailable = status === 'unavailable';

  const canSubmit = (() => {
    if (busy || unavailable) return false;
    if (tab === 'signIn') return email.trim().length > 0 && password.length >= 6;
    if (signUpStep === 'email') return email.trim().length > 0;
    return code.trim().length === 6 && password.length >= 6;
  })();

  /**
   * Ter conta no Agenda de Boteco não dá acesso ao painel: quem entra sem a flag
   * de dono é recusado, com o caminho do cadastro. O cadastro concede a flag por
   * conta própria (handleSignUpVerify) — durante ele, `claiming` segura este
   * efeito para não deslogar a sessão recém-criada antes da promoção.
   */
  useEffect(() => {
    if (status !== 'signedIn' || claiming) return;
    let active = true;

    void (async () => {
      try {
        // Volta do Google pela aba "Criar conta": promove antes de checar.
        if (window.sessionStorage.getItem(OAUTH_SIGNUP_KEY)) {
          window.sessionStorage.removeItem(OAUTH_SIGNUP_KEY);
          await claimEstablishmentOwner();
          if (active) {
            if (user) identifyAnalyticsUser(user.id);
            router.replace('/');
          }
          return;
        }
        const isOwner = await isCurrentUserEstablishmentOwner();
        if (!active) return;
        if (isOwner) {
          if (user) identifyAnalyticsUser(user.id);
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
  }, [status, claiming, router, user]);

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

  /**
   * Etapa 1 do cadastro: dispara o código. Usamos OTP em vez de signUp porque
   * signUp falha com "User already registered" quando o e-mail já tem conta
   * confirmada no app público — justamente o caso que precisamos atender. O OTP
   * cria a conta se não existir e autentica a existente, sem distinção na UI.
   */
  const handleSignUpStart = async () => {
    if (!canSubmit) return;
    setNotice(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setSignUpStep('code');
      setNotice({
        tone: 'success',
        message: `Enviamos um código para ${email.trim()}. Ele confirma que o e-mail é seu.`,
      });
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  /**
   * Etapa 2: o código vira sessão, e só então gravamos a senha e liberamos o
   * painel. Ordem importa — sem sessão válida, updatePassword e a RPC de
   * promoção não têm sobre quem agir.
   */
  const handleSignUpVerify = async () => {
    if (!canSubmit) return;
    setNotice(null);
    setBusy(true);
    setClaiming(true);
    try {
      await verifyEmailOtp(email.trim(), code.trim());
      await updatePassword(password);
      await claimEstablishmentOwner();
      router.replace('/');
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getFriendlyErrorMessage(error) });
      setClaiming(false);
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
    if (signUpStep === 'email') {
      void handleSignUpStart();
      return;
    }
    void handleSignUpVerify();
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
                  setSignUpStep('email');
                  setCode('');
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
              readOnly={tab === 'signUp' && signUpStep === 'code'}
              className={`mt-1.5 ${FIELD_CLASS} ${
                tab === 'signUp' && signUpStep === 'code' ? 'text-muted-foreground' : ''
              }`}
            />

            {tab === 'signUp' && signUpStep === 'code' ? (
              <>
                <label htmlFor="code" className={`${LABEL_CLASS} mt-4`}>
                  Código do e-mail
                </label>
                <input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className={`mt-1.5 ${FIELD_CLASS} text-center tracking-[6px]`}
                />
              </>
            ) : null}

            {tab === 'signIn' || signUpStep === 'code' ? (
              <>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <label htmlFor="password" className={LABEL_CLASS}>
                    {tab === 'signIn' ? 'Senha' : 'Crie uma senha'}
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
              </>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 h-12 w-full rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_rgba(29,215,94,0.45)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
            >
              {busy
                ? 'Aguarde…'
                : tab === 'signIn'
                  ? 'Entrar'
                  : signUpStep === 'email'
                    ? 'Enviar código'
                    : 'Criar acesso'}
            </button>

            {tab === 'signUp' && signUpStep === 'code' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSignUpStep('email');
                  setCode('');
                  setNotice(null);
                }}
                className="mt-3 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                Usar outro e-mail
              </button>
            ) : null}
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
              // Pela aba "Criar conta", o Google também é cadastro. O OAuth
              // recarrega a página, então a intenção vai para sessionStorage —
              // é o único caminho em que ela não cabe no state em memória.
              if (tab === 'signUp') {
                window.sessionStorage.setItem(OAUTH_SIGNUP_KEY, '1');
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
