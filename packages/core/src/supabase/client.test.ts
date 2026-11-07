import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types';
import type * as ClientNs from './client';

type ClientModule = typeof ClientNs;

function loadFresh(): ClientModule {
  let mod: ClientModule | undefined;
  jest.isolateModules(() => {
    mod = jest.requireActual<ClientModule>('./client');
  });
  if (!mod) throw new Error('módulo não carregado');
  return mod;
}

describe('Regra de negócio: client Supabase configurável', () => {
  it('devolve o client registrado pelo app', () => {
    const mod = loadFresh();
    const fake = { from: jest.fn() } as unknown as SupabaseClient<Database>;

    mod.configureSupabase(() => fake);

    expect(mod.getConfiguredSupabase()).toBe(fake);
    expect(mod.isSupabaseConfigured()).toBe(true);
  });

  it('cria client com URL e chave de exemplo', () => {
    const mod = loadFresh();

    const client = mod.createSupabaseClient({
      url: 'http://localhost:54321',
      anonKey: 'chave-de-teste',
    });

    expect(typeof client.from).toBe('function');
  });
});

describe('Tratamento de erro: client Supabase ausente', () => {
  it('devolve null antes de qualquer configuração', () => {
    const mod = loadFresh();

    expect(mod.getConfiguredSupabase()).toBeNull();
    expect(mod.isSupabaseConfigured()).toBe(false);
  });

  it('devolve null quando o getter do app não tem client', () => {
    const mod = loadFresh();

    mod.configureSupabase(() => null);

    expect(mod.isSupabaseConfigured()).toBe(false);
  });

  it.each([
    ['URL vazia', { url: '', anonKey: 'k' }],
    ['chave vazia', { url: 'http://localhost:54321', anonKey: '' }],
  ])('recusa criar client com %s', (_label, options) => {
    const mod = loadFresh();

    expect(() => mod.createSupabaseClient(options)).toThrow(/"url" and "anonKey" are required/);
  });
});
