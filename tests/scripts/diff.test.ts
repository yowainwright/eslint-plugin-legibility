import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const binPath = join(process.cwd(), 'bin', 'lint-changed.js');
const gitEnvironmentVariables = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_CONFIG',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_PARAMETERS',
  'GIT_DIR',
  'GIT_GRAFT_FILE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_OBJECT_DIRECTORY',
  'GIT_PREFIX',
  'GIT_REPLACE_REF_BASE',
  'GIT_SHALLOW_FILE',
  'GIT_WORK_TREE',
];
gitEnvironmentVariables.forEach((variable) => delete process.env[variable]);
const {
  changedFiles,
  changedLineNumbers,
  getCommentPolicyArgs,
  getSpanEndLine,
  isDirectRun,
  isLintable,
  normalizeDiagnosticFile,
  parseAddedLines,
  parseLintChangedArgs,
} = await import(pathToFileURL(binPath).href);

function getIsolatedGitEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  gitEnvironmentVariables.forEach((variable) => delete environment[variable]);
  return environment;
}

function runGit(repository: string, args: string[]): void {
  const environment = getIsolatedGitEnvironment();
  const result = spawnSync('git', args, { cwd: repository, encoding: 'utf8', env: environment });
  assert.equal(result.status, 0, result.stderr);
}

function createCleanRepository(): string {
  const fixtureRoot = join(process.cwd(), 'tests', '.test-fixtures');
  mkdirSync(fixtureRoot, { recursive: true });
  const repository = mkdtempSync(join(fixtureRoot, 'lint-changed-'));
  runGit(repository, ['init', '--quiet']);
  writeFileSync(join(repository, 'check.ts'), 'export const ready = true;\n');
  runGit(repository, ['add', 'check.ts']);
  const commitArgs = [
    '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '--quiet', '-m', 'initial',
  ];
  runGit(repository, commitArgs);
  return repository;
}

function getFixtureEnvironment(): NodeJS.ProcessEnv {
  const projectBin = join(process.cwd(), 'node_modules', '.bin');
  const path = [projectBin, process.env.PATH ?? ''].join(delimiter);
  return { ...getIsolatedGitEnvironment(), PATH: path };
}

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
    '--no-ignore',
    '--no-inline-config',
    '--exit-on-fatal-error',
    '--format',
    'json',
    '--rule',
    'legibility/no-unmatched-comments:error',
    'src/check.ts',
  ]);
  assert.deepEqual(getCommentPolicyArgs('./node_modules/.bin/oxlint', files), [
    '--no-ignore',
    '--format',
    'json',
    '--deny',
    'legibility/no-unmatched-comments',
    'src/check.ts',
  ]);
});

