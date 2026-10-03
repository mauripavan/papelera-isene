import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNo, isYes, parseItems } from './parse.ts';

test('formatos de código y cantidad', () => {
  const { items, invalid } = parseItems('BOL-001 2\nbol002 x3\n4 DES-010\nrep-5: 10\nCIN 12 - 7\nHIG-001');
  assert.deepEqual(items, [
    { code: 'BOL-001', quantity: 2 },
    { code: 'BOL-002', quantity: 3 },
    { code: 'DES-010', quantity: 4 },
    { code: 'REP-005', quantity: 10 },
    { code: 'CIN-012', quantity: 7 },
    { code: 'HIG-001', quantity: 1 },
  ]);
  assert.deepEqual(invalid, []);
});

test('separados por coma y líneas que no se entienden', () => {
  const { items, invalid } = parseItems('BOL-001 2, DES-002 1; hola que tal');
  assert.deepEqual(items, [
    { code: 'BOL-001', quantity: 2 },
    { code: 'DES-002', quantity: 1 },
  ]);
  assert.deepEqual(invalid, ['hola que tal']);
});

test('sí y no', () => {
  assert.ok(isYes('Sí!'));
  assert.ok(isYes('dale'));
  assert.ok(isNo('No.'));
  assert.ok(!isYes('nose'));
});
