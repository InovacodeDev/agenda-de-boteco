import { configureAppStorage } from './src/platform/storage';

const mem = new Map<string, string>();
configureAppStorage({
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => {
    mem.set(k, v);
  },
  removeItem: (k) => {
    mem.delete(k);
  },
});
