import assert from 'node:assert/strict';
import test from 'node:test';
import { arDayRange } from './ar-day.ts';

test('un día de Argentina va de las 03:00 UTC a las 03:00 del día siguiente', () => {
  const { gte, lt } = arDayRange('2026-10-09');
  assert.equal(gte.toISOString(), '2026-10-09T03:00:00.000Z');
  assert.equal(lt.toISOString(), '2026-10-10T03:00:00.000Z');
});

test('rechaza una fecha que no existe', () => {
  assert.throws(() => arDayRange('2026-02-31'), /Fecha inválida/);
  assert.throws(() => arDayRange('hoy'), /Fecha inválida/);
});
