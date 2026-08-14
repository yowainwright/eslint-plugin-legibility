import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type {
  RepoCommandResult,
  RepoCommandRunner,
  RepoManagerTarget,
} from "./types.ts";

const packArgs = ["pack", "--json", "--pack-destination", "./.npm-cache"];
const repoManagerTargets: ReadonlySet<string> = new Set(["pack", "validate"]);
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
  return new Validate(runner).run();
}

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;
  const argvUrl = pathToFileURL(resolve(argvPath)).href;
  return argvUrl === metaUrl;
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  try {
    const target = parseRepoManagerTarget(process.argv.slice(2));
    process.exitCode = runRepoManager(target);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
