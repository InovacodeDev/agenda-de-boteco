import { ESTABLISHMENT_ATTRIBUTES } from '@agenda/core';

import {
  DEFAULT_ICON_WEIGHT,
  ICON_NAMES,
  isIconName,
  resolveIcon,
  resolveWeight,
} from './iconMap';

/** Nomes de UI/navegação: o contrato herdado, consumido pelos call-sites. */
const UI_ICON_NAMES = [
  'apple',
  'arrow-left',
  'bell',
  'calendar',
  'check',
  'chevron-right',
  'circle-info',
  'clock',
  'comment',
  'download',
  'envelope',
  'file-pdf',
  'google',
  'heart',
  'house',
  'instagram',
  'location-arrow',
  'location-dot',
  'magnifying-glass',
  'music',
  'right-from-bracket',
  'share-nodes',
  'sliders',
  'star',
  'store',
  'ticket',
  'trash-can',
  'user',
  'wand-magic-sparkles',
  'xmark',
];

describe('iconMap', () => {
  it('mantém o conjunto de nomes de UI usado na app', () => {
    // Trava o contrato: remover/renomear um nome é breaking change.
    for (const name of UI_ICON_NAMES) {
      expect(ICON_NAMES).toContain(name);
    }
  });

  it('resolve todo nome registrado para um componente de ícone', () => {
    for (const name of ICON_NAMES) {
      expect(typeof resolveIcon(name)).toBe('function');
    }
  });

  it('cobre o ícone de todo atributo do catálogo', () => {
    // Sem isto, um atributo novo no core renderizaria sem ícone.
    for (const attribute of ESTABLISHMENT_ATTRIBUTES) {
      expect(isIconName(attribute.icon)).toBe(true);
    }
  });

  it('traduz variante da app para peso do Phosphor', () => {
    expect(resolveWeight('solid')).toBe('fill');
    expect(resolveWeight('regular')).toBe('regular');
    expect(resolveWeight('brands')).toBe('fill');
  });

  it('sem variante usa o peso default', () => {
    expect(resolveWeight()).toBe(DEFAULT_ICON_WEIGHT);
    expect(DEFAULT_ICON_WEIGHT).toBe('regular');
  });

  it('isIconName rejeita nomes desconhecidos', () => {
    expect(isIconName('nao-existe')).toBe(false);
  });
});
