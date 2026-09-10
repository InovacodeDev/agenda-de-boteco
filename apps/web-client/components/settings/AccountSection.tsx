'use client';

import { getFriendlyErrorMessage, updatePassword, useAuthStore } from '@agenda/core';
import {
  CheckCircleIcon,
  DeviceMobileIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { GoogleIcon } from '@/components/GoogleIcon';
import { getSupabase } from '@/lib/supabase';

interface AccountSectionProps {
  onSuccessNotice?: (message: string) => void;
}

export function AccountSection({ onSuccessNotice }: AccountSectionProps) {
  const user = useAuthStore((state) => state.user);

  const [provider, setProvider] = useState<'google' | 'email'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busyPassword, setBusyPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [busySignOutOthers, setBusySignOutOthers] = useState(false);
  const [sessionsNotice, setSessionsNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const detectedProvider = data.user?.app_metadata?.provider;
      queueMicrotask(() => {
        setProvider(detectedProvider === 'google' ? 'google' : 'email');
      });
    });

    return () => {
      active = false;
    };
  }, []);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da senha não confere com a nova senha.');
      return;
    }

    setBusyPassword(true);
    try {
      await updatePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccessNotice) {
        onSuccessNotice('Senha atualizada com sucesso.');
      }
    } catch (error: unknown) {
      setPasswordError(getFriendlyErrorMessage(error));
    } finally {
      setBusyPassword(false);
    }
  };

  const handleSignOutOthers = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setBusySignOutOthers(true);
    setSessionsNotice(null);
    try {
      await supabase.auth.signOut({ scope: 'others' });
      setSessionsNotice('Sessões em outros dispositivos foram desconectadas.');
    } catch (error: unknown) {
      setSessionsNotice(getFriendlyErrorMessage(error));
    } finally {
      setBusySignOutOthers(false);
    }
  };

  return (
    <section
      aria-label="Conta e Acesso"
      className="shadow-card border-border bg-card rounded-2xl border p-6 md:p-7"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <UserCircleIcon size={24} weight="bold" />
        </div>
        <div>
          <h2 className="font-heading text-foreground text-lg font-bold">Conta e Acesso</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie as credenciais de acesso ao painel do seu estabelecimento.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="border-border bg-surface flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              E-mail de login
            </span>
            <span className="text-foreground text-sm font-medium">{user?.email ?? '—'}</span>
          </div>

          <div className="flex items-center gap-2">
            {provider === 'google' ? (
              <span className="border-border bg-surface-elevated text-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-medium">
                <GoogleIcon className="h-3.5 w-3.5" />
                Conectado com Google
              </span>
            ) : (
              <span className="border-border bg-surface-elevated text-muted-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium">
                <KeyIcon size={14} weight="bold" />
                E-mail e Senha
              </span>
            )}
          </div>
        </div>

        {provider === 'google' ? (
          <div className="border-border/60 bg-surface/50 flex items-start gap-3 rounded-xl border p-4 text-sm">
            <ShieldCheckIcon size={20} weight="bold" className="text-primary mt-0.5 shrink-0" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Sua conta utiliza a autenticação do Google. A segurança e recuperação de senha são
              gerenciadas diretamente na sua conta Google.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col">
              <span className="font-heading text-foreground text-sm font-semibold">
                Alterar senha
              </span>
              <span className="text-muted-foreground text-xs">
                Defina uma nova senha para acessar o painel administrativo.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="new-password"
                  className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
                >
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setPasswordSuccess(false);
                    setPasswordError(null);
                    setNewPassword(e.target.value);
                  }}
                  placeholder="Mínimo de 6 caracteres"
                  className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirm-password"
                  className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setPasswordSuccess(false);
                    setPasswordError(null);
                    setConfirmPassword(e.target.value);
                  }}
                  placeholder="Repita a nova senha"
                  className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus:border-primary h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition-colors"
                />
              </div>
            </div>

            {passwordError ? (
              <p className="text-destructive text-xs">{passwordError}</p>
            ) : null}

            {passwordSuccess ? (
              <p className="text-primary inline-flex items-center gap-1.5 text-xs font-medium">
                <CheckCircleIcon size={16} weight="bold" />
                Senha alterada com sucesso.
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busyPassword || !newPassword || !confirmPassword}
                className="shadow-neon bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
              >
                <KeyIcon size={16} weight="bold" />
                {busyPassword ? 'Salvando…' : 'Salvar nova senha'}
              </button>
            </div>
          </form>
        )}

        <div className="border-border/60 border-t pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <span className="font-heading text-foreground text-sm font-semibold">
                Sessões ativas
              </span>
              <span className="text-muted-foreground text-xs">
                Se você acessou o painel em um computador de balcão compartilhado, pode desconectar
                outros acessos.
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOutOthers()}
              disabled={busySignOutOthers}
              className="border-border bg-surface-elevated text-foreground hover:bg-surface inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <DeviceMobileIcon size={16} weight="bold" />
              {busySignOutOthers ? 'Desconectando…' : 'Desconectar outros dispositivos'}
            </button>
          </div>

          {sessionsNotice ? (
            <p className="text-muted-foreground mt-2 text-xs">{sessionsNotice}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
