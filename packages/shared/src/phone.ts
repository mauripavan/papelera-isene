/**
 * Celulares de Argentina en el formato que usa WhatsApp: 549 + código de área + número (13 dígitos).
 * Acepta lo que la gente escribe: "11 2398-3428", "011 15 2398 3428", "+54 9 11 2398 3428", "351 15 555 1234"…
 * Devuelve null si no se puede interpretar.
 */
export function normalizeArPhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2);
  if (d.length === 11 && d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {
    // Sacamos el "15" que va después del código de área (de 2, 3 o 4 dígitos)
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') {
        d = d.slice(0, area) + d.slice(area + 2);
        break;
      }
    }
  }
  if (!/^[1-9]\d{9}$/.test(d)) return null;
  // El único código de área que empieza con 1 es el 11
  if (d.startsWith('1') && !d.startsWith('11')) return null;
  return `549${d}`;
}

/** 5491123983428 → "+54 9 11 2398-3428" (solo para mostrar). */
export function formatArPhone(phone: string): string {
  if (!/^549\d{10}$/.test(phone)) return `+${phone}`;
  const local = phone.slice(3);
  const areaLen = local.startsWith('11') ? 2 : 3;
  const area = local.slice(0, areaLen);
  const rest = local.slice(areaLen);
  return `+54 9 ${area} ${rest.slice(0, -4)}-${rest.slice(-4)}`;
}
