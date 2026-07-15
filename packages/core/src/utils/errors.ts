import { AuthError, type PostgrestError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

import { isProduction } from './env';

export interface ErrorContext {
  method: string;
  args?: Record<string, unknown>;
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    'details' in error &&
    'hint' in error &&
    'code' in error
  );
}

function isAuthError(error: unknown): error is AuthError {
  return (
    error instanceof AuthError ||
    (error !== null &&
      typeof error === 'object' &&
      '__isAuthError' in error &&
      (error as { __isAuthError: boolean }).__isAuthError === true)
  );
}

function getErrorType(error: unknown): string {
  if (error instanceof ZodError) {
    return 'ZodValidationError';
  }
  if (isPostgrestError(error)) {
    return 'PostgrestDatabaseError';
  }
  if (isAuthError(error)) {
    return 'SupabaseAuthError';
  }
  if (error instanceof TypeError && error.message.includes('Network request failed')) {
    return 'NetworkError';
  }
  if (error instanceof Error) {
    return error.constructor.name;
  }
  return 'UnknownError';
}

function getErrorDetails(error: unknown): string {
  if (error instanceof ZodError) {
    return JSON.stringify(error.issues, null, 2);
  }
  if (isPostgrestError(error)) {
    return error.details;
  }
  return '';
}

function getErrorCode(error: unknown): string {
  if (isPostgrestError(error)) {
    return error.code;
  }
  if (isAuthError(error)) {
    return error.code || 'None';
  }
  return 'None';
}

function getErrorHint(error: unknown): string {
  if (isPostgrestError(error)) {
    return error.hint;
  }
  return '';
}

export function logErrorToTerminal(error: unknown, context: ErrorContext): void {
  if (isProduction()) {
    return;
  }

  const errorType = getErrorType(error);
  const details = getErrorDetails(error);
  const code = getErrorCode(error);
  const hint = getErrorHint(error);
  const message = error instanceof Error ? error.message : String(error);

  console.error(`
======================================================================
🚨 [Agenda de Boteco] SUPABASE/TANSTACK QUERY ERROR
======================================================================
Method: ${context.method}
Arguments: ${JSON.stringify(context.args || {}, null, 2)}
Error Type: ${errorType}
Message: ${message}
Code: ${code}
Details: ${details}
Hint: ${hint}
Stack: ${error instanceof Error ? error.stack : 'No stack trace'}

----------------------------------------------------------------------
🤖 AI DEBUG ASSISTANT (Copy & paste this section to your AI helper)
----------------------------------------------------------------------
I encountered an error in my Expo/React Native app with Supabase.
Context: method "${context.method}"
Parameters: ${JSON.stringify(context.args || {})}
Error Type: ${errorType}
Message: "${message}"
Code: "${code}"
Details: "${details}"
Hint: "${hint}"

Please analyze this error and provide the solution to fix it.
======================================================================
  `);
}

export function getFriendlyErrorMessage(error: unknown): string {
  const type = getErrorType(error);

  if (type === 'NetworkError') {
    return 'Servidor fora do ar ou sem conexão com a internet. Verifique sua conexão e tente novamente.';
  }

  if (type === 'SupabaseAuthError') {
    const code = getErrorCode(error);
    const msg = error instanceof Error ? error.message.toLowerCase() : '';

    if (
      code === 'invalid_credentials' ||
      code === 'invalid_grant' ||
      msg.includes('invalid credentials') ||
      msg.includes('invalid otp')
    ) {
      return 'Código de acesso ou e-mail incorreto. Verifique os dados e tente novamente.';
    }
    if (code === 'validation_failed' || msg.includes('email') || msg.includes('invalid email')) {
      return 'O e-mail digitado parece inválido. Verifique se digitou corretamente.';
    }
    if (code === 'otp_expired' || msg.includes('expired')) {
      return 'O código de acesso expirou. Por favor, solicite um novo.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.';
    }
    return 'Erro ao tentar autenticar. Verifique seus dados e tente novamente.';
  }

  if (type === 'PostgrestDatabaseError') {
    return 'Não foi possível carregar as informações do servidor. Se o problema persistir, tente mais tarde.';
  }

  if (type === 'ZodValidationError') {
    return 'Erro interno ao processar dados. O aplicativo pode precisar ser atualizado.';
  }

  return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
}

export function handleServiceError(error: unknown, context: ErrorContext): never {
  logErrorToTerminal(error, context);
  throw error;
}
