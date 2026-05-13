import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseJwtPayload,
  tokenExpiresWithin,
  loadCodexTokens,
  resolveRealtimeBearerToken
} from '../server/codex-oauth.js';

function jwt(payload) {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${enc({ alg: 'none' })}.${enc(payload)}.`;
}

test('parseJwtPayload decodes JWT payload without verifying signature', () => {
  assert.deepEqual(parseJwtPayload(jwt({ exp: 123, sub: 'user' })), { exp: 123, sub: 'user' });
});

test('tokenExpiresWithin detects near-expiry access tokens', () => {
  const now = 1_000;
  assert.equal(tokenExpiresWithin(jwt({ exp: now + 30 }), 120, now), true);
  assert.equal(tokenExpiresWithin(jwt({ exp: now + 300 }), 120, now), false);
});

test('resolveRealtimeBearerToken prefers explicit OPENAI_API_KEY over OAuth', async () => {
  const result = await resolveRealtimeBearerToken({ OPENAI_API_KEY: 'sk-test' });
  assert.equal(result.token, 'sk-test');
  assert.equal(result.authMode, 'api_key');
});

test('loadCodexTokens reads valid Codex CLI OAuth tokens from auth.json', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'codex-auth-'));
  const authPath = path.join(dir, 'auth.json');
  await writeFile(authPath, JSON.stringify({ tokens: { access_token: jwt({ exp: 9_999_999_999 }), refresh_token: 'rt-test' } }));

  const result = await loadCodexTokens({ CODEX_AUTH_PATH: authPath });
  assert.equal(result.accessToken.includes('.'), true);
  assert.equal(result.source, authPath);
});

test('loadCodexTokens refreshes expiring token and persists rotated refresh token', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'codex-auth-refresh-'));
  const authPath = path.join(dir, 'auth.json');
  await writeFile(authPath, JSON.stringify({ tokens: { access_token: jwt({ exp: 1 }), refresh_token: 'rt-old' } }));

  const fetchImpl = async (_url, options) => {
    assert.match(String(options.body), /grant_type=refresh_token/);
    assert.match(String(options.body), /refresh_token=rt-old/);
    return new Response(JSON.stringify({ access_token: jwt({ exp: 9_999_999_999 }), refresh_token: 'rt-new' }), { status: 200 });
  };

  const result = await loadCodexTokens({ CODEX_AUTH_PATH: authPath }, fetchImpl);
  assert.equal(result.refreshToken, 'rt-new');

  const saved = JSON.parse(await readFile(authPath, 'utf8'));
  assert.equal(saved.tokens.refresh_token, 'rt-new');
});
