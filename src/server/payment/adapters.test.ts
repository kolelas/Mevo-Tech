import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { PaystackProvider } from './paystack';
import { PayFastProvider } from './payfast';
import { OzowProvider } from './ozow';
import { CryptoPaymentProvider } from './crypto';
import { PayflexProvider } from './payflex';

test('Paystack legacy webhook accepts only matching raw-body HMAC signature', async () => {
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

test('Paystack rejects missing and malformed legacy signatures and placeholder configuration', async () => {
  const unconfigured = new PaystackProvider({ secretKey: '' });
  assert.equal(unconfigured.isConfigured(), false);
  const payload = JSON.stringify({ data: { reference: 'MEV-TEST' } });
  assert.equal((await unconfigured.verifyWebhook({}, payload)).isValid, false);
  const provider = new PaystackProvider({ secretKey: 'real-test-secret' });
  assert.equal((await provider.verifyWebhook({ 'x-paystack-signature': 'bad' }, payload)).isValid, false);
});

test('Paystack signing-secret header validates timestamped HMAC and supports rotation signatures', async () => {
  const webhookSecret = 'whsec_test-signing-secret';
  const provider = new PaystackProvider({ webhookSecret });
  const payload = '{"event":"charge.success","data":{"reference":"MEV-NEW","status":"success","amount":12345,"currency":"ZAR"}}';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha512', webhookSecret).update(`${timestamp}.${payload}`).digest('hex');
  const rotationSignature = '0'.repeat(128);
  const header = `t=${timestamp},v1=whk_old-key:${rotationSignature},v1=whk_test-key:${signature}`;
  const result = await provider.verifyWebhook({ 'paystack-signature': header }, payload);
  assert.equal(result.isValid, true);
  assert.equal(result.signatureVerified, true);
  assert.equal(result.orderReference, 'MEV-NEW');
  assert.equal(result.amountCents, 12345);
  assert.equal(result.currency, 'ZAR');
});

test('Paystack signing-secret header rejects stale timestamps and invalid current header cannot downgrade', async () => {
  const webhookSecret = 'whsec_test-signing-secret';
  const legacySecret = 'legacy-secret';
  const provider = new PaystackProvider({ webhookSecret, secretKey: legacySecret });
  const payload = '{"data":{"reference":"MEV-OLD","status":"success","amount":1000}}';
  const now = Math.floor(Date.now() / 1000);
  const staleTimestamp = now - 301;
  const staleSignature = crypto.createHmac('sha512', webhookSecret).update(`${staleTimestamp}.${payload}`).digest('hex');
  assert.equal(provider.verifySigningSecretSignature(payload, `t=${staleTimestamp},v1=whk_old:${staleSignature}`, now), false);

  const legacySignature = crypto.createHmac('sha512', legacySecret).update(payload).digest('hex');
  const downgrade = await provider.verifyWebhook({
    'paystack-signature': 't=bad,v1=whk_invalid:bad',
    'x-paystack-signature': legacySignature,
  }, payload);
  assert.equal(downgrade.isValid, false);
});

test('Paystack signing-secret header rejects malformed and duplicate timestamp fields', async () => {
  const provider = new PaystackProvider({ webhookSecret: 'whsec_test-signing-secret' });
  const now = Math.floor(Date.now() / 1000);
  assert.equal(provider.verifySigningSecretSignature('{}', 't=1,t=2,v1=whk_key:' + 'a'.repeat(128), now), false);
  assert.equal(provider.verifySigningSecretSignature('{}', 't=not-a-time,v1=whk_key:' + 'a'.repeat(128), now), false);
});

test('Paystack non-charge events cannot mark an order as paid', async () => {
  const secret = 'legacy-secret';
  const provider = new PaystackProvider({ secretKey: secret });
  const payload = JSON.stringify({ event: 'transfer.success', data: { reference: 'MEV-TRANSFER', status: 'success', amount: 50000, id: 987 } });
  const signature = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  const result = await provider.verifyWebhook({ 'x-paystack-signature': signature }, payload);
  assert.equal(result.isValid, true);
  assert.equal(result.status, 'PENDING');
});

test('Ozow, crypto, and Payflex webhook verification remain fail-closed', async () => {
  const payload = JSON.stringify({ status: 'SUCCESSFUL', amount: '100.00', reference: 'MEV-TEST' });
  const ozow = await new OzowProvider().verifyWebhook({}, payload);
  assert.equal(ozow.isValid, false);
  assert.equal(ozow.signatureVerified, false);
  const cryptoResult = await new CryptoPaymentProvider().verifyWebhook({}, payload);
  assert.equal(cryptoResult.isValid, false);
  assert.equal(cryptoResult.signatureVerified, false);

  const payflex = await new PayflexProvider().verifyWebhook({}, payload);
  assert.equal(payflex.isValid, false);
  assert.equal(payflex.signatureVerified, false);
});

test('PayFast rejects built-in/sample configuration and validates signatures in constant time', async () => {
  const unconfigured = new PayFastProvider();
  assert.equal(unconfigured.isConfigured(), false);
  const payload = {
    m_payment_id: 'MEV-PF-001',
    pf_payment_id: '123456',
    payment_status: 'COMPLETE',
    amount_gross: '100.00',
  };
  assert.equal((await unconfigured.verifyWebhook({}, payload)).isValid, false);

  const provider = new PayFastProvider({
    merchantId: 'merchant-live-id',
    merchantKey: 'merchant-live-key',
    passphrase: 'private-passphrase',
  });
  assert.equal(provider.isConfigured(), true);
  const signed = { ...payload };
  signed.signature = provider.generateSignature(payload, 'private-passphrase');
  const verified = await provider.verifyWebhook({}, signed);
  assert.equal(verified.isValid, true);
  assert.equal(verified.signatureVerified, true);
  assert.equal(verified.orderReference, 'MEV-PF-001');
  assert.equal(verified.amountCents, 10000);

  const forged = { ...signed, signature: '0'.repeat(32) };
  assert.equal((await provider.verifyWebhook({}, forged)).isValid, false);
});
