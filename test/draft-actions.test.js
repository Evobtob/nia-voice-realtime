import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { classifyAction, createVoiceDraft } from '../server/draft-actions.js';

test('classifyAction treats third-party email as red confirmation-required action', () => {
  const classification = classifyAction({ kind: 'email', recipient: 'Pedro', content: 'Olá Pedro' });

  assert.equal(classification.level, 'red');
  assert.equal(classification.confirmationRequired, true);
  assert.match(classification.reason, /terceiros/i);
});

test('classifyAction allows private notes as green reversible action', () => {
  const classification = classifyAction({ kind: 'note', title: 'Ideia Mealheiro', content: 'Validar com 3 famílias' });

  assert.equal(classification.level, 'green');
  assert.equal(classification.confirmationRequired, false);
});

test('createVoiceDraft writes a safe pending draft without executing red actions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'nia-drafts-'));
  const draft = await createVoiceDraft({
    kind: 'email',
    title: 'Email ao Pedro',
    recipient: 'Pedro',
    content: 'Olá Pedro, segue o ponto de situação.',
    source: 'voice'
  }, { vaultRoot: root, now: new Date('2026-05-13T20:45:00Z') });

  assert.equal(draft.status, 'pending_confirmation');
  assert.equal(draft.executed, false);
  assert.equal(draft.confirmationRequired, true);
  assert.match(draft.path, /Voice Actions/);

  const saved = await readFile(path.join(root, draft.path), 'utf8');
  assert.match(saved, /Status: pending_confirmation/);
  assert.match(saved, /Executado: não/);
  assert.match(saved, /Olá Pedro/);
});
