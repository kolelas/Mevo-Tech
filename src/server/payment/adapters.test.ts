import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { PaystackProvider } from './payment/paystack';
import { OzowProvider } from './payment/ozow';
import { CryptoPaymentProvider } from './payment/crypto';

test('Paystack webhook accepts only matching HMAC signature', async () => {
  const secret = 'test-secret';
  const provider = new PaystackProvider({ secretKey: secret });
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'MEV-TEST', status: 'success', amount: 1000 } });
  const signature = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  const result = await provider.verifyWebhook({ 'x-paystack-signature': signature }, payload);
  assert.equal(result.isValid, true);
  assert.equal(result.signatureVerified, true);
  const forged = await provider.verifyWebhook({ 'x-paystack-signature': 'f'.repeat(128) }, payload);
  assert.equal(forged.isValid, false);
});

test('Paystack rejects missing and malformed signatures and placeholder configuration', async () => {
  const unconfigured = new PaystackProvider({ secretKey: '' });
  assert.equal(unconfigured.isConfigured(), false);
  const payload = JSON.stringify({ data: { reference: 'MEV-TEST' } });
  assert.equal((await unconfigured.verifyWebhook({}, payload)).isValid, false);
  const provider = new PaystackProvider({ secretKey: 'real-test-secret' });
  assert.equal((await provider.verifyWebhook({ 'x-paystack-signature': 'bad' }, payload)).isValid, false);
});

test('Ozow and crypto webhook verification remain fail-closed', async () => {
  const payload = JSON.stringify({ status: 'SUCCESSFUL', amount: '100.00', reference: 'MEV-TEST' });
  const ozow = await new OzowProvider().verifyWebhook({}, payload);
  assert.equal(ozow.isValid, false);
  assert.equal(ozow.signatureVerified, false);
  const cryptoResult = await new CryptoPaymentProvider().verifyWebhook({}, payload);
  assert.equal(cryptoResult.isValid, false);
  assert.equal(cryptoResult.signatureVerified, false);
});
