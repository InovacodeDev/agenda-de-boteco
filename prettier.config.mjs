// prettier.config.mjs — shared formatting for the whole monorepo.
// Install: pnpm add -D -w prettier prettier-plugin-tailwindcss

/** @type {import('prettier').Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all', // Prettier 3 default; keeps diffs clean on multi-line
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',

  // Auto-sorts Tailwind / Nativewind classes into the canonical order.
  // In a monorepo with multiple tailwind configs, the plugin resolves the
  // nearest config per file. If a specific app isn't picked up, add a small
  // per-app prettier config setting `tailwindConfig` / `tailwindStylesheet`.
  plugins: ['prettier-plugin-tailwindcss'],
};
