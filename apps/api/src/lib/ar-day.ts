/**
 * Argentina no tiene horario de verano: el día civil es UTC-3 todo el año
 * (America/Argentina/Buenos_Aires). Medianoche allá es las 03:00 UTC.
 */
export function arDayRange(day: string): { gte: Date; lt: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Fecha inválida');
  const gte = new Date(`${day}T03:00:00.000Z`);
  if (Number.isNaN(gte.getTime())) throw new Error('Fecha inválida');
  const [year, month, date] = day.split('-').map(Number);
  const probe = new Date(Date.UTC(year!, month! - 1, date!, 15));
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(probe);
  if (formatted !== day) throw new Error('Fecha inválida');
  return { gte, lt: new Date(gte.getTime() + 86_400_000) };
}
