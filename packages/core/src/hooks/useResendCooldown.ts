import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Espelha `email_sent = 2` de [auth.rate_limit] em supabase/config.toml: é o
 * número de e-mails que o Supabase aceita enviar por hora. Ao atingir esse
 * número avisamos antes, em vez de deixar o usuário levar um erro seco do
 * servidor na tentativa seguinte.
 */
export const OTP_ATTEMPTS_PER_HOUR = 2;

/** Cooldown de UI entre reenvios. Impede rajada; não substitui o limite do servidor. */
export const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

export interface ResendCooldownOptions {
  cooldownSeconds?: number;
}

export interface ResendCooldownState {
  isReady: boolean;
  remainingSeconds: number;
  attempts: number;
  hasReachedHourlyLimit: boolean;
  start: () => void;
  reset: () => void;
}

/**
 * Contagem regressiva de reenvio de código + contador de tentativas da sessão
 * de tela. Estado efêmero de propósito: é proteção de UX, não de segurança — o
 * limite real é do Supabase e não pode ser burlado pelo cliente de qualquer forma.
 */
export function useResendCooldown({
  cooldownSeconds = DEFAULT_RESEND_COOLDOWN_SECONDS,
}: ResendCooldownOptions = {}): ResendCooldownState {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    setAttempts((current) => current + 1);
    setRemainingSeconds(cooldownSeconds);
    clear();
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          clear();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [clear, cooldownSeconds]);

  const reset = useCallback(() => {
    clear();
    setRemainingSeconds(0);
    setAttempts(0);
  }, [clear]);

  return {
    isReady: remainingSeconds === 0,
    remainingSeconds,
    attempts,
    hasReachedHourlyLimit: attempts >= OTP_ATTEMPTS_PER_HOUR,
    start,
    reset,
  };
}
