import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateAdmin,
  verifySession,
  invalidateSession,
  clearAllSessionsForTesting,
  ADMIN_CREDENTIALS,
} from './auth';

test('authenticateAdmin succeeds with username admin and default password', () => {
  clearAllSessionsForTesting();
  const res = authenticateAdmin('admin', 'MevoTech@2026!');
  assert.equal(res.success, true);
  if (res.success) {
    assert.match(res.token, /^mevo_adm_[a-f0-9]{64}$/);
    assert.equal(res.user.email, 'admin@mevotech.co.za');
    assert.equal(res.user.role, 'owner');
  }
});

test('authenticateAdmin succeeds with email lookup', () => {
  clearAllSessionsForTesting();
  const res = authenticateAdmin('admin@mevotech.co.za', 'MevoTech@2026!');
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.user.email, 'admin@mevotech.co.za');
  }
});

test('authenticateAdmin succeeds with alternative role credentials (inventory controller)', () => {
  clearAllSessionsForTesting();
  const res = authenticateAdmin('inventory', 'DepotStock@2026!');
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.user.role, 'inventory_manager');
    assert.equal(res.user.email, 'inventory@mevotech.co.za');
  }
});

test('authenticateAdmin fails with incorrect password', () => {
  clearAllSessionsForTesting();
  const res = authenticateAdmin('admin', 'wrong_password_123');
  assert.equal(res.success, false);
  if (!res.success) {
    assert.equal(res.error, 'Invalid username or password');
  }
});

test('authenticateAdmin fails with non-existent username', () => {
  clearAllSessionsForTesting();
  const res = authenticateAdmin('unknown_hacker', 'MevoTech@2026!');
  assert.equal(res.success, false);
  if (!res.success) {
    assert.equal(res.error, 'Invalid username or password');
  }
});

test('authenticateAdmin rejects empty inputs', () => {
  clearAllSessionsForTesting();
  const res1 = authenticateAdmin('', 'password');
  assert.equal(res1.success, false);
  const res2 = authenticateAdmin('admin', '');
  assert.equal(res2.success, false);
});

test('verifySession returns active session and invalidateSession removes it', () => {
  clearAllSessionsForTesting();
  const loginRes = authenticateAdmin('admin', 'MevoTech@2026!');
  assert.equal(loginRes.success, true);

  if (loginRes.success) {
    const session = verifySession(loginRes.token);
    assert.notEqual(session, null);
    assert.equal(session?.user.email, 'admin@mevotech.co.za');

    // Invalidate session on logout
    const logoutSuccess = invalidateSession(loginRes.token);
    assert.equal(logoutSuccess, true);

    // Subsequent verification must fail
    const expiredSession = verifySession(loginRes.token);
    assert.equal(expiredSession, null);
  }
});

test('verifySession rejects invalid or undefined token', () => {
  assert.equal(verifySession(undefined), null);
  assert.equal(verifySession('invalid_token_123'), null);
});
