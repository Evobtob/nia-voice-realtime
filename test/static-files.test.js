import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('index includes mobile/PWA metadata', async () => {
  const html = await readFile(new URL('public/index.html', root), 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /manifest\.json/);
});

test('client app uses WebRTC and requests ephemeral token from backend', async () => {
  const js = await readFile(new URL('public/app.js', root), 'utf8');
  assert.match(js, /RTCPeerConnection/);
  assert.match(js, /\/token/);
  assert.match(js, /getUserMedia/);
  assert.match(js, /response\.cancel/);
});
