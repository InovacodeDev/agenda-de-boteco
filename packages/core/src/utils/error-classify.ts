import { AuthError, type PostgrestError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

export type ErrorType =
  | 'ZodValidationError'
  | 'PostgrestDatabaseError'
  | 'SupabaseAuthError'
  | 'SupabaseStorageError'
  | 'NetworkError'
  | 'AbortError'
  | 'UnsupportedFileTypeError'
  | 'AuthUnavailableError'
  | 'UnknownError'
  | (string & {});

const NETWORK_ERROR_MESSAGES: readonly string[] = [
  'Network request failed',
  'Failed to fetch',
  'Load failed',
  'NetworkError when attempting to fetch resource',
];

export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    'details' in error &&
    'hint' in error &&
    'code' in error
  );
}

export function isAuthError(error: unknown): error is AuthError {
  return (
    error instanceof AuthError ||
    (error !== null &&
      typeof error === 'object' &&
      '__isAuthError' in error &&
      (error as { __isAuthError: boolean }).__isAuthError === true)
  );
}

export function isStorageError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    '__isStorageError' in error &&
    (error as { __isStorageError: unknown }).__isStorageError === true
  );
}

const PERMANENT_WRITE_ERROR_CODES: readonly string[] = [
  '42501',
  '23503',
  '23505',
  '23514',
  '22P02',
];

/** Erro de escrita que repetir a mesma operação nunca resolve (RLS, FK, constraint, payload inválido). */
export function isPermanentWriteError(error: unknown): boolean {
  return isPostgrestError(error) && PERMANENT_WRITE_ERROR_CODES.includes(error.code);
}

function hasName(error: unknown, name: string): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: unknown }).name === name
  );
}

export function getErrorType(error: unknown): ErrorType {
  if (error instanceof ZodError) {
    return 'ZodValidationError';
  }
  if (isPostgrestError(error)) {
    return 'PostgrestDatabaseError';
  }
  if (isAuthError(error)) {
    return 'SupabaseAuthError';
  }
  if (isStorageError(error)) {
    return 'SupabaseStorageError';
  }
  if (
    error instanceof TypeError &&
    NETWORK_ERROR_MESSAGES.some((message) => error.message.includes(message))
  ) {
    return 'NetworkError';
  }
  if (hasName(error, 'AbortError')) {
    return 'AbortError';
  }
  if (error instanceof Error) {
    return error.name && error.name !== 'Error' ? error.name : error.constructor.name;
  }
  return 'UnknownError';
}

export function getErrorCode(error: unknown): string | undefined {
  if (isPostgrestError(error)) {
    return error.code;
  }
  if (isAuthError(error)) {
    return error.code || undefined;
  }
  return undefined;
}

export function getErrorStatus(error: unknown): number | undefined {
  if (
    (isAuthError(error) || isStorageError(error)) &&
    error !== null &&
    typeof error === 'object'
  ) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}
