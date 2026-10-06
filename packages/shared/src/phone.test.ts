import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatArPhone, normalizeArPhone } from './phone.ts';

test('normaliza celulares argentinos al formato de WhatsApp', () => {
  for (const input of ['11 2398-3428', '1123983428', '011 15 2398 3428', '15 2398 3428'.replace('15 ', '11 15 '), '+54 9 11 2398 3428', '5491123983428', '54 11 2398 3428'])
    assert.equal(normalizeArPhone(input), '5491123983428', input);
  assert.equal(normalizeArPhone('351 15 555 1234'), '5493515551234');
  assert.equal(normalizeArPhone('0351 155551234'), '5493515551234');
});

test('rechaza números que no se pueden interpretar', () => {
  for (const input of ['', '1234', '2398-3428', '12 3456 7890', 'hola']) assert.equal(normalizeArPhone(input), null, input);
});

test('formatea para mostrar', () => {
  assert.equal(formatArPhone('5491123983428'), '+54 9 11 2398-3428');
  assert.equal(formatArPhone('5493515551234'), '+54 9 351 555-1234');
});
