import { onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';

import { useConnectivity } from './useConnectivity';

describe('useConnectivity', () => {
  afterEach(async () => {
    await act(async () => onlineManager.setOnline(true));
  });

  it('reflete o estado inicial do onlineManager', async () => {
    await act(async () => onlineManager.setOnline(true));
    const { result } = await renderHook(() => useConnectivity());
    expect(result.current.isOnline).toBe(true);
  });

  it('atualiza quando o onlineManager muda para offline e volta', async () => {
    const { result } = await renderHook(() => useConnectivity());
    await act(async () => onlineManager.setOnline(false));
    expect(result.current.isOnline).toBe(false);
    await act(async () => onlineManager.setOnline(true));
    expect(result.current.isOnline).toBe(true);
  });
});
