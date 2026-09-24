import Constants from 'expo-constants';

import { extractHostname, getDevHostIp, resolveDevSupabaseUrl } from './devUrl';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: null,
    manifest2: null,
    linkingUri: '',
  },
}));

describe('devUrl', () => {
  const originalEnvHost = process.env.EXPO_PUBLIC_DEV_HOST_IP;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_DEV_HOST_IP;
    Constants.expoConfig = null;
    Constants.manifest2 = null;
    Constants.linkingUri = '';
  });

  afterAll(() => {
    if (originalEnvHost !== undefined) {
      process.env.EXPO_PUBLIC_DEV_HOST_IP = originalEnvHost;
    } else {
      delete process.env.EXPO_PUBLIC_DEV_HOST_IP;
    }
  });

  it('retorna rawUrl inalterada em produção', () => {
    Constants.expoConfig = { hostUri: '192.168.1.50:10003' } as unknown as typeof Constants.expoConfig;
    const resolved = resolveDevSupabaseUrl('http://127.0.0.1:54321', 'ios', false);
    expect(resolved).toBe('http://127.0.0.1:54321');
  });

  it('retorna rawUrl inalterada na web', () => {
    Constants.expoConfig = { hostUri: '192.168.1.50:10003' } as unknown as typeof Constants.expoConfig;
    const resolved = resolveDevSupabaseUrl('http://127.0.0.1:54321', 'web', true);
    expect(resolved).toBe('http://127.0.0.1:54321');
  });

  it('retorna rawUrl inalterada para URL remota na nuvem', () => {
    Constants.expoConfig = { hostUri: '192.168.1.50:10003' } as unknown as typeof Constants.expoConfig;
    const resolved = resolveDevSupabaseUrl('https://myproject.supabase.co', 'ios', true);
    expect(resolved).toBe('https://myproject.supabase.co');
  });

  it('substitui 127.0.0.1 pelo IP do host extraído de hostUri no mobile nativo', () => {
    Constants.expoConfig = { hostUri: '192.168.1.50:10003' } as unknown as typeof Constants.expoConfig;
    const resolved = resolveDevSupabaseUrl('http://127.0.0.1:54321', 'ios', true);
    expect(resolved).toBe('http://192.168.1.50:54321');
  });

  it('substitui localhost pelo IP extraído de linkingUri', () => {
    Constants.linkingUri = 'exp://192.168.0.22:10003';
    const resolved = resolveDevSupabaseUrl('http://localhost:54321', 'ios', true);
    expect(resolved).toBe('http://192.168.0.22:54321');
  });

  it('prioriza EXPO_PUBLIC_DEV_HOST_IP quando definido manualmente', () => {
    process.env.EXPO_PUBLIC_DEV_HOST_IP = '10.0.0.99';
    Constants.expoConfig = { hostUri: '192.168.1.50:10003' } as unknown as typeof Constants.expoConfig;
    const resolved = resolveDevSupabaseUrl('http://127.0.0.1:54321', 'ios', true);
    expect(resolved).toBe('http://10.0.0.99:54321');
  });

  it('substitui por 10.0.2.2 no emulador Android quando nenhum IP for detectado', () => {
    const resolved = resolveDevSupabaseUrl('http://127.0.0.1:54321', 'android', true);
    expect(resolved).toBe('http://10.0.2.2:54321');
  });

  it('usa fallback para 127.0.0.1 e converte quando rawUrl não for definida em dev nativo', () => {
    Constants.expoConfig = { hostUri: '192.168.1.50:10003' } as unknown as typeof Constants.expoConfig;
    const resolved = resolveDevSupabaseUrl(undefined, 'ios', true);
    expect(resolved).toBe('http://192.168.1.50:54321');
  });

  it('suporta override explícito de hostIp', () => {
    const resolved = resolveDevSupabaseUrl('http://127.0.0.1:54321', 'ios', true, '172.20.10.2');
    expect(resolved).toBe('http://172.20.10.2:54321');
  });

  it('valida utilitário extractHostname corretamente', () => {
    expect(extractHostname('http://192.168.1.10:8081')).toBe('192.168.1.10');
    expect(extractHostname('192.168.1.10:8081')).toBe('192.168.1.10');
    expect(extractHostname('localhost:8081')).toBeNull();
    expect(extractHostname('127.0.0.1:8081')).toBeNull();
    expect(extractHostname('')).toBeNull();
  });

  it('retorna null em getDevHostIp quando não houver fonte válida de host', () => {
    expect(getDevHostIp()).toBeNull();
  });
});
