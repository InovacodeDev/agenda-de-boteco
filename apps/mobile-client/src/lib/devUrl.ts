import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

interface Manifest2WithExtra {
  extra?: {
    expoGo?: { debuggerHost?: string };
    expoClient?: { hostUri?: string };
  };
}

interface SourceCodeModule {
  scriptURL?: string;
}

export function extractHostname(urlOrHost: string): string | null {
  const stripped = urlOrHost.replace(/^https?:\/\//, '').replace(/^exp:\/\//, '');
  const hostWithPort = stripped.split('/')[0];
  const host = hostWithPort ? hostWithPort.split(':')[0] : '';
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return null;
  }
  return host;
}

export function getDevHostIp(): string | null {
  const envHost = process.env.EXPO_PUBLIC_DEV_HOST_IP;
  if (envHost) {
    const extracted = extractHostname(envHost);
    if (extracted) return extracted;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = extractHostname(hostUri);
    if (host) return host;
  }

  const manifest2 = Constants.manifest2 as Manifest2WithExtra | null;
  const debuggerHost =
    manifest2?.extra?.expoGo?.debuggerHost || manifest2?.extra?.expoClient?.hostUri;
  if (debuggerHost) {
    const host = extractHostname(debuggerHost);
    if (host) return host;
  }

  try {
    const sourceCode = NativeModules.SourceCode as SourceCodeModule | undefined;
    const scriptUrl = sourceCode?.scriptURL;
    if (scriptUrl) {
      const host = extractHostname(scriptUrl);
      if (host) return host;
    }
  } catch {
    return null;
  }

  const linkingUri = Constants.linkingUri;
  if (linkingUri) {
    const host = extractHostname(linkingUri);
    if (host) return host;
  }

  return null;
}

export function resolveDevSupabaseUrl(
  rawUrl?: string,
  os: string = Platform.OS,
  isDev: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production',
  hostIpOverride?: string | null,
): string | undefined {
  const effectiveUrl =
    rawUrl || (isDev && os !== 'web' ? 'http://127.0.0.1:54321' : rawUrl);

  if (!effectiveUrl) {
    return undefined;
  }

  if (!isDev || os === 'web') {
    return effectiveUrl;
  }

  const isLoopback =
    effectiveUrl.includes('127.0.0.1') ||
    effectiveUrl.includes('localhost') ||
    effectiveUrl.includes('0.0.0.0');

  if (!isLoopback) {
    return effectiveUrl;
  }

  const hostIp = hostIpOverride !== undefined ? hostIpOverride : getDevHostIp();

  if (hostIp) {
    return effectiveUrl.replace(
      /:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)([:/]|$)/,
      `://${hostIp}$2`,
    );
  }

  if (os === 'android') {
    return effectiveUrl.replace(
      /:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)([:/]|$)/,
      `://10.0.2.2$2`,
    );
  }

  return effectiveUrl;
}
