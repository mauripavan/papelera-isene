const norm = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** "bol001", "BOL 001" y "BOL-001" comparan igual. */
const compact = (value: string) => norm(value).replace(/[\s\-_./]/g, '');

export function matchProduct(product: { code: string; name: string; unit: string }, words: string[]) {
  const name = norm(`${product.name} ${product.unit}`);
  const code = compact(product.code);
  return words.every((word) => name.includes(word) || code.includes(compact(word)));
}

export function productQuery(raw: string): string[] {
  return norm(raw.trim()).split(/\s+/).filter(Boolean);
}

/** Exacto y prefijo de código primero; después activos y al final inactivos. */
export function productRank(product: { code: string; active: boolean }, query: string): number {
  const code = compact(product.code);
  const q = compact(query);
  if (q && code === q) return 0;
  if (q && code.startsWith(q)) return 1;
  return product.active ? 2 : 3;
}
