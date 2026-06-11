import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Adapter JSON compartilhado para o middleware `persist` do zustand.
 * Usa AsyncStorage, que funciona em iOS, Android e web (localStorage).
 */
export const appJsonStorage = createJSONStorage(() => AsyncStorage);
