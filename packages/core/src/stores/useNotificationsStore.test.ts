import {
  isNotificationUnread,
  unreadNotificationCount,
  useNotificationsStore,
} from './useNotificationsStore';

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

  describe('isNotificationUnread', () => {
    it('não-lido quando server.read=false e id fora de readIds', () => {
      expect(isNotificationUnread([], { id: 'n1', read: false })).toBe(true);
    });
    it('lido quando server.read=true (ignora readIds)', () => {
      expect(isNotificationUnread([], { id: 'n1', read: true })).toBe(false);
    });
    it('lido quando id está em readIds (marcação local)', () => {
      expect(isNotificationUnread(['n1'], { id: 'n1', read: false })).toBe(false);
    });
  });

  describe('unreadNotificationCount', () => {
    it('conta só os não-lidos', () => {
      const list = [
        { id: 'n1', read: false }, // unread
        { id: 'n2', read: true }, // lido no server
        { id: 'n3', read: false }, // lido local
        { id: 'n4', read: false }, // unread
      ];
      expect(unreadNotificationCount(['n3'], list)).toBe(2);
    });
    it('zero para lista vazia', () => {
      expect(unreadNotificationCount([], [])).toBe(0);
    });
  });
});
