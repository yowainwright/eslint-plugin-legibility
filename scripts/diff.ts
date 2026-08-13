#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const JS_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);
const DEFAULT_DIFF_BASE = 'origin/main';
const FORBID_COMMENTS_ARG = '--comments=forbid';
const COMMENTS_ARG_PREFIX = '--comments=';
const FORBID_COMMENTS_RULE = 'legibility/no-unmatched-comments';
const NO_LINTERS_MSG = 'lint-changed: no linters found (eslint, oxlint)\n';
const NO_FILES_MSG = 'No changed JS/TS files.\n';

interface LintChangedOptions {
  base: string;
  forbidComments: boolean;
}

interface SessionPolicyInput {
  comments: LintChangedOptions;
  files: {
    modified: string[];
    new: string[];
  };
  linters: {
    eslint: string | null;
    oxlint: string | null;
  };
}

interface CommentDiagnostic {
  column: number;
  endLine: number;
  file: string;
  line: number;
  message: string;
}

interface EslintMessage {
  column: number;
  endLine?: number;
  line: number;
  message: string;
  ruleId: string | null;
}

interface EslintResult {
  filePath: string;
  messages: EslintMessage[];
}

interface OxlintDiagnostic {
  code: string;
  filename: string;
  labels: Array<{ span: { column: number; line: number } }>;
  message: string;
}

interface OxlintResult {
  diagnostics: OxlintDiagnostic[];
}

function parseLintChangedArgs(args: readonly string[]): LintChangedOptions {
  const commentsArg = args.find((arg) => arg.startsWith(COMMENTS_ARG_PREFIX));
  const hasUnknownPolicy = commentsArg !== undefined && commentsArg !== FORBID_COMMENTS_ARG;
  if (hasUnknownPolicy) throw new Error(`Unknown comment policy: ${commentsArg}`);

  const forbidComments = args.includes(FORBID_COMMENTS_ARG);
  const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
  const base = positionalArgs[0] ?? DEFAULT_DIFF_BASE;
  return { base, forbidComments };
}

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

function readGitFiles(args: string[]): string[] | null {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  const failed = result.error || result.status !== 0;
  if (failed) return null;

  const raw = (result.stdout || '').trim();
  const lines = raw.split('\n');
  return lines.filter(line => line && isLintable(line));
}

function changedFiles(filter: string, base: string): string[] | null {
  const diffFilter = `--diff-filter=${filter}`;
  const trackedFiles = readGitFiles(['diff', '--name-only', diffFilter, base, '--']);
  if (trackedFiles === null) return null;
  if (!filter.includes('A')) return trackedFiles;

  const untrackedFiles = readGitFiles(['ls-files', '--others', '--exclude-standard']);
  if (untrackedFiles === null) return null;
  return Array.from(new Set(trackedFiles.concat(untrackedFiles)));
}

function getHunkLines(line: string): number[] {
  const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if (!hunk) return [];

  const start = Number(hunk[1]);
  const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
  return Array.from({ length: count }, (_, index) => start + index);
}

function addHunkLines(addedLines: Map<string, Set<number>>, file: string, line: string): void {
  const hunkLines = getHunkLines(line);
  const hasHunk = file.length > 0 && hunkLines.length > 0;
  if (!hasHunk) return;

  const nextFileLines = new Set(addedLines.get(file));
  const mergedLines = hunkLines.reduce((lines, lineNumber) => {
    const nextLines = new Set(lines);
    nextLines.add(lineNumber);
    return nextLines;
  }, nextFileLines);
  addedLines.set(file, mergedLines);
}

function parseAddedLines(diff: string): Map<string, Set<number>> {
  const addedLines = new Map<string, Set<number>>();
  let file = '';

  diff.split('\n').forEach((line) => {
    if (line.startsWith('+++ b/')) file = line.slice(6);
    addHunkLines(addedLines, file, line);
  });
  return addedLines;
}

function changedLineNumbers(base: string, files: string[]): Map<string, Set<number>> | null {
  if (files.length === 0) return new Map();

  const args = ['diff', '--unified=0', '--no-color', base, '--'].concat(files);
  const result = spawnSync('git', args, { encoding: 'utf8' });
  const failed = result.error || result.status !== 0;
  if (failed) return null;
  return parseAddedLines(result.stdout || '');
}

function runLinter(bin: string, args: string[]): number {
  const result = spawnSync(bin, args, { stdio: 'inherit' });
  return result.status ?? 1;
}

function getCommentRuleArgs(bin: string, forbidComments: boolean): string[] {
  if (!forbidComments) return [];

  const isOxlint = bin.endsWith('/oxlint') || bin === 'oxlint';
  if (isOxlint) return ['--deny', FORBID_COMMENTS_RULE];
  return ['--rule', `${FORBID_COMMENTS_RULE}:error`];
}

function getCommentPolicyArgs(bin: string, files: string[]): string[] {
  const formatArgs = ['--format', 'json'];
  const commentRuleArgs = getCommentRuleArgs(bin, true);
  return formatArgs.concat(commentRuleArgs, files);
}

function normalizeDiagnosticFile(file: string): string {
  const isAbsolute = file.startsWith('/');
  if (!isAbsolute) return file;
  return relative(process.cwd(), file);
}

function toEslintDiagnostic(result: EslintResult, message: EslintMessage): CommentDiagnostic {
  return {
    column: message.column,
    endLine: message.endLine ?? message.line,
    file: normalizeDiagnosticFile(result.filePath),
    line: message.line,
    message: message.message,
  };
}

function parseEslintResult(result: EslintResult): CommentDiagnostic[] {
  return result.messages.flatMap((message) => {
    const isCommentDiagnostic = message.ruleId === FORBID_COMMENTS_RULE;
    if (!isCommentDiagnostic) return [];
    return [toEslintDiagnostic(result, message)];
  });
}

