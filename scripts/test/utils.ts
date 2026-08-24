import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { composeFile, e2eModes } from "./constants.ts";
import type { E2eCommandRunner, E2eMode, E2eRunPlan } from "./types.ts";

const runCommand: E2eCommandRunner = (command, args) =>
  spawnSync(command, Array.from(args), { stdio: "inherit" });

export function parseE2eMode(args: readonly string[]): E2eMode {
  const mode = args[0] as E2eMode | undefined;
  const isKnownMode = mode !== undefined && e2eModes.has(mode);
  if (isKnownMode) return mode;
  throw new Error(`Invalid end-to-end mode: ${mode ?? "(missing)"}`);
}

export function buildE2eRunPlan(mode: E2eMode): E2eRunPlan {
  const args = ["compose", "-f", composeFile, "run", "--build", "--rm", mode];
  return { args, command: "docker" };
}

export function buildE2eCleanupPlan(): E2eRunPlan {
  const args = [
    "compose",
    "-f",
    composeFile,
    "down",
    "--volumes",
    "--remove-orphans",
    "--rmi",
    "all",
  ];
  return { args, command: "docker" };
}

export function runE2e(
  mode: E2eMode,
  runner: E2eCommandRunner = runCommand,
): number {
  const plan = buildE2eRunPlan(mode);
  const cleanupPlan = buildE2eCleanupPlan();
  let runStatus = 1;
  let cleanupStatus = 1;

  try {
    runStatus = runner(plan.command, plan.args).status ?? 1;
  } finally {
    cleanupStatus = runner(cleanupPlan.command, cleanupPlan.args).status ?? 1;
  }

  if (runStatus !== 0) return runStatus;
  return cleanupStatus;
}

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
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
