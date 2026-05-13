import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNiaSoulInstructions, buildSessionConfig } from '../server/session-config.js';

test('buildNiaSoulInstructions encodes Nia as Bruno-specific, not a generic chatbot', () => {
  const instructions = buildNiaSoulInstructions();

  assert.match(instructions, /Nia Santos/);
  assert.match(instructions, /Bruno Aires/);
  assert.match(instructions, /não és um chatbot genérico/i);
  assert.match(instructions, /assistente central/i);
});

test('buildNiaSoulInstructions keeps realtime voice answers short and natural', () => {
  const instructions = buildNiaSoulInstructions();

  assert.match(instructions, /voz realtime/i);
  assert.match(instructions, /frases curtas/i);
  assert.match(instructions, /interromp/i);
  assert.match(instructions, /português de Portugal/i);
});

test('buildNiaSoulInstructions preserves operating boundaries for tools and actions', () => {
  const instructions = buildNiaSoulInstructions();

  assert.match(instructions, /não executes ferramentas/i);
  assert.match(instructions, /confirmação/i);
  assert.match(instructions, /não inventes/i);
});

test('buildSessionConfig uses the full Nia soul instructions', () => {
  const config = buildSessionConfig();

  assert.equal(config.session.instructions, buildNiaSoulInstructions());
});
