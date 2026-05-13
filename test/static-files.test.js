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
  assert.match(js, /fetch\('\/token'/);
  assert.match(js, /X-App-Access-Token/);
  assert.match(js, /search_context/);
  assert.match(js, /create_draft/);
  assert.match(js, /fetch\('\/drafts'/);
  assert.match(js, /function_call_output/);
  assert.match(js, /response\.cancel/);
  assert.match(js, /BARGE_IN_GRACE_MS/);
  assert.match(js, /lastAssistantSpeechAt/);
  assert.match(js, /performance\.now\(\) - lastAssistantSpeechAt/);
  assert.match(js, /getUserMedia/);
});

test('index exposes a compact diagnostics panel', async () => {
  const html = await readFile(new URL('public/index.html', root), 'utf8');
  assert.match(html, /id="diagAuth"/);
  assert.match(html, /id="diagMic"/);
  assert.match(html, /id="diagConn"/);
});
