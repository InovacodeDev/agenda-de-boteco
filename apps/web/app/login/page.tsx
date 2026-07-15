'use client';

import {
  getFriendlyErrorMessage,
  signInWithEmailOtp,
  useAuthStore,
  verifyEmailOtp,
} from '@agenda/core';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppleIcon, EnvelopeIcon, GoogleIcon, InfoIcon } from '@/components/auth/icons';
import { getSupabase } from '@/lib/supabase';
import logo from '@/public/logo.png';

type EmailStep = 'hidden' | 'editing' | 'sent';

const INPUT_CLASS =
  'h-12 w-full rounded-full border border-border bg-surface px-5 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary';

const BTN_BASE =
  'flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-[family-name:var(--font-body)] font-semibold transition-opacity disabled:opacity-50 hover:opacity-90';

export default function LoginPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [emailStep, setEmailStep] = useState<EmailStep>('hidden');
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unavailable = status === 'unavailable';

  useEffect(() => {
    if (status === 'signedIn') {
      router.replace('/');
    }
  }, [status, router]);

  // OAuth no web: o supabase-js redireciona o browser (não há fluxo RN nativo).
  // A sessão volta pela URL (detectSessionInUrl no client) e o authStore observa.
  const handleProvider = async (provider: 'google' | 'apple') => {
    const client = getSupabase();
    if (!client) {
      setErrorMessage(getFriendlyErrorMessage(new Error('unavailable')));
      return;
    }
    setErrorMessage(null);
    setBusy(true);
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (emailStep === 'hidden') {
      setEmailStep('editing');
      return;
    }
    if (!email.trim()) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setEmailStep('sent');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpToken.trim().length !== 6) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      await verifyEmailOtp(email.trim(), otpToken.trim());
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col justify-end bg-[linear-gradient(160deg,#1A122B,#0F0F0F)] p-6">
      <div className="mx-auto flex w-full max-w-157.5 flex-col gap-5">
        <Image src={logo} alt="Agenda de Boteco" priority className="h-auto w-40" />

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-foreground text-[26px]">Entre para curtir mais</h1>
          <p className="text-muted-foreground text-[14px] leading-5">
            Salve favoritos, avalie bares e receba avisos dos seus lugares favoritos.
          </p>
        </div>

        {unavailable ? (
          <div className="border-border bg-surface/80 flex items-start gap-2.5 rounded-2xl border p-4">
            <span className="text-accent">
              <InfoIcon size={18} />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-foreground text-[14px] font-semibold">
                Login indisponível no momento
              </p>
              <p className="text-muted-foreground text-[13px] leading-5">
                Estamos finalizando a configuração das contas. Você já pode explorar a agenda
                normalmente — favoritar e avaliar liberam assim que o login estiver no ar.
              </p>
            </div>
          </div>
        ) : null}

        {errorMessage ? <p className="text-destructive text-[13px]">{errorMessage}</p> : null}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={unavailable || busy}
            onClick={() => handleProvider('google')}
            className={`${BTN_BASE} bg-foreground text-background`}
          >
            <GoogleIcon size={18} />
            Continuar com Google
          </button>
          <button
            type="button"
            disabled={unavailable || busy}
            onClick={() => handleProvider('apple')}
            className={`${BTN_BASE} border-border text-foreground border bg-transparent`}
          >
            <AppleIcon size={16} />
            Continuar com Apple
          </button>

          {emailStep === 'editing' ? (
            <div className="flex flex-col gap-3">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                aria-label="Seu e-mail"
                className={INPUT_CLASS}
              />
              <button
                type="button"
                disabled={unavailable || busy || !email.trim()}
                onClick={handleEmail}
                className={`${BTN_BASE} bg-accent text-accent-foreground`}
              >
                <EnvelopeIcon size={16} />
                {busy ? 'Enviando…' : 'Enviar código de acesso'}
              </button>
            </div>
          ) : emailStep === 'sent' ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-center text-[13px]">
                Enviamos um código de acesso para {email.trim()}. Insira-o abaixo:
              </p>
              <input
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                aria-label="Código de acesso"
                className={`${INPUT_CLASS} text-center tracking-[6px]`}
              />
              <button
                type="button"
                disabled={unavailable || busy || otpToken.trim().length !== 6}
                onClick={handleVerifyOtp}
                className={`${BTN_BASE} bg-accent text-accent-foreground`}
              >
                <EnvelopeIcon size={16} />
                {busy ? 'Verificando…' : 'Entrar'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmailStep('editing');
                  setOtpToken('');
                }}
                className={`${BTN_BASE} border-border bg-background text-foreground border`}
              >
                Alterar e-mail
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={unavailable || busy}
              onClick={handleEmail}
              className={`${BTN_BASE} border-border text-foreground border bg-transparent`}
            >
              <EnvelopeIcon size={16} />
              Continuar com e-mail
            </button>
          )}
        </div>

        <p className="text-muted-foreground text-center text-[12px]">
          Ao continuar, você aceita os termos do Agenda de Boteco.
        </p>
      </div>
    </main>
  );
}
