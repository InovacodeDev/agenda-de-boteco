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
    expect(maskCurrencyBR('1')).toBe('0,01');
    expect(maskCurrencyBR('12')).toBe('0,12');
    expect(maskCurrencyBR('123')).toBe('1,23');
    expect(maskCurrencyBR('1234')).toBe('12,34');
    expect(maskCurrencyBR('12343')).toBe('123,43');
    expect(maskCurrencyBR('123432')).toBe('1.234,32');
  });

  it('agrupa milhares com ponto', () => {
    expect(maskCurrencyBR('150000')).toBe('1.500,00');
    expect(maskCurrencyBR('123456789')).toBe('1.234.567,89');
  });

  it('remove zeros à esquerda', () => {
    expect(maskCurrencyBR('00012')).toBe('0,12');
  });

  it('vazio ou só zeros → vazio', () => {
    expect(maskCurrencyBR('')).toBe('');
    expect(maskCurrencyBR('000')).toBe('');
  });

  it('digitação tecla-a-tecla acumula da direita para a esquerda (123432)', () => {
    let v = '';
    const type = (key: string) => (v = maskCurrencyBR(v + key));
    type('1');
    expect(v).toBe('0,01');
    type('2');
    expect(v).toBe('0,12');
    type('3');
    expect(v).toBe('1,23');
    type('4');
    expect(v).toBe('12,34');
    type('3');
    expect(v).toBe('123,43');
    type('2');
    expect(v).toBe('1.234,32');
    expect(parseCurrencyBR(v)).toBe(1234.32);
  });

  it('apagar (backspace) remove da direita para a esquerda', () => {
    let v = maskCurrencyBR('123432');
    expect(v).toBe('1.234,32');
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('123,43');
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('12,34');
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('1,23');
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('0,12');
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('0,01');
    v = maskCurrencyBR(v.slice(0, -1));
    expect(v).toBe('');
  });

  it('suporta prefixo quando options.prefix é true ou string', () => {
    expect(maskCurrencyBR('123432', { prefix: true })).toBe('R$ 1.234,32');
    expect(maskCurrencyBR('1', { prefix: true })).toBe('R$ 0,01');
    expect(maskCurrencyBR('123432', { prefix: 'US$ ' })).toBe('US$ 1.234,32');
  });
});

describe('parseCurrencyBR', () => {
  it('converte texto mascarado para número em reais', () => {
    expect(parseCurrencyBR('1.500,00')).toBe(1500);
    expect(parseCurrencyBR('R$ 1.500,00')).toBe(1500);
    expect(parseCurrencyBR('1.234,32')).toBe(1234.32);
    expect(parseCurrencyBR('R$ 1.234,32')).toBe(1234.32);
    expect(parseCurrencyBR('1,23')).toBe(1.23);
    expect(parseCurrencyBR('0,01')).toBe(0.01);
  });

  it('vazio → 0', () => {
    expect(parseCurrencyBR('')).toBe(0);
  });

  it('é inverso de maskCurrencyBR', () => {
    for (const raw of ['1', '123', '12345', '150000']) {
      expect(parseCurrencyBR(maskCurrencyBR(raw))).toBe(Number(raw) / 100);
      expect(parseCurrencyBR(maskCurrencyBR(raw, { prefix: true }))).toBe(Number(raw) / 100);
    }
  });
});

describe('currencyToMask', () => {
  it('formata número para o texto do input', () => {
    expect(currencyToMask(1500)).toBe('1.500,00');
    expect(currencyToMask(1234.32)).toBe('1.234,32');
    expect(currencyToMask(1.23)).toBe('1,23');
    expect(currencyToMask(22.5)).toBe('22,50');
  });

  it('0 → vazio (deixa placeholder)', () => {
    expect(currencyToMask(0)).toBe('');
  });

  it('suporta options.prefix', () => {
    expect(currencyToMask(1500, { prefix: true })).toBe('R$ 1.500,00');
    expect(currencyToMask(1.23, { prefix: true })).toBe('R$ 1,23');
  });

  it('round-trip com parseCurrencyBR', () => {
    for (const n of [1500, 1234.32, 1.23, 22.5, 0.01]) {
      expect(parseCurrencyBR(currencyToMask(n))).toBe(n);
      expect(parseCurrencyBR(currencyToMask(n, { prefix: true }))).toBe(n);
    }
  });
});