test('changedLineNumbers preserves pure rename detection', (context) => {
  const repository = createCleanRepository();
  context.after(() => rmSync(repository, { recursive: true }));
  runGit(repository, ['mv', 'check.ts', 'renamed.ts']);

  const cwd = process.cwd();
  process.chdir(repository);
  try {
    assert.deepEqual(changedLineNumbers('HEAD', ['renamed.ts']), new Map());
  } finally {
    process.chdir(cwd);
  }
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

test('normalizeDiagnosticFile matches Git paths on Windows', () => {
  const file = normalizeDiagnosticFile('C:\\repo\\src\\check.ts', 'C:\\repo');
  assert.equal(file, 'src/check.ts');
});

test('getSpanEndLine includes multiline Oxlint spans', () => {
  const source = Buffer.from('/* first\n * second\n */\nconst ready = true;\n');
  const span = { column: 1, length: 22, line: 1, offset: 0 };
  assert.equal(getSpanEndLine(source, span), 3);
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

test('changedFiles ignores base-branch commits the current branch never diverged from', (context) => {
  const repository = createCleanRepository();
  context.after(() => rmSync(repository, { recursive: true }));

  const baseBranchResult = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: repository,
    encoding: 'utf8',
    env: getIsolatedGitEnvironment(),
  });
  assert.equal(baseBranchResult.status, 0, baseBranchResult.stderr);
  const baseBranch = baseBranchResult.stdout.trim();
  runGit(repository, ['checkout', '--quiet', '-b', 'feature']);
  runGit(repository, ['checkout', '--quiet', baseBranch]);
  writeFileSync(join(repository, 'check.ts'), 'export const ready = false;\n');
  runGit(repository, ['add', 'check.ts']);
  runGit(repository, [
    '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '--quiet', '-m', 'base-only change',
  ]);
  runGit(repository, ['checkout', '--quiet', 'feature']);

  const cwd = process.cwd();
  process.chdir(repository);
  try {
    assert.deepEqual(changedFiles('MCRT', baseBranch), []);
  } finally {
    process.chdir(cwd);
  }
});

test('isDirectRun compares resolved file URLs', () => {
  const binUrl = pathToFileURL(binPath).href;
  assert.equal(isDirectRun(binUrl, binPath), true);
  assert.equal(isDirectRun(binUrl, undefined), false);
  assert.equal(isDirectRun(binUrl, join(process.cwd(), '.build', 'scripts', 'diff.js')), false);
});

test('lint-changed reports no files in a clean checkout', (context) => {
  const repository = createCleanRepository();
  context.after(() => rmSync(repository, { recursive: true }));

  const result = spawnSync(process.execPath, [binPath, 'HEAD'], {
    cwd: repository,
    encoding: 'utf8',
    env: getFixtureEnvironment(),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No changed JS\/TS files/);
});

test('lint-changed rejects inline directives during comment-forbidden sessions', (context) => {
  const repository = createCleanRepository();
  context.after(() => rmSync(repository, { recursive: true }));
  const source = [
    '/* eslint-disable legibility/no-unmatched-comments */',
    'export const ready = true;',
  ].join('\n');
  writeFileSync(join(repository, 'check.ts'), `${source}\n`);

  const result = spawnSync(process.execPath, [binPath, 'HEAD', '--comments=forbid'], {
    cwd: repository,
    encoding: 'utf8',
    env: getFixtureEnvironment(),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Comment does not match/);
});

test('lint-changed fails when comment-policy parsing aborts', (context) => {
  const repository = createCleanRepository();
  context.after(() => rmSync(repository, { recursive: true }));
  writeFileSync(join(repository, 'check.ts'), 'export const ready = ;\n// hidden comment\n');

  const result = spawnSync(process.execPath, [binPath, 'HEAD', '--comments=forbid'], {
    cwd: repository,
    encoding: 'utf8',
    env: getFixtureEnvironment(),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /comment policy failed/);
});

test('lint-changed preserves modified-file linter failures', (context) => {
  const repository = createCleanRepository();
  context.after(() => rmSync(repository, { recursive: true }));
  writeFileSync(join(repository, 'check.ts'), 'export const ready = ;\n');

  const result = spawnSync(process.execPath, [binPath, 'HEAD'], {
    cwd: repository,
    encoding: 'utf8',
    env: getFixtureEnvironment(),
  });
  assert.equal(result.status, 1);
});

test('lint-changed permits existing comments in pure renames', (context) => {
  const repository = createCleanRepository();
  context.after(() => rmSync(repository, { recursive: true }));
  writeFileSync(join(repository, 'check.ts'), '// existing context\nexport const ready = true;\n');
  runGit(repository, ['add', 'check.ts']);
  runGit(repository, ['commit', '--quiet', '--amend', '--no-edit']);
  runGit(repository, ['mv', 'check.ts', 'renamed.ts']);

  const result = spawnSync(process.execPath, [binPath, 'HEAD', '--comments=forbid'], {
    cwd: repository,
    encoding: 'utf8',
    env: getFixtureEnvironment(),
  });
  assert.equal(result.status, 0, result.stderr);
});
