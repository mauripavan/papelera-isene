import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET ??= 'test-secret-1234567890';
process.env.DATABASE_URL ??= 'postgresql://x:y@localhost:5432/z';
process.env.BOT_API_KEY ??= 'test-bot-key-123';
const { signPhoneToken, verifyPhoneToken } = await import('./phone-token.ts');

test('el link firmado devuelve el teléfono', () => {
  assert.equal(verifyPhoneToken(signPhoneToken('5491123983428')), '5491123983428');
});

test('rechaza links adulterados o vencidos', () => {
  const t = signPhoneToken('5491123983428');
  assert.equal(verifyPhoneToken(t.replace('5491123983428', '5491100000000')), null);
  assert.equal(verifyPhoneToken(signPhoneToken('5491123983428', Date.now() - 25 * 3600_000)), null);
  assert.equal(verifyPhoneToken('basura'), null);
  assert.equal(verifyPhoneToken(undefined), null);
});
