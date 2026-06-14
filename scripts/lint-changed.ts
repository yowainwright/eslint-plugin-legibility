// @tqs-script
import * as std from 'qjs:std';
import * as os from 'qjs:os';

const JS_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);
const DEFAULT_BASE = 'origin/main';
const NO_LINTERS_MSG = 'lint-changed: no linters found (eslint, oxlint)\n';
const NO_FILES_MSG = 'No changed JS/TS files.\n';

function fileExists(path: string): boolean {
  const [, err] = os.stat(path);
  return err === 0;
}

function resolveExecutable(name: string): string | null {
  const local = `./node_modules/.bin/${name}`;
  if (fileExists(local)) return local;
  const probe = os.exec([name, '--version'], { usePath: true, block: true, stderr: std.err });
  const notFound = probe === 127;
  return notFound ? null : name;
}

function isLintable(file: string): boolean {
  const dot = file.lastIndexOf('.');
  const ext = dot >= 0 ? file.slice(dot) : '';
  return JS_EXTENSIONS.has(ext);
}

function changedFiles(filter: string, base: string): string[] | null {
  const pipe = std.popen(`git diff --name-only --diff-filter=${filter} ${base}...HEAD`, 'r');
  if (!pipe) return null;
  const output = pipe.readAsString();
  const exitCode = pipe.close();
  const failed = exitCode !== 0;
  if (failed) return null;
  return output.trim().split('\n').filter(Boolean).filter(isLintable);
}

function runLinter(bin: string, args: string[]): number {
  return os.exec([bin].concat(args), { usePath: true, block: true });
}

const base = scriptArgs[2] || DEFAULT_BASE;
const linters = [resolveExecutable('eslint'), resolveExecutable('oxlint')].filter((x): x is string => x !== null);
const hasLinters = linters.length > 0;

if (!hasLinters) {
  std.err.puts(NO_LINTERS_MSG);
  std.exit(1);
}

const newFiles = changedFiles('A', base);
const modifiedFiles = changedFiles('MCRT', base);
const gitFailed = newFiles === null || modifiedFiles === null;

if (gitFailed) {
  std.err.puts(`lint-changed: git diff failed against ${base}\n`);
  std.exit(1);
}

const hasFiles = newFiles.length > 0 || modifiedFiles.length > 0;
if (!hasFiles) {
  std.out.puts(NO_FILES_MSG);
  std.exit(0);
}

let exitCode = 0;

const newFileCount = newFiles.length;
const hasNewFiles = newFileCount > 0;
if (hasNewFiles) {
  const newFilesMsg = `+ ${newFileCount} new file(s) — strict\n`;
  std.out.puts(newFilesMsg);
  const codes = linters.map(bin => runLinter(bin, ['--max-warnings', '0'].concat(newFiles)));
  const anyFailed = codes.some(code => code !== 0);
  if (anyFailed) exitCode = 1;
}

const modifiedFileCount = modifiedFiles.length;
const hasModifiedFiles = modifiedFileCount > 0;
if (hasModifiedFiles) {
  const modifiedFilesMsg = `~ ${modifiedFileCount} modified file(s) — warn\n`;
  std.out.puts(modifiedFilesMsg);
  linters.forEach(bin => runLinter(bin, modifiedFiles));
}

std.exit(exitCode);
