/**
 * Máscaras de input platform-agnostic (web/admin/mobile). São funções puras
 * `string -> string` que recebem o valor digitado e devolvem o texto já
 * formatado; o app liga elas no onChange/onChangeText.
 *
 * Convenção: cada máscara ignora tudo que não for dígito e reaplica a
 * pontuação, então funciona igual digitando, colando ou apagando.
 */

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Telefone BR: `(XX) XXXXX-XXXX` (celular, 11 dígitos) ou `(XX) XXXX-XXXX`
 * (fixo, 10 dígitos). Formata progressivamente enquanto o usuário digita.
 */
export function maskPhoneBR(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** CPF: `XXX.XXX.XXX-XX`. */
export function maskCPF(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CNPJ: `XX.XXX.XXX/XXXX-XX`. */
export function maskCNPJ(value: string): string {
  const d = digits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Moeda BR com entrada da direita para a esquerda: o último dígito é o
 * centavo. Digitar "1" → "R$ 0,01"; "123" → "R$ 1,23"; "150000" → "R$ 1.500,00".
 * Vazio → "" (deixa o placeholder aparecer).
 */
export function maskCurrencyBR(value: string): string {
  const d = digits(value).replace(/^0+/, ''); // remove zeros à esquerda
  if (!d) return '';
  const cents = d.padStart(3, '0');
  const int = cents.slice(0, -2);
  const dec = cents.slice(-2);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${grouped},${dec}`;
}

/**
 * Valor numérico (em reais) a partir de um texto mascarado por maskCurrencyBR
 * (ou de qualquer string com dígitos). Trata os 2 últimos dígitos como
 * centavos. "R$ 1.500,00" → 1500; "" → 0.
 */
export function parseCurrencyBR(masked: string): number {
  const d = digits(masked);
  if (!d) return 0;
  return Number(d) / 100;
}

/**
 * Formata um número (reais) para o texto mascarado, para popular o campo ao
 * editar um registro existente. 1500 → "R$ 1.500,00"; 0 → "".
 */
export function currencyToMask(value: number): string {
  if (!value) return '';
  return maskCurrencyBR(String(Math.round(value * 100)));
}
