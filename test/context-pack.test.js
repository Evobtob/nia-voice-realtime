import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNiaContextPack, sanitizeContextText } from '../server/context-pack.js';
import { buildNiaSoulInstructions } from '../server/session-config.js';

test('sanitizeContextText redacts obvious secrets before injecting voice context', () => {
  const input = 'token=abc123 OPENAI_API_KEY=sk-proj-secret TRELLO_TOKEN=abcd';
  const output = sanitizeContextText(input);

  assert.doesNotMatch(output, /sk-proj-secret/);
  assert.doesNotMatch(output, /abcd/);
  assert.match(output, /\[REDACTED\]/);
});

test('buildNiaContextPack includes Bruno family and active projects', () => {
  const context = buildNiaContextPack();

  assert.match(context, /Bruno Aires/);
  assert.match(context, /Duarte/);
  assert.match(context, /Matias/);
  assert.match(context, /Mealheiro/);
  assert.match(context, /Nia Voice Realtime/);
});

test('buildNiaSoulInstructions injects contextual memory for realtime voice', () => {
  const instructions = buildNiaSoulInstructions();

  assert.match(instructions, /Contexto vivo de Bruno/);
  assert.match(instructions, /Projectos activos/);
  assert.match(instructions, /Mealheiro/);
  assert.match(instructions, /AI Ops para Clínicas/);
});