function parseEslintDiagnostics(output: string): CommentDiagnostic[] {
  const results = JSON.parse(output) as EslintResult[];
  return results.reduce<CommentDiagnostic[]>((diagnostics, result) => {
    const fileDiagnostics = parseEslintResult(result);
    return diagnostics.concat(fileDiagnostics);
  }, []);
}

function toOxlintDiagnostic(diagnostic: OxlintDiagnostic): CommentDiagnostic {
  const span = diagnostic.labels[0].span;
  return {
    column: span.column,
    endLine: span.line,
    file: normalizeDiagnosticFile(diagnostic.filename),
    line: span.line,
    message: diagnostic.message,
  };
}

function parseOxlintDiagnostics(output: string): CommentDiagnostic[] {
  const result = JSON.parse(output) as OxlintResult;
  const diagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.code === 'legibility(no-unmatched-comments)',
  );
  return diagnostics.map(toOxlintDiagnostic);
}

function parseCommentDiagnostics(bin: string, output: string): CommentDiagnostic[] {
  const isOxlint = bin.endsWith('/oxlint') || bin === 'oxlint';
  if (isOxlint) return parseOxlintDiagnostics(output);
  return parseEslintDiagnostics(output);
}

function intersectsAddedLine(diagnostic: CommentDiagnostic, addedLines: Set<number>): boolean {
  const lineCount = diagnostic.endLine - diagnostic.line + 1;
  const lines = Array.from({ length: lineCount }, (_, index) => diagnostic.line + index);
  return lines.some((line) => addedLines.has(line));
}

function isSessionComment(
  diagnostic: CommentDiagnostic,
  newFiles: ReadonlySet<string>,
  changedLines: ReadonlyMap<string, Set<number>>,
): boolean {
  if (newFiles.has(diagnostic.file)) return true;

  const addedLines = changedLines.get(diagnostic.file) ?? new Set<number>();
  return intersectsAddedLine(diagnostic, addedLines);
}

function printCommentDiagnostic(diagnostic: CommentDiagnostic): void {
  const location = `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}`;
  process.stderr.write(`${location} ${diagnostic.message}\n`);
}

function selectCommentViolations(
  diagnostics: CommentDiagnostic[],
  newFiles: ReadonlySet<string>,
  changedLines: ReadonlyMap<string, Set<number>>,
): CommentDiagnostic[] {
  return diagnostics.filter((diagnostic) =>
    isSessionComment(diagnostic, newFiles, changedLines),
  );
}

function runCommentPolicy(
  bin: string,
  files: string[],
  newFiles: ReadonlySet<string>,
  changedLines: ReadonlyMap<string, Set<number>>,
): number {
  const args = getCommentPolicyArgs(bin, files);
  const result = spawnSync(bin, args, { encoding: 'utf8' });
  if (result.error) return 1;

  try {
    const diagnostics = parseCommentDiagnostics(bin, result.stdout || '');
    const violations = selectCommentViolations(diagnostics, newFiles, changedLines);
    violations.forEach(printCommentDiagnostic);
    const hasViolations = violations.length > 0;
    return hasViolations ? 1 : 0;
  } catch {
    process.stderr.write(result.stderr || 'lint-changed: comment policy failed\n');
    return 1;
  }
}

function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;

  const argvUrl = pathToFileURL(resolve(argvPath)).href;
  return argvUrl === metaUrl;
}

export {
  changedFiles,
  changedLineNumbers,
  getCommentPolicyArgs,
  isDirectRun,
  isLintable,
  parseAddedLines,
  parseLintChangedArgs,
  resolveExecutable,
  runLinter,
};

function runNewFileLinters(linters: string[], files: string[]): number {
  if (files.length === 0) return 0;

  process.stdout.write(`+ ${files.length} new file(s) — strict\n`);
  const codes = linters.map((bin) => runLinter(bin, ['--max-warnings', '0'].concat(files)));
  return codes.some((code) => code !== 0) ? 1 : 0;
}

function runModifiedFileLinters(linters: string[], files: string[]): void {
  if (files.length === 0) return;

  process.stdout.write(`~ ${files.length} modified file(s) — warn\n`);
  linters.forEach((bin) => runLinter(bin, files));
}

function runSessionPolicy(input: SessionPolicyInput): number {
  const { comments, files, linters } = input;
  if (!comments.forbidComments) return 0;

  const changedLines = changedLineNumbers(comments.base, files.modified);
  if (changedLines === null) return 1;

  const policyLinter = linters.eslint ?? linters.oxlint;
  if (!policyLinter) return 1;
  const lintFiles = files.new.concat(files.modified);
  return runCommentPolicy(policyLinter, lintFiles, new Set(files.new), changedLines);
}

const isMain = isDirectRun(import.meta.url, process.argv[1]);
if (isMain) {
  const options = parseLintChangedArgs(process.argv.slice(2));
  const { base } = options;
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

  const hasNewFiles = newFiles.length > 0;
  const hasModifiedFiles = modifiedFiles.length > 0;
  const hasFiles = hasNewFiles || hasModifiedFiles;

  if (!hasFiles) {
    process.stdout.write(NO_FILES_MSG);
    process.exit(0);
  }

  const newFileExitCode = runNewFileLinters(linters, newFiles);
  runModifiedFileLinters(linters, modifiedFiles);
  const sessionPolicyInput = {
    comments: options,
    files: { modified: modifiedFiles, new: newFiles },
    linters: { eslint, oxlint },
  };
  const policyExitCode = runSessionPolicy(sessionPolicyInput);
  process.exit(Math.max(newFileExitCode, policyExitCode));
}
