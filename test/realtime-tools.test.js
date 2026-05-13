import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionConfig } from '../server/session-config.js';

test('buildSessionConfig exposes read-only context search tool', () => {
  const config = buildSessionConfig();
  const tool = config.session.tools.find((entry) => entry.name === 'search_context');

  assert.equal(tool.type, 'function');
  assert.match(tool.description, /read-only/i);
  assert.equal(config.session.tool_choice, 'auto');
  assert.equal(tool.parameters.properties.query.type, 'string');
});

test('buildSessionConfig exposes draft tool but preserves red-action confirmation boundaries', () => {
  const config = buildSessionConfig();
  const tool = config.session.tools.find((entry) => entry.name === 'create_draft');

  assert.equal(tool.type, 'function');
  assert.match(tool.description, /draft/i);
  assert.match(tool.description, /never sends/i);
  assert.match(config.session.instructions, /confirmação explícita/);
  assert.equal(tool.parameters.properties.kind.enum.includes('email'), true);
});
