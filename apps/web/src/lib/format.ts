import { formatARS } from '@papelera/shared';

export const ars = formatARS;

export function dateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function longDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** ISO → valor para <input type="datetime-local"> en hora local */
export function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 5491122334455 → link a WhatsApp */
export function waLink(phone: string) {
  return `https://wa.me/${phone}`;
}

const AR_TZ = 'America/Argentina/Buenos_Aires';

/** ISO → YYYY-MM-DD en Argentina. */
export function arDay(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function todayAr(): string {
  return arDay(new Date().toISOString());
}

function shiftArDay(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const probe = new Date(Date.UTC(year!, month! - 1, date! + delta, 15));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(probe);
}

/** "Hoy", "Ayer" o "vie 9 oct". */
export function arDayLabel(day: string, today = todayAr()): string {
  if (day === today) return 'Hoy';
  if (day === shiftArDay(today, -1)) return 'Ayer';
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: AR_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(Date.UTC(year!, month! - 1, date!, 15)));
}
