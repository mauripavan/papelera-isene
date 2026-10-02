import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPercent, orderTotal, productPrices, unitPriceFor } from './pricing.ts';

test('producto que discrimina IVA: transferencia = efectivo + 21%', () => {
  assert.deepEqual(productPrices({ price: 1000, discriminaIva: true }), { cash: 1000, transfer: 1210 });
});

test('producto que no discrimina IVA: mismo precio en ambos medios', () => {
  assert.deepEqual(productPrices({ price: 1000, discriminaIva: false }), { cash: 1000, transfer: 1000 });
});

test('precio de transferencia fijo pisa el cálculo', () => {
  assert.deepEqual(productPrices({ price: 13900, discriminaIva: true, priceTransfer: 15150 }), { cash: 13900, transfer: 15150 });
  assert.deepEqual(productPrices({ price: 100, discriminaIva: false, priceTransfer: null }), { cash: 100, transfer: 100 });
});

test('tasa de IVA configurable', () => {
  assert.equal(unitPriceFor({ price: 100, discriminaIva: true }, 'TRANSFERENCIA', 0.105), 110.5);
});

test('redondeo a centavos', () => {
  assert.equal(unitPriceFor({ price: 333.33, discriminaIva: true }, 'TRANSFERENCIA'), 403.33);
});

test('el total no cobra los faltantes', () => {
  const total = orderTotal([
    { unitPrice: 100, quantity: 2, status: 'DISPONIBLE' },
    { unitPrice: 50, quantity: 1, status: 'FALTANTE' },
    { unitPrice: 10.5, quantity: 3 },
  ]);
  assert.equal(total, 231.5);
});

test('aumento porcentual', () => {
  assert.equal(applyPercent(1000, 12.5), 1125);
  assert.equal(applyPercent(1000, -10), 900);
});
