// Next 15.5 ships type declarations only for *.module.css, not for global CSS
// side-effect imports. Declare them so `import './globals.css'` typechecks.
declare module '*.css';
