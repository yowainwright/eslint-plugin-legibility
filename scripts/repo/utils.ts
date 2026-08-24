#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, normalize, relative, resolve, win32 } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  packArgs,
  packageName,
  preReleases,
  releaseIncrements,
  releaseItBin,
  repoManagerTargets,
  safeShellArgPattern,
  validationEnd,
  validationStart,
  versionPattern,
} from "./constants.ts";
import type {
  PreRelease,
  ReleaseArgs,
  ReleaseConfirm,
  ReleaseIncrement,
  ReleaseOptions,
  ReleasePlan,
  ReleaseRunner,
  RepoCommandResult,
  RepoCommandRunner,
  RepoManagerTarget,
} from "./types.ts";

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
  fatal?: boolean;
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
  labels: Array<{ span: OxlintSpan }>;
  message: string;
  severity: string;
}

interface OxlintResult {
  diagnostics: OxlintDiagnostic[];
}

interface OxlintSpan {
  column: number;
  length: number;
  line: number;
  offset: number;
}

interface ParsedCommentPolicy {
  diagnostics: CommentDiagnostic[];
  hasFatalError: boolean;
}

interface CommentPolicyEvaluation {
  changedLines: ReadonlyMap<string, Set<number>>;
  newFiles: ReadonlySet<string>;
  policy: ParsedCommentPolicy;
  status: number | null;
  stderr: string;
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

function resolveMergeBase(base: string): string {
  const result = spawnSync('git', ['merge-base', base, 'HEAD'], { encoding: 'utf8' });
  const succeeded = !result.error && result.status === 0;
  if (!succeeded) return base;
  return result.stdout.trim();
}

function changedFiles(filter: string, base: string): string[] | null {
  const diffFilter = `--diff-filter=${filter}`;
  const mergeBase = resolveMergeBase(base);
  const trackedFiles = readGitFiles(['diff', '--name-only', diffFilter, mergeBase, '--']);
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

  const fileLines = new Set(addedLines.get(file));
  const mergedLines = hunkLines.reduce((lines, lineNumber) => {
    lines.add(lineNumber);
    return lines;
  }, fileLines);
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

  const mergeBase = resolveMergeBase(base);
  const args = ['diff', '--find-renames', '--unified=0', '--no-color', mergeBase, '--'];
  const result = spawnSync('git', args, { encoding: 'utf8' });
  const failed = result.error || result.status !== 0;
  if (failed) return null;

  const changedLines = parseAddedLines(result.stdout || '');
  const requestedFiles = new Set(files.map(normalizeSeparators));
  const selectedLines = Array.from(changedLines).filter(([file]) => requestedFiles.has(file));
  return new Map(selectedLines);
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
  const isOxlint = bin.endsWith('/oxlint') || bin === 'oxlint';
  const policyArgs = isOxlint
    ? ['--no-ignore']
    : ['--no-ignore', '--no-inline-config', '--exit-on-fatal-error'];
  const formatArgs = ['--format', 'json'];
  const commentRuleArgs = getCommentRuleArgs(bin, true);
  return policyArgs.concat(formatArgs, commentRuleArgs, files);
}

function normalizeSeparators(file: string): string {
  return file.replaceAll('\\', '/');
}

function normalizeDiagnosticFile(file: string, cwd = process.cwd()): string {
  const isWindowsAbsolute = win32.isAbsolute(file);
  const isFileAbsolute = isWindowsAbsolute || isAbsolute(file);
  if (!isFileAbsolute) return normalizeSeparators(file);

  const relativeFile = isWindowsAbsolute ? win32.relative(cwd, file) : relative(cwd, file);
  return normalizeSeparators(relativeFile);
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

function parseEslintPolicy(output: string): ParsedCommentPolicy {
  const results = JSON.parse(output) as EslintResult[];
  const diagnostics = results.reduce<CommentDiagnostic[]>((current, result) => {
    const fileDiagnostics = parseEslintResult(result);
    return current.concat(fileDiagnostics);
  }, []);
  const messages = results.flatMap((result) => result.messages);
  const hasFatalError = messages.some((message) => message.fatal);
  return { diagnostics, hasFatalError };
}

function getSpanEndLine(source: Buffer, span: OxlintSpan): number {
  const spanEnd = span.offset + span.length;
  const spanSource = source.subarray(span.offset, spanEnd).toString('utf8');
  const addedLineCount = spanSource.split('\n').length - 1;
  return span.line + addedLineCount;
}

function getOxlintEndLine(filename: string, span: OxlintSpan): number {
  try {
    return getSpanEndLine(readFileSync(filename), span);
  } catch {
    return span.line;
  }
}

function toOxlintDiagnostic(diagnostic: OxlintDiagnostic): CommentDiagnostic[] {
  const span = diagnostic.labels[0]?.span;
  if (!span) return [];

  const commentDiagnostic = {
    column: span.column,
    endLine: getOxlintEndLine(diagnostic.filename, span),
    file: normalizeDiagnosticFile(diagnostic.filename),
    line: span.line,
    message: diagnostic.message,
  };
  return [commentDiagnostic];
}

function parseOxlintPolicy(output: string): ParsedCommentPolicy {
  const result = JSON.parse(output) as OxlintResult;
  const commentDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.code === 'legibility(no-unmatched-comments)',
  );
  const diagnostics = commentDiagnostics.flatMap(toOxlintDiagnostic);
  const hasFatalError = result.diagnostics.some((diagnostic) => {
    const isCommentDiagnostic = diagnostic.code === 'legibility(no-unmatched-comments)';
    const isError = diagnostic.severity === 'error';
    const isFatalError = isError && !isCommentDiagnostic;
    return isFatalError;
  });
  return { diagnostics, hasFatalError };
}

function parseCommentPolicy(bin: string, output: string): ParsedCommentPolicy {
  const isOxlint = bin.endsWith('/oxlint') || bin === 'oxlint';
  if (isOxlint) return parseOxlintPolicy(output);
  return parseEslintPolicy(output);
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

function evaluateCommentPolicy(input: CommentPolicyEvaluation): number {
  const { changedLines, newFiles, policy, status, stderr } = input;
  const hasUnexpectedStatus = status === null || status > 1;
  const hasPolicyFailure = policy.hasFatalError || hasUnexpectedStatus;
  if (hasPolicyFailure) {
    process.stderr.write(stderr || 'lint-changed: comment policy failed\n');
    return 1;
  }

  const violations = selectCommentViolations(policy.diagnostics, newFiles, changedLines);
  violations.forEach(printCommentDiagnostic);
  const hasViolations = violations.length > 0;
  return Number(hasViolations);
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
    const policy = parseCommentPolicy(bin, result.stdout || '');
    const evaluation = {
      changedLines,
      newFiles,
      policy,
      status: result.status,
      stderr: result.stderr || '',
    };
    return evaluateCommentPolicy(evaluation);
  } catch {
    process.stderr.write(result.stderr || 'lint-changed: comment policy failed\n');
    return 1;
  }
}

function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;

