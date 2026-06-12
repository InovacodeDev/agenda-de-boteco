/** Assets estáticos resolvidos pelo Metro como id numérico no AssetRegistry */
declare module '*.png' {
  const assetId: number;
  export default assetId;
}
