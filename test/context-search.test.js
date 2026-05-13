import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { searchVaultNotes, normalizeQuery } from '../server/context-search.js';

test('normalizeQuery keeps safe searchable terms', () => {
  assert.deepEqual(normalizeQuery('Mealheiro dos miúdos!! token=abc'), ['mealheiro', 'miúdos', 'token', 'abc']);
});

test('searchVaultNotes finds matching markdown notes without exposing full vault', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'nia-vault-'));
  await mkdir(path.join(root, 'Projectos', 'Mealheiro'), { recursive: true });
  await writeFile(path.join(root, 'Projectos', 'Mealheiro', 'Estado.md'), '# Mealheiro\nArduino Nano com ecrã e dois knobs. Sprint validar famílias.');
  await writeFile(path.join(root, 'Segredo.md'), 'OPENAI_API_KEY=sk-proj-secret token=abc123');

  const result = await searchVaultNotes('Mealheiro Arduino', { vaultRoot: root, limit: 3 });

  assert.equal(result.query, 'Mealheiro Arduino');
  assert.equal(result.results.length, 1);
  assert.match(result.results[0].title, /Estado/);
  assert.match(result.results[0].excerpt, /Arduino Nano/);
  assert.doesNotMatch(JSON.stringify(result), /sk-proj-secret|abc123/);
});

test('searchVaultNotes returns empty result for weak query', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'nia-vault-'));
  const result = await searchVaultNotes('de a o', { vaultRoot: root });

  assert.equal(result.results.length, 0);
  assert.match(result.message, /pergunta mais específica/i);
});