  const realMetaPath = getRealPath(fileURLToPath(metaUrl));
  const realArgvPath = getRealPath(resolve(argvPath));

  const argvUrl = pathToFileURL(realArgvPath).href;
  const realMetaUrl = pathToFileURL(realMetaPath).href;
  return argvUrl === realMetaUrl;
}

function getRealPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

export {
  changedFiles,
  changedLineNumbers,
  getCommentPolicyArgs,
  getSpanEndLine,
  isDirectRun,
  isLintable,
  normalizeDiagnosticFile,
  parseAddedLines,
  parseLintChangedArgs,
  resolveExecutable,
  resolveMergeBase,
  runLinter,
};

function runNewFileLinters(linters: string[], files: string[]): number {
  if (files.length === 0) return 0;

  process.stdout.write(`+ ${files.length} new file(s) — strict\n`);
  const codes = linters.map((bin) => runLinter(bin, ['--max-warnings', '0'].concat(files)));
  return codes.some((code) => code !== 0) ? 1 : 0;
}

function runModifiedFileLinters(linters: string[], files: string[]): number {
  if (files.length === 0) return 0;

  process.stdout.write(`~ ${files.length} modified file(s) — warn\n`);
  const codes = linters.map((bin) => runLinter(bin, files));
  return codes.some((code) => code !== 0) ? 1 : 0;
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

export function runLintChanged(args: readonly string[]): number {
  const options = parseLintChangedArgs(args);
  const { base } = options;
  const eslint = resolveExecutable('eslint');
  const oxlint = resolveExecutable('oxlint');
  const linters = [eslint, oxlint].filter((x): x is string => x !== null);
  const hasLinters = linters.length > 0;

  if (!hasLinters) {
    process.stderr.write(NO_LINTERS_MSG);
    return 1;
  }

  const newFiles = changedFiles('A', base);
  const modifiedFiles = changedFiles('MCRT', base);
  const gitFailed = newFiles === null || modifiedFiles === null;

  if (gitFailed) {
    process.stderr.write(`lint-changed: git diff failed against ${base}\n`);
    return 1;
  }

  const hasNewFiles = newFiles.length > 0;
  const hasModifiedFiles = modifiedFiles.length > 0;
  const hasFiles = hasNewFiles || hasModifiedFiles;

  if (!hasFiles) {
    process.stdout.write(NO_FILES_MSG);
    return 0;
  }

  const newFileExitCode = runNewFileLinters(linters, newFiles);
  const modifiedFileExitCode = runModifiedFileLinters(linters, modifiedFiles);
  const sessionPolicyInput = {
    comments: options,
    files: { modified: modifiedFiles, new: newFiles },
    linters: { eslint, oxlint },
  };
  const policyExitCode = runSessionPolicy(sessionPolicyInput);
  return Math.max(newFileExitCode, modifiedFileExitCode, policyExitCode);
}

const isMain = isDirectRun(import.meta.url, process.argv[1]);
if (isMain) process.exitCode = runLintChanged(process.argv.slice(2));

const runRepoCommand: RepoCommandRunner = (command, args) =>
  spawnSync(command, Array.from(args), { stdio: "inherit" });

function getCommandStatus(result: RepoCommandResult): number {
  return result.status ?? 1;
}

function runNubSteps(
  steps: readonly string[][],
  runner: RepoCommandRunner,
  index = 0,
): number {
  const step = steps[index];
  if (!step) return 0;

  const status = getCommandStatus(runner("nub", step));
  if (status !== 0) return status;
  return runNubSteps(steps, runner, index + 1);
}

export function getValidationSteps(): string[][] {
  return validationStart.concat([["run", "test"]], validationEnd);
}

interface PackResult {
  filename?: unknown;
}

export function parsePackOutput(output: string): string {
  const ansiEscape = String.fromCharCode(27);
  const ansiEscapePattern = new RegExp(`${ansiEscape}\\[[0-?]*[ -/]*[@-~]`, "g");
  const lines = output.replace(ansiEscapePattern, "").trim().split(/\r?\n/);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const candidate = lines.slice(index).join("\n");
    try {
      const parsed = JSON.parse(candidate) as PackResult | PackResult[];
      const packageResult = Array.isArray(parsed) ? parsed[0] : parsed;
      const filename = packageResult?.filename;
      if (typeof filename !== "string") continue;
      if (filename.length === 0) continue;
      const normalizedFilename = normalize(filename);
      if (normalizedFilename.length > 0) return normalizedFilename;
    } catch {
      continue;
    }
  }

  throw new Error("Pack JSON output not found");
}

