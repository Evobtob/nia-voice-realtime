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

test('buildSessionConfig makes voice activity detection less sensitive to breathing', () => {
  const config = buildSessionConfig();

  assert.equal(config.session.audio.input.turn_detection.type, 'server_vad');
  assert.ok(config.session.audio.input.turn_detection.threshold >= 0.7);
  assert.ok(config.session.audio.input.turn_detection.prefix_padding_ms <= 250);
  assert.ok(config.session.audio.input.turn_detection.silence_duration_ms >= 700);
});

test('requireEnv throws a useful error when the variable is missing', () => {
  assert.throws(() => requireEnv('MISSING_TEST_KEY', {}), /MISSING_TEST_KEY/);
});

test('requireEnv returns the value when present', () => {
  assert.equal(requireEnv('OPENAI_API_KEY', { OPENAI_API_KEY: 'sk-test' }), 'sk-test');
});
