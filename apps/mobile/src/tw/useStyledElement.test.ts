import { withoutUndefinedTargets } from './useStyledElement';

describe('withoutUndefinedTargets', () => {
  it('remove style e contentContainerStyle quando undefined', () => {
    const result = withoutUndefinedTargets({
      className: 'flex-1',
      style: undefined,
      contentContainerStyle: undefined,
    });
    expect(result).toEqual({ className: 'flex-1' });
    expect('style' in result).toBe(false);
    expect('contentContainerStyle' in result).toBe(false);
  });

  it('mantém style definido', () => {
    const style = { flex: 1 };
    expect(withoutUndefinedTargets({ className: 'a', style })).toEqual({ className: 'a', style });
  });

  it('devolve o mesmo objeto quando ambos estão definidos', () => {
    const props = { style: { flex: 1 }, contentContainerStyle: { padding: 1 } };
    expect(withoutUndefinedTargets(props)).toBe(props);
  });
});
