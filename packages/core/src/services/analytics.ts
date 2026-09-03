/**
 * Fachada de analytics/feature flags, agnóstica de provider — mesmo padrão de
 * `supabase/client.ts` (interface + configure/get). `posthog-js` é browser-only
 * e não pode ser dependência do core (o mobile também o consome); cada app Next
 * injeta o adapter concreto no bootstrap via `configureAnalytics`.
 *
 * Regra de PII (Seção 0 do AGENTS.md): `properties` de `trackEvent` aceita só
 * identificadores opacos e metadados (ids, contagens, nomes de categoria) —
 * nunca e-mail, telefone, CPF ou outro dado pessoal. `identifyAnalyticsUser`
 * recebe só o uuid opaco do Supabase, nunca e-mail/telefone.
 */
export interface AnalyticsAdapter {
  capturePageview(path: string): void;
  captureEvent(name: string, properties?: Record<string, unknown>): void;
  identify(userId: string): void;
  reset(): void;
  isFeatureEnabled(key: string): boolean;
  /** Chamado quando as flags carregam/mudam (assíncrono no PostHog). Retorna cleanup. */
  onFeatureFlags(callback: () => void): () => void;
}

let adapter: AnalyticsAdapter | null = null;

/** Cada app registra seu adapter no bootstrap (ou null, se rodar sem analytics configurado). */
export function configureAnalytics(instance: AnalyticsAdapter | null): void {
  adapter = instance;
}

/** Adapter configurado, ou null se não houver. */
export function getConfiguredAnalytics(): AnalyticsAdapter | null {
  return adapter;
}

/**
 * Funções de conveniência: nunca lançam. Falha de tracking não pode quebrar a
 * navegação (mesmo espírito de `services/metrics.ts`), e sem adapter
 * configurado (dev sem env var) elas são no-op silencioso.
 */
export function trackPageview(path: string): void {
  adapter?.capturePageview(path);
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  adapter?.captureEvent(name, properties);
}

export function identifyAnalyticsUser(userId: string): void {
  adapter?.identify(userId);
}

export function resetAnalytics(): void {
  adapter?.reset();
}
