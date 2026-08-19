import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type {
  RepoCommandResult,
  RepoCommandRunner,
  RepoManagerTarget,
} from "./types.ts";

const packArgs = ["pack", "--json", "--pack-destination", "./.npm-cache"];
const repoManagerTargets: ReadonlySet<string> = new Set([
  "pack",
  "parse-pack-output",
  "validate",
]);
const validationStart = [
  ["run", "typecheck"],
  ["run", "typecheck:strict"],
  ["run", "type-coverage"],
];
const validationEnd = [
  ["run", "lint"],
  ["run", "lint:oxlint"],
  ["run", "pack:check"],
];

const runCommand: RepoCommandRunner = (command, args) =>
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
      if (filename.length > 0) return filename;
    } catch {
      continue;
    }
  }

  throw new Error("Pack JSON output not found");
}

export class Pack {
  private readonly runner: RepoCommandRunner;

  constructor(runner: RepoCommandRunner = runCommand) {
    this.runner = runner;
  }

  run(): number {
    return getCommandStatus(this.runner("nub", packArgs));
  }
}

export class Validate {
  private readonly runner: RepoCommandRunner;

  constructor(runner: RepoCommandRunner = runCommand) {
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
  runner: RepoCommandRunner = runCommand,
): number {
  if (target === "pack") return new Pack(runner).run();
  if (target === "parse-pack-output") {
    throw new Error("parse-pack-output requires an output path");
  }
  return new Validate(runner).run();
}

export function runDirect(
  args: readonly string[],
  runner: RepoCommandRunner = runCommand,
): number {
  const target = parseRepoManagerTarget(args);
  if (target !== "parse-pack-output") return runRepoManager(target, runner);

  const outputPath = args[1];
  if (!outputPath) throw new Error("Pack output path is required");

  console.log(parsePackOutput(readFileSync(outputPath, "utf8")));
  return 0;
}

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;
  const argvUrl = pathToFileURL(resolve(argvPath)).href;
  return argvUrl === metaUrl;
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  try {
    process.exitCode = runDirect(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
