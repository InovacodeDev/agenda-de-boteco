import { useNotificationsStore } from './useNotificationsStore';

describe('useNotificationsStore', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ readIds: [] });
  });

  it('markRead adiciona o id uma única vez (idempotente)', () => {
    useNotificationsStore.getState().markRead('n1');
    useNotificationsStore.getState().markRead('n1');
    expect(useNotificationsStore.getState().readIds).toEqual(['n1']);
  });

  it('markAllRead acumula sem duplicar', () => {
    useNotificationsStore.getState().markRead('n1');
    useNotificationsStore.getState().markAllRead(['n1', 'n2', 'n3']);
    expect(useNotificationsStore.getState().readIds).toEqual(['n1', 'n2', 'n3']);
  });
});
