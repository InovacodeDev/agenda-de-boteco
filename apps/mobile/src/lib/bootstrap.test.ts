jest.mock('expo-linking', () => ({ createURL: () => 'agenda-de-boteco://' }));
// mock do client supabase para getSupabase retornar um objeto não-null
jest.mock('./supabase', () => ({ getSupabase: () => ({ auth: {} }) }));

import './bootstrap'; // efeito colateral: chama configureSupabase

import { isSupabaseConfigured } from '@agenda/core';

describe('bootstrap', () => {
  it('configura o client supabase (isSupabaseConfigured volta true)', () => {
    expect(isSupabaseConfigured()).toBe(true);
  });
});
