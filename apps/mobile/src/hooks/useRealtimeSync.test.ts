/**
 * `nextRealtimeState` é o reducer puro da máquina de estados do realtime guiada
 * por AppState — a parte com lógica do hook. Contrato travado: SÓ `background`
 * derruba o socket vivo; `inactive` (Control Center, banner de chamada,
 * biometria) é no-op para não causar churn de socket nem tempestade de
 * invalidação; `active` reinscreve uma única vez e invalida as roots.
 */
import type { AppStateStatus } from 'react-native';

import { nextRealtimeState, type RealtimeStateActions } from './useRealtimeSync';

function makeActions() {
  const cleanup = jest.fn();
  const actions: RealtimeStateActions = {
    subscribe: jest.fn(() => cleanup),
    invalidateRoots: jest.fn(),
    teardown: jest.fn((unsubscribe: () => void) => unsubscribe()),
  };
  return { actions, cleanup };
}

describe('nextRealtimeState', () => {
  it('em active sem canal: assina e invalida as roots, retornando o cleanup', () => {
    const { actions, cleanup } = makeActions();

    const next = nextRealtimeState('active', null, actions);

    expect(actions.subscribe).toHaveBeenCalledTimes(1);
    expect(actions.invalidateRoots).toHaveBeenCalledTimes(1);
    expect(next).toBe(cleanup);
  });

  it('em active já com canal: no-op (não reassina nem reinvalida)', () => {
    const { actions } = makeActions();
    const current = jest.fn();

    const next = nextRealtimeState('active', current, actions);

    expect(actions.subscribe).not.toHaveBeenCalled();
    expect(actions.invalidateRoots).not.toHaveBeenCalled();
    expect(next).toBe(current);
  });

  it('em background com canal: derruba o socket e zera a ref', () => {
    const { actions } = makeActions();
    const current = jest.fn();

    const next = nextRealtimeState('background', current, actions);

    expect(actions.teardown).toHaveBeenCalledWith(current);
    expect(current).toHaveBeenCalledTimes(1);
    expect(next).toBeNull();
  });

  it('em background sem canal: no-op', () => {
    const { actions } = makeActions();

    const next = nextRealtimeState('background', null, actions);

    expect(actions.teardown).not.toHaveBeenCalled();
    expect(next).toBeNull();
  });

  it('em inactive com canal vivo: no-op — mantém o socket (não derruba como background)', () => {
    const { actions } = makeActions();
    const current = jest.fn();

    const next = nextRealtimeState('inactive', current, actions);

    expect(actions.teardown).not.toHaveBeenCalled();
    expect(actions.subscribe).not.toHaveBeenCalled();
    expect(actions.invalidateRoots).not.toHaveBeenCalled();
    expect(next).toBe(current);
  });

  it('ciclo active→inactive→active (sem background): socket único, sem reassinar nem reinvalidar', () => {
    const { actions, cleanup } = makeActions();

    let current = nextRealtimeState('active', null, actions);
    current = nextRealtimeState('inactive', current, actions);
    current = nextRealtimeState('active', current, actions);

    expect(actions.subscribe).toHaveBeenCalledTimes(1);
    expect(actions.invalidateRoots).toHaveBeenCalledTimes(1);
    expect(actions.teardown).not.toHaveBeenCalled();
    expect(current).toBe(cleanup);
  });

  it('ciclo active→background→active: derruba e reassina sem acumular canais', () => {
    const { actions } = makeActions();

    let current = nextRealtimeState('active', null, actions);
    current = nextRealtimeState('background', current, actions);
    expect(current).toBeNull();

    current = nextRealtimeState('active', current, actions);

    // 2 subscribes (inicial + resubscribe), 1 teardown, 2 invalidações de roots.
    expect(actions.subscribe).toHaveBeenCalledTimes(2);
    expect(actions.teardown).toHaveBeenCalledTimes(1);
    expect(actions.invalidateRoots).toHaveBeenCalledTimes(2);
    expect(current).not.toBeNull();
  });

  it('status desconhecido com canal: no-op (preserva a ref)', () => {
    const { actions } = makeActions();
    const current = jest.fn();

    const next = nextRealtimeState('unknown' as AppStateStatus, current, actions);

    expect(actions.subscribe).not.toHaveBeenCalled();
    expect(actions.teardown).not.toHaveBeenCalled();
    expect(next).toBe(current);
  });
});