export class Pack {
  private readonly runner: RepoCommandRunner;

  constructor(runner: RepoCommandRunner = runRepoCommand) {
    this.runner = runner;
  }

  run(): number {
    return getCommandStatus(this.runner("nub", packArgs));
  }
}

export class Validate {
  private readonly runner: RepoCommandRunner;

  constructor(runner: RepoCommandRunner = runRepoCommand) {
    this.runner = runner;
  }

  run(): number {
    const steps = getValidationSteps();
    return runNubSteps(steps, this.runner);
  }
}

function isRepoManagerTarget(target: string | undefined): target is RepoManagerTarget {
  if (!target) return false;
  return repoManagerTargets.has(target);
}

export function parseRepoManagerTarget(args: readonly string[]): RepoManagerTarget {
  const target = args[0];
  if (isRepoManagerTarget(target)) return target;
  throw new Error(`Invalid repository manager target: ${target ?? "(missing)"}`);
}

export function runRepoManager(
  target: RepoManagerTarget,
  runner: RepoCommandRunner = runRepoCommand,
): number {
  if (target === "pack") return new Pack(runner).run();
  if (target === "parse-pack-output") {
    throw new Error("parse-pack-output requires an output path");
  }
  return new Validate(runner).run();
}

export function runRepoDirect(
  args: readonly string[],
  runner: RepoCommandRunner = runRepoCommand,
): number {
  const target = parseRepoManagerTarget(args);
  if (target !== "parse-pack-output") return runRepoManager(target, runner);

  const outputPath = args[1];
  if (!outputPath) throw new Error("Pack output path is required");

  console.log(parsePackOutput(readFileSync(outputPath, "utf8")));
  return 0;
}

