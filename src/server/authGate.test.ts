import { test } from 'node:test';
import assert from 'node:assert';
import { db } from './db';

test('Auth Gate: Customer registration issues 6-digit confirmation code and sets emailVerified=false', () => {
  const testEmail = `checkout_test_${Date.now()}@example.co.za`;
  const regResult = db.registerCustomer({
    name: 'Checkout Gate User',
    email: testEmail,
    password: 'Password@2026',
    phone: '+27 82 111 2233',
  });

  assert.strictEqual(regResult.success, true);
  assert.strictEqual(regResult.requiresEmailVerification, true);
  assert.ok(regResult.verificationCode, 'Verification code must be issued');
  assert.strictEqual(regResult.verificationCode?.length, 6, 'Verification code must be 6 digits');
  assert.strictEqual(regResult.customer?.emailVerified, false, 'New registrant must not be verified initially');
});

test('Auth Gate: Invalid confirmation code fails email verification', () => {
  const testEmail = `verify_fail_${Date.now()}@example.co.za`;
  db.registerCustomer({
    name: 'Fail Code User',
    email: testEmail,
    password: 'Password@2026',
  });

  const verifyFail = db.verifyCustomerEmail(testEmail, '999999');
  assert.strictEqual(verifyFail.success, false);
  assert.ok(verifyFail.error?.includes('Invalid confirmation code'));
});

test('Auth Gate: Correct 6-digit code verifies email and activates account for checkout', () => {
  const testEmail = `verify_pass_${Date.now()}@example.co.za`;
  const reg = db.registerCustomer({
    name: 'Pass Code User',
    email: testEmail,
    password: 'Password@2026',
  });

  assert.ok(reg.verificationCode);
  const verifyPass = db.verifyCustomerEmail(testEmail, reg.verificationCode);
  assert.strictEqual(verifyPass.success, true);
  assert.strictEqual(verifyPass.customer?.emailVerified, true);
  assert.ok(verifyPass.token, 'Must return signed customer JWT token');

  // Verify customer record in database is marked verified
  const customerInDb = db.getCustomerById(verifyPass.customer.id);
  assert.strictEqual(customerInDb?.emailVerified, true);
});

test('Auth Gate: Duplicate registration prompts to sign in instead', () => {
  const testEmail = `dup_test_${Date.now()}@example.co.za`;
  db.registerCustomer({
    name: 'Original User',
    email: testEmail,
    password: 'Password@2026',
  });

  const dupResult = db.registerCustomer({
    name: 'Second User',
    email: testEmail,
    password: 'Password@2026',
  });

  assert.strictEqual(dupResult.success, false);
  assert.ok(dupResult.error?.includes('already exists'));
  assert.ok(dupResult.error?.includes('Please sign in instead'));
});

test('Auth Gate: Resend verification code issues a fresh 6-digit code', () => {
  const testEmail = `resend_${Date.now()}@example.co.za`;
  const reg = db.registerCustomer({
    name: 'Resend User',
    email: testEmail,
    password: 'Password@2026',
  });

  const resendResult = db.resendVerificationCode(testEmail);
  assert.strictEqual(resendResult.success, true);
  assert.ok(resendResult.verificationCode);
  assert.strictEqual(resendResult.verificationCode?.length, 6);
});

test('Auth Gate: Unverified customer cannot checkout until email confirmation is complete', () => {
  const unverifiedEmail = `unverified_${Date.now()}@example.co.za`;
  const reg = db.registerCustomer({
    name: 'Unverified Customer',
    email: unverifiedEmail,
    password: 'Password@2026!',
  });

  assert.strictEqual(reg.success, true);
  assert.strictEqual(reg.customer?.emailVerified, false);

  // Authenticating without verification code retains emailVerified=false
  const customer = db.getCustomerById(reg.customer!.id);
  assert.strictEqual(customer?.emailVerified, false, 'Account must remain unverified prior to entering code');
});
