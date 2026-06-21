import { spawnSync } from "node:child_process";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  PreRelease,
  ReleaseArgs,
  ReleaseConfirm,
  ReleaseIncrement,
  ReleaseOptions,
  ReleasePlan,
  ReleaseRunner,
} from "./types.ts";

const packageName = "eslint-plugin-legibility";
const releaseItBin = "./node_modules/.bin/release-it";
const preReleases = ["alpha", "beta", "rc"] as const satisfies readonly PreRelease[];
const releaseIncrements = ["patch", "minor", "major"] as const satisfies readonly ReleaseIncrement[];
const safeShellArgPattern = /^[A-Za-z0-9_./:=@-]+$/;
const versionPattern = /\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/g;

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

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;

  const argvUrl = pathToFileURL(resolve(argvPath)).href;
  const isDirect = argvUrl === metaUrl;
  return isDirect;
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  try {
    process.exitCode = await runRelease();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