export function isPreRelease(value: string): value is PreRelease {
  const isKnownPreRelease = preReleases.includes(value as PreRelease);
  return isKnownPreRelease;
}

export function isReleaseIncrement(value: string): value is ReleaseIncrement {
  const isKnownIncrement = releaseIncrements.includes(value as ReleaseIncrement);
  return isKnownIncrement;
}

export function findFlagValue(args: readonly string[], flagName: string): string | undefined {
  const prefix = `${flagName}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  const value = match?.slice(prefix.length);
  return value;
}

export function parseReleaseIncrement(value: string | undefined): ReleaseIncrement | undefined {
  if (!value) return undefined;
  if (isReleaseIncrement(value)) return value;

  throw new Error(`Invalid release increment: ${value}`);
}

export function parsePreRelease(value: string | undefined): PreRelease | undefined {
  if (!value) return undefined;
  if (isPreRelease(value)) return value;

  throw new Error(`Invalid prerelease identifier: ${value}`);
}

export function parseReleaseArgs(args: readonly string[]): ReleaseArgs {
  const argLookup = new Set(args);
  const incrementFlagValue = findFlagValue(args, "--increment");
  const positionalIncrement = args.find(isReleaseIncrement);
  const preReleaseFlagValue = findFlagValue(args, "--preRelease");
  const increment = parseReleaseIncrement(incrementFlagValue ?? positionalIncrement);
  const preRelease = parsePreRelease(preReleaseFlagValue);
  const current = argLookup.has("--current") || argLookup.has("--no-increment");
  const dryRun = argLookup.has("--dry-run");
  const yes = argLookup.has("--yes") || argLookup.has("-y");
  const releaseArgs = { current, dryRun, increment, preRelease, yes };
  return releaseArgs;
}

export function assertValidReleaseArgs(args: ReleaseArgs): void {
  const hasIncrement = args.increment !== undefined;
  const hasPreRelease = args.preRelease !== undefined;
  const hasReleaseMode = args.current || hasIncrement || hasPreRelease;

  if (!hasReleaseMode) {
    throw new Error("Stable releases require an explicit increment: patch, minor, or major");
  }

  const hasCurrentConflict = args.current && (hasIncrement || hasPreRelease);
  if (hasCurrentConflict) {
    throw new Error("Current-version releases cannot include an increment or prerelease");
  }
}

export function buildReleaseItArgs(args: ReleaseArgs): string[] {
  const currentArgs = args.current ? ["--no-increment"] : [];
  const incrementArgs = args.increment ? [`--increment=${args.increment}`] : [];
  const preReleaseArgs = args.preRelease ? [`--preRelease=${args.preRelease}`] : [];
  const releaseItArgs = currentArgs.concat(incrementArgs).concat(preReleaseArgs).concat("--ci");
  return releaseItArgs;
}

export function quoteShellArg(arg: string): string {
  if (safeShellArgPattern.test(arg)) return arg;

  const quotedArg = JSON.stringify(arg);
  return quotedArg;
}

export function formatShellCommand(command: string, args: readonly string[]): string {
  const commandParts = [command].concat(Array.from(args));
  const shellCommand = commandParts.map(quoteShellArg).join(" ");
  return shellCommand;
}

export function parseReleaseVersion(output: string): string {
  const matches = output.match(versionPattern);
  const version = matches?.at(-1);
  if (!version) throw new Error("Unable to resolve release version");

  return version;
}

export function resolveDistTag(version: string): string {
  const prereleaseMatch = version.match(/-(alpha|beta|rc)(?:[.-]\d+)?/);
  const distTag = prereleaseMatch?.[1] ?? "latest";
  return distTag;
}

export function buildPublishQuestion(version: string): string {
  const distTag = resolveDistTag(version);
  const tagName = `v${version}`;
  const question = `Publish ${packageName}@${version} from GitHub Actions trusted publishing? This will push ${tagName} and npm ${distTag} will update if the workflow succeeds. Continue?`;
  return question;
}

export function buildReleasePlan(version: string, args: ReleaseArgs): ReleasePlan {
  const releaseItArgs = buildReleaseItArgs(args);
  const command = formatShellCommand(releaseItBin, releaseItArgs);
  const distTag = resolveDistTag(version);
  const question = buildPublishQuestion(version);
  const tagName = `v${version}`;
  const plan = { command, distTag, question, releaseItArgs, tagName, version };
  return plan;
}

export function formatReleasePlan(plan: ReleasePlan): string {
  const output = [
    `Release plan for ${plan.tagName}`,
    `Version: ${plan.version}`,
    `npm dist-tag: ${plan.distTag}`,
    "",
    "Publish question:",
    plan.question,
    "",
    "Command:",
    `1. ${plan.command}`,
  ].join("\n");
  return output;
}

export function parseConfirmAnswer(answer: string): boolean {
  const normalizedAnswer = answer.trim().toLowerCase();
  const confirmed = normalizedAnswer === "y" || normalizedAnswer === "yes";
  return confirmed;
}

export async function confirmPublish(question: string): Promise<boolean> {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(`${question} [y/N] `);
    const confirmed = parseConfirmAnswer(answer);
    return confirmed;
  } finally {
    prompt.close();
  }
}

export function createRunner(cwd: string): ReleaseRunner {
  const runner: ReleaseRunner = (command, args) => {
    const result = spawnSync(command, Array.from(args), { cwd, encoding: "utf8" });
    const commandResult = {
      status: result.status,
      stderr: result.stderr ?? "",
      stdout: result.stdout ?? "",
    };
    return commandResult;
  };
  return runner;
}

export function commandText(
  runner: ReleaseRunner,
  command: string,
  args: readonly string[],
): string {
  const result = runner(command, args);
  if (result.status === 0) {
    const text = result.stdout.trim();
    return text;
  }

  const fallbackMessage = `${command} ${args.join(" ")} failed`;
  const errorMessage = result.stderr.trim() || fallbackMessage;
  throw new Error(errorMessage);
}

export function runCommand(
  runner: ReleaseRunner,
  command: string,
  args: readonly string[],
): void {
  commandText(runner, command, args);
}

export function assertMainReady(runner: ReleaseRunner): void {
  const branch = commandText(runner, "git", ["branch", "--show-current"]);
  if (branch !== "main") throw new Error("Run releases from main");

  const status = commandText(runner, "git", ["status", "--short"]);
  if (status) throw new Error("Working tree must be clean before starting a release");

  runCommand(runner, "git", ["fetch", "origin", "main", "--tags"]);

  const head = commandText(runner, "git", ["rev-parse", "HEAD"]);
  const upstream = commandText(runner, "git", ["rev-parse", "origin/main"]);
  if (head !== upstream) throw new Error("Local main must match origin/main before release");
}

export function resolveReleaseVersion(
  runner: ReleaseRunner,
  args: ReleaseArgs,
): string {
  const releaseItArgs = buildReleaseItArgs(args);
  const releaseVersionArgs = ["--release-version"].concat(releaseItArgs);
  const output = commandText(runner, releaseItBin, releaseVersionArgs);
  const version = parseReleaseVersion(output);
  return version;
}

export async function confirmReleasePlan(
  plan: ReleasePlan,
  args: ReleaseArgs,
  confirm: ReleaseConfirm,
): Promise<boolean> {
  if (args.dryRun) return true;
  if (args.yes) return true;

  const confirmed = await confirm(plan.question);
  return confirmed;
}

export async function runRelease(options: ReleaseOptions = {}): Promise<number> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const logger = options.logger ?? console;
  const runner = options.runner ?? createRunner(cwd);
  const confirm = options.confirm ?? confirmPublish;
  const args = parseReleaseArgs(options.args ?? process.argv.slice(2));

  assertValidReleaseArgs(args);
  assertMainReady(runner);

  const version = resolveReleaseVersion(runner, args);
  const plan = buildReleasePlan(version, args);

  if (args.dryRun) {
    logger.log(formatReleasePlan(plan));
    return 0;
  }

  const confirmed = await confirmReleasePlan(plan, args, confirm);
  if (!confirmed) {
    logger.warn(`Release aborted before publishing ${plan.tagName}.`);
    return 1;
  }

  runCommand(runner, releaseItBin, plan.releaseItArgs);
  logger.log(`Pushed ${plan.tagName}; GitHub Actions will publish npm dist-tag ${plan.distTag}.`);
  return 0;
}
