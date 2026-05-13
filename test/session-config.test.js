import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionConfig, requireEnv } from '../server/session-config.js';

test('buildSessionConfig creates a realtime GPT session with Nia voice instructions', () => {
  const config = buildSessionConfig();
  assert.equal(config.session.type, 'realtime');
  assert.equal(config.session.model, 'gpt-realtime');
  assert.equal(config.session.audio.output.voice, 'marin');
  assert.match(config.session.instructions, /Nia Santos/);
  assert.match(config.session.instructions, /português de Portugal/i);
});

test('requireEnv throws a useful error when the variable is missing', () => {
  assert.throws(() => requireEnv('MISSING_TEST_KEY', {}), /MISSING_TEST_KEY/);
});

test('requireEnv returns the value when present', () => {
  assert.equal(requireEnv('OPENAI_API_KEY', { OPENAI_API_KEY: 'sk-test' }), 'sk-test');
});
