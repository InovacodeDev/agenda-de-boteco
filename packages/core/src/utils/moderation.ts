/**
 * Triagem de termos impróprios: funções puras, sem I/O. Quem lê a lista de
 * termos e enfileira o resultado é services/moderation.ts — aqui só entra
 * texto e sai o que casou, para que a regra de match seja testável sozinha.
 */

/**
 * Minúsculas e sem diacríticos. Normalizar os dois lados (texto e termo) é o
 * que faz "PALAVRÃO", "palavrao" e "palavrão" caírem no mesmo match: quem
 * escreve algo impróprio troca o acento por descuido ou de propósito.
 *
 * NFD separa a letra do acento e o range de combining marks remove o acento,
 * tudo com stdlib — sem dependência de normalização.
 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Tamanho do trecho de contexto guardado na fila. 80 caracteres cabem numa
 * linha da tela do admin e são suficientes para julgar a intenção da frase, sem
 * copiar a descrição inteira do bar para dentro da tabela de moderação.
 */
const EXCERPT_RADIUS = 40;

/**
 * Regex de palavra inteira para um termo. Não usa `\b` porque a fronteira do
 * JS é definida por [A-Za-z0-9_], então um termo com hífen ou espaço ("mão de
 * vaca") teria fronteira no meio dele. Em vez disso exige que a vizinhança não
 * seja letra nem dígito — pontuação, espaço e começo/fim de texto valem como
 * separador.
 *
 * É o requisito central: substring casaria "ass" dentro de "massa" e "cu"
 * dentro de "curso", bloqueando o cadastro do dono por nada. Falso negativo
 * aqui é aceitável — a fila é revisada por humano; falso positivo não é.
 */
function buildTermPattern(normalizedTerm: string): RegExp {
  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`);
}

/**
 * Devolve os termos de `terms` presentes em `text`, na ordem em que foram
 * passados, sem repetição. Case-insensitive, insensível a acento e casando
 * palavra inteira. Lista ou texto vazios devolvem [] — a triagem nunca é o
 * motivo de um save falhar.
 */
export function findFlaggedTerms(text: string, terms: string[]): string[] {
  if (!text || terms.length === 0) {
    return [];
  }
  const haystack = normalize(text);
  const found: string[] = [];
  for (const term of terms) {
    const needle = normalize(term.trim());
    if (!needle || found.includes(term)) {
      continue;
    }
    if (buildTermPattern(needle).test(haystack)) {
      found.push(term);
    }
  }
  return found;
}

/**
 * Trecho do texto ao redor da primeira ocorrência do termo, com "…" nas pontas
 * que foram cortadas. Serve para o admin ver o contexto sem a fila carregar o
 * texto inteiro.
 *
 * O índice é buscado na versão normalizada, mas o corte é feito no texto
 * original: NFD decompõe cada letra acentuada em base + marca e a marca é
 * removida em seguida, então cada caractere de entrada continua valendo um
 * caractere de saída e os índices ficam alinhados. Quando o termo não aparece,
 * devolve o começo do texto — é o que o admin veria de qualquer forma.
 */
export function buildModerationExcerpt(text: string, term: string): string {
  const index = normalize(text).indexOf(normalize(term.trim()));
  const anchor = index < 0 ? 0 : index;
  const start = Math.max(0, anchor - EXCERPT_RADIUS);
  const end = Math.min(text.length, anchor + term.trim().length + EXCERPT_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}
