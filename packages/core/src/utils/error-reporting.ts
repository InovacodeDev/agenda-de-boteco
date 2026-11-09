import { ZodError } from 'zod';

import {
  getErrorCode,
  getErrorStatus,
  getErrorType,
  isAuthError,
  isPostgrestError,
  isStorageError,
} from './error-classify';

export interface SafeErrorMetadata {
  method?: string;
  errorType?: string;
  code?: string;
  status?: number;
  fingerprint?: readonly string[];
  componentStack?: string;
  recordId?: string;
}

export const EXPECTED_AUTH_CODES: readonly string[] = [
  'invalid_credentials',
  'invalid_grant',
  'otp_expired',
];

export const SENSITIVE_URL_PARAMS: readonly string[] = [
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
  'code',
  'token',
  'token_hash',
  'email',
];

export const URL_PROPERTY_KEYS: readonly string[] = [
  '$current_url',
  '$referrer',
  '$initial_referrer',
  '$initial_current_url',
  '$session_entry_url',
  '$prev_pageview_pathname',
];

const MAX_ZOD_ISSUES = 5;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const JWT_PATTERN = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
// REGEX: 8+ dígitos, com ou sem separador (CPF, CNPJ, telefone)
const LONG_NUMBER_PATTERN = /\d(?:[\s.\-/()]*\d){7,}/g;
// REGEX: frame de stack no formato V8/Hermes ("  at fn (file:1:1)") ou JSC ("fn@file:1:1")
const STACK_FRAME_PATTERN = /^\s+at\s|@\S*:\d+:\d+\s*$/;
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;

export function isExpectedError(error: unknown): boolean {
  if (getErrorType(error) === 'AbortError') {
    return true;
  }
  const code = getErrorCode(error);
  return isAuthError(error) && code !== undefined && EXPECTED_AUTH_CODES.includes(code);
}

export function buildSafeErrorMetadata(error: unknown, method?: string): SafeErrorMetadata {
  const metadata: SafeErrorMetadata = { errorType: getErrorType(error) };
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  if (method !== undefined) {
    metadata.method = method;
  }
  if (code !== undefined) {
    metadata.code = code;
  }
  if (status !== undefined) {
    metadata.status = status;
  }
  return metadata;
}

export function redactMessage(message: string): string {
  return message
    .replace(JWT_PATTERN, '[token]')
    .replace(EMAIL_PATTERN, '[email]')
    .replace(LONG_NUMBER_PATTERN, '[number]');
}

function describeZodError(error: ZodError): string {
  return error.issues
    .slice(0, MAX_ZOD_ISSUES)
    .map((issue) => {
      const path = issue.path.map((segment) => (typeof segment === 'number' ? '*' : segment));
      return `${path.join('.') || 'root'}:${issue.code}`;
    })
    .join('; ');
}

function toSafeNameAndMessage(error: unknown): { name: string; message: string } {
  if (error instanceof ZodError) {
    return { name: 'ZodValidationError', message: describeZodError(error) };
  }
  if (isPostgrestError(error)) {
    return { name: 'PostgrestError', message: `Postgrest ${error.code}` };
  }
  if (isAuthError(error)) {
    return {
      name: 'SupabaseAuthError',
      message: `Auth ${getErrorCode(error) ?? getErrorStatus(error) ?? 'unknown'}`,
    };
  }
  if (isStorageError(error)) {
    return {
      name: 'SupabaseStorageError',
      message: `Storage ${getErrorStatus(error) ?? 'unknown'}`,
    };
  }
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: redactMessage(error.message) };
  }
  return { name: 'UnknownError', message: 'UnknownError' };
}

export function toReportableError(error: unknown): Error {
  const { name, message } = toSafeNameAndMessage(error);
  const reportable = new Error(message);
  reportable.name = name;
  const source =
    error instanceof Error && typeof error.stack === 'string' ? error.stack : reportable.stack;
  const frames = (source ?? '').split('\n').filter((line) => STACK_FRAME_PATTERN.test(line));
  reportable.stack = [`${name}: ${message}`, ...frames].join('\n');
  return reportable;
}

function isSensitiveParam(pair: string): boolean {
  const rawKey = pair.split('=')[0] ?? '';
  try {
    return rawKey === '' || SENSITIVE_URL_PARAMS.includes(decodeURIComponent(rawKey).toLowerCase());
  } catch {
    return true;
  }
}

export function sanitizeUrl(url: string): string {
  if (!ABSOLUTE_URL_PATTERN.test(url) && !url.startsWith('/')) {
    return url;
  }
  const withoutHash = url.split('#')[0] ?? '';
  const queryStart = withoutHash.indexOf('?');
  if (queryStart === -1) {
    return withoutHash;
  }
  const base = withoutHash.slice(0, queryStart);
  const kept = withoutHash
    .slice(queryStart + 1)
    .split('&')
    .filter((pair) => !isSensitiveParam(pair));
  return kept.length > 0 ? `${base}?${kept.join('&')}` : base;
}

export function sanitizeCaptureEvent<T extends { properties?: Record<string, unknown> }>(
  event: T | null,
): T | null {
  if (event === null || event.properties === undefined) {
    return event;
  }
  const properties = { ...event.properties };
  for (const key of URL_PROPERTY_KEYS) {
    const value = properties[key];
    if (typeof value === 'string') {
      properties[key] = sanitizeUrl(value);
    }
  }
  return { ...event, properties };
}
