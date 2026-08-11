import { getFriendlyErrorMessage } from '@agenda/core';
import { Alert } from 'react-native';

export * from '@agenda/core';

/** Alerta nativo com mensagem amigável (parte específica de plataforma). */
export function showUserFriendlyAlert(error: unknown, title = 'Ops!'): void {
  Alert.alert(title, getFriendlyErrorMessage(error), [{ text: 'OK' }]);
}
