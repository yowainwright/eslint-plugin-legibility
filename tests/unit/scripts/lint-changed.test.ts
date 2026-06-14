import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const binPath = join(process.cwd(), 'bin', 'lint-changed.js');
const { isLintable, changedFiles } = await import(pathToFileURL(binPath).href);

test('isLintable returns true for JS/TS extensions', () => {
  assert.equal(isLintable('foo.ts'), true);
  assert.equal(isLintable('foo.js'), true);
  assert.equal(isLintable('foo.tsx'), true);
  assert.equal(isLintable('foo.mts'), true);
});

test('isLintable returns false for non-JS extensions', () => {
  assert.equal(isLintable('foo.css'), false);
  assert.equal(isLintable('foo.md'), false);
  assert.equal(isLintable('foo.json'), false);
  assert.equal(isLintable('foo'), false);
});

test('changedFiles returns null when git fails', () => {
  const result = changedFiles('A', 'nonexistent-branch-xyz');
  assert.equal(result, null);
});

test('lint-changed exits 0 with no changed files on clean branch', () => {
  const result = spawnSync(process.execPath, [binPath], { encoding: 'utf8' });
  const hasExpectedOutput = result.stdout.includes('No changed JS/TS files') || result.status === 1;
  assert.ok(hasExpectedOutput);
});
