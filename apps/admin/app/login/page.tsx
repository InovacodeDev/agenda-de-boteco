'use client';

import {
  getFriendlyErrorMessage,
  identifyAnalyticsUser,
  signInWithEmailOtp,
  useAuthStore,
  verifyEmailOtp,
} from '@agenda/core';
import {
  BTN_GHOST as BTN_GHOST_BASE,
  BTN_PRIMARY as BTN_PRIMARY_BASE,
  INPUT_CLASS as INPUT_BASE,
} from '@agenda/shared-ui';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import logo from '@/public/logo.png';

type EmailStep = 'editing' | 'sent';

// Mesmos tokens das telas internas, esticados para largura total do card.
const INPUT_CLASS = INPUT_BASE;
const BTN_PRIMARY = `${BTN_PRIMARY_BASE} w-full`;
const BTN_GHOST = `${BTN_GHOST_BASE} w-full`;

export default function LoginPage() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id);

  const [step, setStep] = useState<EmailStep>('editing');
  const [email, setEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unavailable = status === 'unavailable';

  useEffect(() => {
    if (status === 'signedIn') {
      if (userId) identifyAnalyticsUser(userId);
      router.replace('/');
    }
  }, [status, userId, router]);

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setStep('sent');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
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
    <main className="flex min-h-dvh items-center justify-center bg-surface p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-(--shadow-card)">
        <div className="flex flex-col gap-1">
          <Image src={logo} alt="Agenda de Boteco" priority className="mb-1 h-auto w-32" />
          <h1 className="font-heading text-[24px] font-bold leading-tight text-foreground">
            Painel Admin
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Acesso restrito. Entre com seu e-mail de administrador.
          </p>
        </div>

        {unavailable ? (
          <p className="rounded-2xl bg-surface-elevated p-3 text-[13px] text-muted-foreground">
            Login indisponível: configuração do Supabase ausente.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="text-[13px] text-destructive">{errorMessage}</p>
        ) : null}

        {step === 'editing' ? (
          <div className="flex flex-col gap-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Seu e-mail"
              className={INPUT_CLASS}
            />
            <button
              type="button"
              disabled={unavailable || busy || !email.trim()}
              onClick={handleSendCode}
              className={BTN_PRIMARY}
            >
              {busy ? 'Enviando…' : 'Enviar código de acesso'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-muted-foreground">
              Enviamos um código para {email.trim()}. Insira-o abaixo:
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
              onClick={handleVerify}
              className={BTN_PRIMARY}
            >
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep('editing');
                setOtpToken('');
              }}
              className={BTN_GHOST}
            >
              Alterar e-mail
            </button>
          </div>
        )}

        <Link
          href="/privacy"
          className="text-center text-[12px] text-muted-foreground underline-offset-2 hover:underline"
        >
          Política de Privacidade
        </Link>
      </div>
    </main>
  );
}
