import { isBlockedPanelRoute } from './usePanelFlags';

const allOff = { 'panel-metrics': false, 'panel-reviews': false, 'panel-settings': false };
const allOn = { 'panel-metrics': true, 'panel-reviews': true, 'panel-settings': true };

describe('isBlockedPanelRoute', () => {
  it('bloqueia as rotas com flag desligada', () => {
    expect(isBlockedPanelRoute('/metrics', allOff)).toBe(true);
    expect(isBlockedPanelRoute('/reviews', allOff)).toBe(true);
    expect(isBlockedPanelRoute('/settings', allOff)).toBe(true);
  });

  it('libera as rotas com flag ligada', () => {
    expect(isBlockedPanelRoute('/metrics', allOn)).toBe(false);
    expect(isBlockedPanelRoute('/settings', allOn)).toBe(false);
  });

  it('avalia cada flag de forma independente', () => {
    const onlyMetrics = { ...allOff, 'panel-metrics': true };
    expect(isBlockedPanelRoute('/metrics', onlyMetrics)).toBe(false);
    expect(isBlockedPanelRoute('/reviews', onlyMetrics)).toBe(true);
  });

  it('nunca bloqueia rotas sem flag', () => {
    for (const path of ['/', '/events', '/events/new', '/artists', '/profile']) {
      expect(isBlockedPanelRoute(path, allOff)).toBe(false);
    }
  });
});
