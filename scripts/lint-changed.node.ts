#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const JS_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);
const DEFAULT_BASE = 'origin/main';
const NO_LINTERS_MSG = 'lint-changed: no linters found (eslint, oxlint)\n';
const NO_FILES_MSG = 'No changed JS/TS files.\n';

function resolveExecutable(name: string): string | null {
  const local = `./node_modules/.bin/${name}`;
  if (existsSync(local)) return local;
  const probe = spawnSync(name, ['--version'], { stdio: 'pipe' });
  const notFound = (probe.error as NodeJS.ErrnoException)?.code === 'ENOENT';
  return notFound ? null : name;
}

function isLintable(file: string): boolean {
  const dot = file.lastIndexOf('.');
  const ext = dot >= 0 ? file.slice(dot) : '';
  return JS_EXTENSIONS.has(ext);
}

function changedFiles(filter: string, base: string): string[] | null {
  const diffFilter = `--diff-filter=${filter}`;
  const diffRange = `${base}...HEAD`;
  const result = spawnSync('git', ['diff', '--name-only', diffFilter, diffRange], { encoding: 'utf8' });
  const failed = result.error || result.status !== 0;
  if (failed) return null;
  const raw = (result.stdout || '').trim();
  const lines = raw.split('\n');
  return lines.filter(line => line && isLintable(line));
}

function runLinter(bin: string, args: string[]): number {
  const result = spawnSync(bin, args, { stdio: 'inherit' });
  return result.status ?? 1;
}

export { isLintable, resolveExecutable, changedFiles, runLinter };

const isMain = process.argv[1]?.endsWith('lint-changed.js');
if (isMain) {
  const base = process.argv[2] || DEFAULT_BASE;
  const eslint = resolveExecutable('eslint');
  const oxlint = resolveExecutable('oxlint');
  const linters = [eslint, oxlint].filter((x): x is string => x !== null);
  const hasLinters = linters.length > 0;

  if (!hasLinters) {
    process.stderr.write(NO_LINTERS_MSG);
    process.exit(1);
  }

  const newFiles = changedFiles('A', base);
  const modifiedFiles = changedFiles('MCRT', base);
  const gitFailed = newFiles === null || modifiedFiles === null;

  if (gitFailed) {
    process.stderr.write(`lint-changed: git diff failed against ${base}\n`);
    process.exit(1);
  }

  const newFileCount = newFiles.length;
  const modifiedFileCount = modifiedFiles.length;
  const hasNewFiles = newFileCount > 0;
  const hasModifiedFiles = modifiedFileCount > 0;
  const hasFiles = hasNewFiles || hasModifiedFiles;

  if (!hasFiles) {
    process.stdout.write(NO_FILES_MSG);
    process.exit(0);
  }

  let exitCode = 0;

  if (hasNewFiles) {
    const newFilesMsg = `+ ${newFileCount} new file(s) — strict\n`;
    process.stdout.write(newFilesMsg);
    const codes = linters.map(bin => runLinter(bin, ['--max-warnings', '0'].concat(newFiles)));
    const anyFailed = codes.some(code => code !== 0);
    if (anyFailed) exitCode = 1;
  }

  if (hasModifiedFiles) {
    const modifiedFilesMsg = `~ ${modifiedFileCount} modified file(s) — warn\n`;
    process.stdout.write(modifiedFilesMsg);
    linters.forEach(bin => runLinter(bin, modifiedFiles));
  }

  process.exit(exitCode);
}
