import { Alert } from 'react-native';

import { showUserFriendlyAlert } from './errors';

describe('showUserFriendlyAlert', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('triggers Alert.alert with correct messages', () => {
    const err = new TypeError('Network request failed');
    showUserFriendlyAlert(err, 'Attention');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Attention',
      'Servidor fora do ar ou sem conexão com a internet. Verifique sua conexão e tente novamente.',
      [{ text: 'OK' }],
    );
  });
});
