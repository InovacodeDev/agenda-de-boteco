import { isUuid } from './ids';

describe('isUuid', () => {
  it('aceita UUID v4 minúsculo', () => {
    expect(isUuid('3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBe(true);
  });

  it('aceita UUID maiúsculo', () => {
    expect(isUuid('3FA85F64-5717-4562-B3FC-2C963F66AFA6')).toBe(true);
  });

  it('rejeita id legado (slug)', () => {
    expect(isUuid('ev1')).toBe(false);
    expect(isUuid('bar-do-tito-abc123')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isUuid('')).toBe(false);
  });
});
