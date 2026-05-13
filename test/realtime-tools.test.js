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
