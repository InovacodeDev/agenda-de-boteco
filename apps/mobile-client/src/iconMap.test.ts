import {
  DEFAULT_ICON_WEIGHT,
  ICON_NAMES,
  isIconName,
  resolveIcon,
  resolveWeight,
} from '@agenda/shared-ui-mobile';

describe('iconMap em shared-ui-mobile', () => {
  it('resolve todos os icon names mapeados', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(30);
    for (const name of ICON_NAMES) {
      const Component = resolveIcon(name);
      expect(Component).toBeDefined();
    }
  });

  it('verifica type guard isIconName', () => {
    expect(isIconName('calendar')).toBe(true);
    expect(isIconName('store')).toBe(true);
    expect(isIconName('non-existent-icon')).toBe(false);
  });

  it('resolve pesos corretamente', () => {
    expect(resolveWeight()).toBe(DEFAULT_ICON_WEIGHT);
    expect(resolveWeight('solid')).toBe('fill');
    expect(resolveWeight('regular')).toBe('regular');
    expect(resolveWeight('brands')).toBe('fill');
  });
});
