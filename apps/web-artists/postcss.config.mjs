import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    '@tailwindcss/postcss': {
      base: path.resolve(dirname, '../../'),
    },
  },
};
export default config;

