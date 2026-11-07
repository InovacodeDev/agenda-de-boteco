import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { ImagePickerField } from './ImagePickerField';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const picker = jest.mocked(ExpoImagePicker);

const ASSET_URI = 'file:///tmp/foto.jpg';

function grantAndPick() {
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: ASSET_URI, mimeType: 'image/jpeg' }],
  } as never);
  globalThis.fetch = jest.fn().mockResolvedValue({
    blob: () => Promise.resolve(new Blob(['x'], { type: 'image/jpeg' })),
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Regra de negócio: seleção e envio de imagem', () => {
  it('envia a imagem escolhida e devolve a URL publicada', async () => {
    grantAndPick();
    const onUpload = jest.fn().mockResolvedValue('https://cdn.example/banner.jpg');
    const onChange = jest.fn();
    await render(<ImagePickerField label="Banner" value="" onChange={onChange} onUpload={onUpload} />);

    await fireEvent.press(screen.getByLabelText('Banner: selecionar imagem'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn.example/banner.jpg'));
    expect(onUpload.mock.calls[0][0].type).toBe('image/jpeg');
  });
});

describe('Tratamento de erro: seleção e envio de imagem', () => {
  it('mostra a mensagem do erro de upload e não altera o valor', async () => {
    grantAndPick();
    const onUpload = jest.fn().mockRejectedValue(new Error('Arquivo muito grande. O limite é 8 MB.'));
    const onChange = jest.fn();
    await render(<ImagePickerField label="Banner" value="" onChange={onChange} onUpload={onUpload} />);

    await fireEvent.press(screen.getByLabelText('Banner: selecionar imagem'));

    expect(await screen.findByText('Arquivo muito grande. O limite é 8 MB.')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sem permissão avisa e não abre a galeria', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false } as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<ImagePickerField label="Banner" value="" onChange={jest.fn()} onUpload={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Banner: selecionar imagem'));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Permissão necessária', expect.any(String)));
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('cancelar a galeria não envia nada', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] } as never);
    const onUpload = jest.fn();
    await render(<ImagePickerField label="Banner" value="" onChange={jest.fn()} onUpload={onUpload} />);

    await fireEvent.press(screen.getByLabelText('Banner: selecionar imagem'));

    await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalled());
    expect(onUpload).not.toHaveBeenCalled();
  });
});
