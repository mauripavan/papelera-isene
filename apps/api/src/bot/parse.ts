/** Utilidades para entender lo que escribe el cliente. */

/** Mayúsculas, sin acentos ni espacios de más. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const YES = new Set(['SI', 'S', 'SII', 'SIP', 'DALE', 'OK', 'CONFIRMO', 'CONFIRMAR', 'ACEPTO', 'YES']);
const NO = new Set(['NO', 'N', 'NOP', 'CANCELAR', 'CANCELO', 'RECHAZO']);

export function isYes(text: string) {
  return YES.has(normalize(text).replace(/[!.,]/g, ''));
}

export function isNo(text: string) {
  return NO.has(normalize(text).replace(/[!.,]/g, ''));
}

export interface ParsedItems {
  items: { code: string; quantity: number }[];
  /** Líneas que no se pudieron entender */
  invalid: string[];
}

/**
 * Entiende líneas como:
 *   BOL-001 2      bol001 x2      2 BOL-001      BOL-001: 3      BOL 001 - 10
 * Una línea por producto (también acepta varios separados por coma o punto y coma).
 * Si no hay cantidad, se toma 1.
 */
export function parseItems(text: string): ParsedItems {
  const items: ParsedItems['items'] = [];
  const invalid: string[] = [];
  const lines = text
    .split(/[\n;,]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const raw of lines) {
    const line = normalize(raw);
    // CÓDIGO = 3 letras + número (con o sin guion/espacio), ej: BOL-001, BOL 1, BOL001
    const code = line.match(/\b([A-Z]{3})\s*-?\s*(\d{1,4})\b/);
    if (!code) {
      invalid.push(raw);
      continue;
    }
    const normalizedCode = `${code[1]}-${code[2]!.padStart(3, '0')}`;
    const rest = (line.slice(0, code.index) + ' ' + line.slice(code.index! + code[0].length)).trim();
    const qty = rest.match(/(?:^|\s|X|:|-)\s*(\d{1,5})\b/);
    const quantity = qty ? Number(qty[1]) : 1;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      invalid.push(raw);
      continue;
    }
    items.push({ code: normalizedCode, quantity });
  }
  return { items, invalid };
}
