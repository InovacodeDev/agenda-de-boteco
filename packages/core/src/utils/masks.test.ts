import {
  currencyToMask,
  maskCurrencyBR,
  maskPhoneBR,
  parseCurrencyBR,
} from './masks';

describe('maskPhoneBR', () => {
  it('formata celular (11 dígitos) como (XX) XXXXX-XXXX', () => {
    expect(maskPhoneBR('11987654321')).toBe('(11) 98765-4321');
  });

  it('formata fixo (10 dígitos) como (XX) XXXX-XXXX', () => {
    expect(maskPhoneBR('1133334444')).toBe('(11) 3333-4444');
  });

  it('formata progressivamente enquanto digita', () => {
    expect(maskPhoneBR('1')).toBe('(1');
    expect(maskPhoneBR('11')).toBe('(11');
    expect(maskPhoneBR('119')).toBe('(11) 9');
    expect(maskPhoneBR('11987')).toBe('(11) 987');
    expect(maskPhoneBR('119876')).toBe('(11) 9876');
    expect(maskPhoneBR('1198765')).toBe('(11) 9876-5');
  });

  it('ignora não-dígitos e trunca em 11', () => {
    expect(maskPhoneBR('(11) 98765-4321extra99')).toBe('(11) 98765-4321');
  });

  it('vazio → vazio', () => {
    expect(maskPhoneBR('')).toBe('');
  });
});

describe('maskCurrencyBR', () => {
  it('entra da direita para a esquerda (centavos primeiro)', () => {
    expect(maskCurrencyBR('1')).toBe('R$ 0,01');
    expect(maskCurrencyBR('12')).toBe('R$ 0,12');
    expect(maskCurrencyBR('123')).toBe('R$ 1,23');
    expect(maskCurrencyBR('12345')).toBe('R$ 123,45');
  });

  it('agrupa milhares com ponto', () => {
    expect(maskCurrencyBR('150000')).toBe('R$ 1.500,00');
    expect(maskCurrencyBR('123456789')).toBe('R$ 1.234.567,89');
  });

  it('remove zeros à esquerda', () => {
    expect(maskCurrencyBR('00012')).toBe('R$ 0,12');
  });

  it('vazio ou só zeros → vazio', () => {
    expect(maskCurrencyBR('')).toBe('');
    expect(maskCurrencyBR('000')).toBe('');
  });

  it('digitação tecla-a-tecla acumula da direita para a esquerda', () => {
    // Simula o onChange do input: cada tecla concatena ao valor mascarado
    // anterior e remascara (mesmo fluxo que a UI faz).
    let v = '';
    const type = (key: string) => (v = maskCurrencyBR(v + key));
    type('1');
    expect(v).toBe('R$ 0,01');
    type('5');
    expect(v).toBe('R$ 0,15');
    type('0');
    expect(v).toBe('R$ 1,50');
    type('0');
    expect(v).toBe('R$ 15,00');
    type('0');
    expect(v).toBe('R$ 150,00');
    type('0');
    expect(v).toBe('R$ 1.500,00');
    expect(parseCurrencyBR(v)).toBe(1500);
  });

  it('apagar (backspace) remove da direita para a esquerda', () => {
    // Backspace = remascara o texto sem o último caractere.
    let v = maskCurrencyBR('150000'); // 'R$ 1.500,00'
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('R$ 150,00');
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('R$ 15,00');
  });
});

describe('parseCurrencyBR', () => {
  it('converte texto mascarado para número em reais', () => {
    expect(parseCurrencyBR('R$ 1.500,00')).toBe(1500);
    expect(parseCurrencyBR('R$ 1,23')).toBe(1.23);
    expect(parseCurrencyBR('R$ 0,01')).toBe(0.01);
  });

  it('vazio → 0', () => {
    expect(parseCurrencyBR('')).toBe(0);
  });

  it('é inverso de maskCurrencyBR', () => {
    for (const raw of ['1', '123', '12345', '150000']) {
      expect(parseCurrencyBR(maskCurrencyBR(raw))).toBe(Number(raw) / 100);
    }
  });
});

describe('currencyToMask', () => {
  it('formata número para o texto do input', () => {
    expect(currencyToMask(1500)).toBe('R$ 1.500,00');
    expect(currencyToMask(1.23)).toBe('R$ 1,23');
    expect(currencyToMask(22.5)).toBe('R$ 22,50');
  });

  it('0 → vazio (deixa placeholder)', () => {
    expect(currencyToMask(0)).toBe('');
  });

  it('round-trip com parseCurrencyBR', () => {
    for (const n of [1500, 1.23, 22.5, 0.01]) {
      expect(parseCurrencyBR(currencyToMask(n))).toBe(n);
    }
  });
});
