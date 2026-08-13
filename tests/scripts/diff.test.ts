import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const binPath = join(process.cwd(), 'bin', 'lint-changed.js');
const {
  changedFiles,
  getCommentPolicyArgs,
  isDirectRun,
  isLintable,
  parseAddedLines,
  parseLintChangedArgs,
} = await import(pathToFileURL(binPath).href);

test('parseLintChangedArgs supports the forbid-comments session policy', () => {
  assert.deepEqual(parseLintChangedArgs([]), {
    base: 'origin/main',
    forbidComments: false,
  });
  assert.deepEqual(parseLintChangedArgs(['origin/develop', '--comments=forbid']), {
    base: 'origin/develop',
    forbidComments: true,
  });
  assert.throws(
    () => parseLintChangedArgs(['--comments=unknown']),
    /Unknown comment policy/,
  );
});

test('getCommentPolicyArgs enables no-unmatched-comments for ESLint and Oxlint', () => {
  const files = ['src/check.ts'];
  assert.deepEqual(getCommentPolicyArgs('./node_modules/.bin/eslint', files), [
    '--format',
    'json',
    '--rule',
    'legibility/no-unmatched-comments:error',
    'src/check.ts',
  ]);
  assert.deepEqual(getCommentPolicyArgs('./node_modules/.bin/oxlint', files), [
    '--format',
    'json',
    '--deny',
    'legibility/no-unmatched-comments',
    'src/check.ts',
  ]);
});

test('parseAddedLines maps zero-context hunks to current line numbers', () => {
  const diff = [
    '+++ b/src/check.ts',
    '@@ -1,0 +2,2 @@',
    '+// Explain the check.',
    '+const ready = true;',
  ].join('\n');
  assert.deepEqual(Array.from(parseAddedLines(diff).get('src/check.ts') ?? []), [2, 3]);
});

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

test('isDirectRun compares resolved file URLs', () => {
  const binUrl = pathToFileURL(binPath).href;
  assert.equal(isDirectRun(binUrl, binPath), true);
  assert.equal(isDirectRun(binUrl, undefined), false);
  assert.equal(isDirectRun(binUrl, join(process.cwd(), '.build', 'scripts', 'diff.js')), false);
});

test('lint-changed checks working-tree files against HEAD', () => {
  const result = spawnSync(process.execPath, [binPath, 'HEAD'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /modified file/);
});
