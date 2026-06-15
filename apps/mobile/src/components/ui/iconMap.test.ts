import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { ICON_NAMES, resolveIcon } from './iconMap';

function isIconDefinition(value: unknown): value is IconDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'iconName' in value &&
    'prefix' in value &&
    'icon' in value
  );
}

describe('iconMap', () => {
  it('exposes the full set of names used across the app', () => {
    // Locks the contract: removing/renaming a name is a breaking change.
    expect([...ICON_NAMES].sort()).toEqual(
      [
        'apple',
        'arrow-left',
        'at',
        'bell',
        'calendar',
        'check',
        'chevron-right',
        'circle-info',
        'clock',
        'comment',
        'envelope',
        'google',
        'heart',
        'house',
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
        'user',
        'wand-magic-sparkles',
        'xmark',
      ].sort(),
    );
  });

  it('resolves every name (default variant) to a valid FA IconDefinition', () => {
    for (const name of ICON_NAMES) {
      expect(isIconDefinition(resolveIcon(name))).toBe(true);
    }
  });

  it('resolves solid and regular variants for two-state icons', () => {
    expect(resolveIcon('heart', 'solid').prefix).toBe('fas');
    expect(resolveIcon('heart', 'regular').prefix).toBe('far');
    expect(resolveIcon('star', 'solid').prefix).toBe('fas');
    expect(resolveIcon('star', 'regular').prefix).toBe('far');
  });

  it('resolves brand icons with the fab prefix', () => {
    expect(resolveIcon('apple').prefix).toBe('fab');
    expect(resolveIcon('google').prefix).toBe('fab');
  });

  it('falls back to the available definition when a variant is missing', () => {
    // location-dot has only solid; asking for regular must not return undefined.
    expect(isIconDefinition(resolveIcon('location-dot', 'regular'))).toBe(true);
    expect(resolveIcon('location-dot', 'regular').prefix).toBe('fas');
  });

  it('returns the exact mapped FA icon for representative names', () => {
    expect(resolveIcon('magnifying-glass').iconName).toBe('magnifying-glass');
    expect(resolveIcon('location-dot').iconName).toBe('location-dot');
    expect(resolveIcon('xmark').iconName).toBe('xmark');
    expect(resolveIcon('right-from-bracket').iconName).toBe('right-from-bracket');
    expect(resolveIcon('wand-magic-sparkles').iconName).toBe('wand-magic-sparkles');
  });
});
