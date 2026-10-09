import { round2 } from '@papelera/shared';

/** Acepta "1234,50", "1.234,50" y "1234.50". */
export function parseMoney(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return round2(value);
}

export function moneyToInput(value: number): string {
  return round2(value).toFixed(2).replace('.', ',');
}
