import test from 'node:test';
import assert from 'node:assert/strict';
import { getAccessTokenFromRequest, requireAppAccessToken } from '../server/access-control.js';

test('getAccessTokenFromRequest reads x-app-access-token header', () => {
  const req = { headers: { 'x-app-access-token': 'abc' }, query: {} };
  assert.equal(getAccessTokenFromRequest(req), 'abc');
});

test('getAccessTokenFromRequest reads access query fallback', () => {
  const req = { headers: {}, query: { access: 'xyz' } };
  assert.equal(getAccessTokenFromRequest(req), 'xyz');
});

test('requireAppAccessToken allows requests when no APP_ACCESS_TOKEN is configured', () => {
  const middleware = requireAppAccessToken({});
  let called = false;
  middleware({ headers: {}, query: {} }, {}, () => { called = true; });
  assert.equal(called, true);
});

test('requireAppAccessToken rejects invalid token', () => {
  const middleware = requireAppAccessToken({ APP_ACCESS_TOKEN: 'secret' });
  let statusCode;
  let payload;
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { payload = body; return this; }
  };
  middleware({ headers: {}, query: {} }, res, () => assert.fail('next should not be called'));
  assert.equal(statusCode, 401);
  assert.equal(payload.error, 'unauthorized');
});

test('requireAppAccessToken accepts valid token', () => {
  const middleware = requireAppAccessToken({ APP_ACCESS_TOKEN: 'secret' });
  let called = false;
  middleware({ headers: { 'x-app-access-token': 'secret' }, query: {} }, {}, () => { called = true; });
  assert.equal(called, true);
});
