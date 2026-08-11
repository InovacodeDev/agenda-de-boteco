'use client';

import {
  getFriendlyErrorMessage,
  isAuthAvailable,
  requestAccountDeletion,
  signInWithEmailOtp,
  verifyEmailOtp,
} from '@agenda/core';
import { useState } from 'react';

import { CheckIcon, InfoIcon, MailIcon, TrashIcon } from '@/components/profile/icons';

const APP_NAME = 'Agenda de Boteco';
const CONTACT_EMAIL = 'contato@inovacode.dev';

type Step = 'email' | 'otp' | 'done';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 flex flex-col gap-2">
      <h2 className="font-[family-name:var(--font-heading)] text-[18px] font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] font-[family-name:var(--font-body)] leading-6 text-muted-foreground">
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 pl-1">
      <span className="text-[15px] leading-6 text-primary">•</span>
      <span className="flex-1 text-[15px] font-[family-name:var(--font-body)] leading-6 text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

function DeletionForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unavailable = !isAuthAvailable();

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      await signInWithEmailOtp(email.trim());
      setStep('otp');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (otp.trim().length !== 6) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      // verifyEmailOtp autentica a sessão; só então requestAccountDeletion
      // consegue enfileirar o auth.uid() correspondente.
      await verifyEmailOtp(email.trim(), otp.trim());
      await requestAccountDeletion();
      setStep('done');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (unavailable) {
    return (
      <div className="mb-8 flex items-start gap-2.5 rounded-2xl border border-border bg-card/80 p-4">
        <InfoIcon size={18} className="mt-0.5 text-accent" />
        <p className="flex-1 text-[13px] font-[family-name:var(--font-body)] leading-5 text-muted-foreground">
          A solicitação online está indisponível no momento. Envie um e-mail para {CONTACT_EMAIL}{' '}
          para excluir sua conta.
        </p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="mb-8 flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <div className="flex items-center gap-2">
          <CheckIcon size={18} className="text-primary" />
          <span className="text-[15px] font-semibold font-[family-name:var(--font-body)] text-foreground">
            Solicitação registrada
          </span>
        </div>
        <p className="text-[13px] font-[family-name:var(--font-body)] leading-5 text-muted-foreground">
          Se houver uma conta associada a esse e-mail, ela e os dados vinculados serão excluídos em
          até 1 hora. Você não precisa fazer mais nada.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4">
      <span className="text-[15px] font-semibold font-[family-name:var(--font-body)] text-foreground">
        Solicitar exclusão online
      </span>

      {errorMessage ? (
        <p className="text-[13px] font-[family-name:var(--font-body)] text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {step === 'email' ? (
        <>
          <p className="text-[13px] font-[family-name:var(--font-body)] leading-5 text-muted-foreground">
            Informe o e-mail da sua conta. Enviaremos um código para confirmar que é você.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="E-mail da conta"
            className="h-12 rounded-full border border-border bg-card px-4 text-[14px] font-[family-name:var(--font-body)] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            type="button"
            disabled={busy || !email.trim()}
            onClick={() => void handleSendCode()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-destructive text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <MailIcon size={16} className="text-white" />
            {busy ? 'Enviando…' : 'Enviar código de confirmação'}
          </button>
        </>
      ) : (
        <>
          <p className="text-[13px] font-[family-name:var(--font-body)] leading-5 text-muted-foreground">
            Enviamos um código para {email.trim()}. Digite-o abaixo para confirmar a exclusão.
          </p>
          <input
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            aria-label="Código de confirmação"
            className="h-12 rounded-full border border-border bg-card px-5 text-center text-[14px] font-[family-name:var(--font-body)] tracking-[6px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            type="button"
            disabled={busy || otp.trim().length !== 6}
            onClick={() => void handleConfirm()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-destructive text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <TrashIcon size={16} className="text-white" />
            {busy ? 'Confirmando…' : 'Confirmar exclusão da conta'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep('email');
              setOtp('');
              setErrorMessage(null);
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-transparent text-[15px] font-medium text-foreground transition-colors hover:bg-card/50 disabled:opacity-50"
          >
            Usar outro e-mail
          </button>
        </>
      )}
    </div>
  );
}

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8">
      <h1 className="mb-1 font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight text-foreground">
        Excluir sua conta
      </h1>
      <p className="mb-6 text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
        {APP_NAME}
      </p>

      <div className="mb-6">
        <Paragraph>
          Esta página explica como excluir sua conta do {APP_NAME} e quais dados são removidos. A
          exclusão é permanente e não pode ser desfeita.
        </Paragraph>
      </div>

      <DeletionForm />

      <Section title="Como excluir pelo app (se estiver logado)">
        <Paragraph>
          Você também pode excluir a conta dentro do app: abra a aba “Perfil”, toque em “Excluir
          conta” no rodapé e confirme. O processo de remoção é o mesmo descrito abaixo.
        </Paragraph>
      </Section>

      <Section title="Quais dados são excluídos">
        <Paragraph>Ao excluir a conta, removemos de forma permanente:</Paragraph>
        <Bullet>Seu cadastro de autenticação (e-mail e nome associados à conta).</Bullet>
        <Bullet>Seus favoritos sincronizados (eventos e estabelecimentos salvos na conta).</Bullet>
        <Paragraph>
          O app não coleta telefone, foto, dados financeiros, dados de saúde nem identificadores de
          publicidade — portanto não há esses dados a remover.
        </Paragraph>
      </Section>

      <Section title="Quais dados podem ser mantidos">
        <Paragraph>
          Não retemos dados pessoais após a exclusão. Preferências salvas apenas no seu dispositivo
          (como a cidade selecionada) são removidas ao desinstalar o app. Registros técnicos
          mínimos, quando existirem por exigência legal, são anônimos e não identificam você.
        </Paragraph>
      </Section>

      <Section title="Prazo e contato">
        <Paragraph>
          As solicitações são processadas em até 1 hora. Em caso de dúvida, escreva para{' '}
          {CONTACT_EMAIL}.
        </Paragraph>
      </Section>
    </main>
  );
}
