import localFont from 'next/font/local';

// ponytail: variable fonts — um arquivo por subset cobre toda a faixa de pesos,
// por isso não há um .woff2 por peso. Trocar por arquivos estáticos só se
// algum app precisar de um peso fora dessa faixa.
//
// Os dois subsets (latin e latin-ext) entram como src do mesmo localFont: o
// browser resolve pela ordem e o latin-ext, que traz a acentuação que o latin
// básico não cobre, fica como complemento.
export const inter = localFont({
  src: [
    { path: './files/inter-latin.woff2', weight: '100 900', style: 'normal' },
    { path: './files/inter-latin-ext.woff2', weight: '100 900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
});

export const spaceGrotesk = localFont({
  src: [
    { path: './files/space-grotesk-latin.woff2', weight: '300 700', style: 'normal' },
    { path: './files/space-grotesk-latin-ext.woff2', weight: '300 700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-space-grotesk',
  fallback: ['Space Grotesk', 'system-ui', 'sans-serif'],
});

export const fontVariables = `${inter.variable} ${spaceGrotesk.variable}`;
