const SCROLL_BOTTOM_PADDING = 48;

export function scrollContentClassName(isTablet: boolean): string {
  return isTablet ? 'grow px-8 pb-12 pt-6' : 'grow px-5 pb-12 pt-5';
}

// NOTE: no tablet cada item de lista já traz p-2 de gutter entre colunas, então 24/16 aqui alinha a borda visual em 32/24.
export function listContentStyle(isTablet: boolean) {
  return {
    paddingHorizontal: isTablet ? 24 : 20,
    paddingTop: isTablet ? 16 : 20,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  };
}
