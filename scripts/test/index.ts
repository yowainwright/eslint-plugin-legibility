import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  coverageFile,
  testFileExtension,
  testModes,
} from "./constants.ts";
import {
  isDirectRun,
  parseE2eMode,
  runE2e,
} from "./utils.ts";
import type { TestCommandRunner, TestRunMode, TestRunPlan } from "./types.ts";

const runTestCommand: TestCommandRunner = (command, args) =>
  spawnSync(command, Array.from(args), { stdio: "inherit" });

export function isTestRunMode(value: string | undefined): value is TestRunMode {
  if (value === undefined) return false;

  const isKnownMode = testModes.has(value as TestRunMode);
  return isKnownMode;
}

export function parseTestRunMode(args: readonly string[]): TestRunMode {
  const mode = args[0];
  if (isTestRunMode(mode)) return mode;

  throw new Error(`Invalid test run mode: ${mode ?? "(missing)"}`);
}

export function listTestFiles(directory: string, extension: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listTestFiles(entryPath, extension);

    const isMatchingFile = entry.isFile() && entryPath.endsWith(extension);
    if (isMatchingFile) return [entryPath];

    return [];
  });
  const sortedFiles = files.toSorted();
  return sortedFiles;
}

export function buildTestRunPlan(mode: TestRunMode): TestRunPlan {
  if (mode === "bun-ts") {
    return { command: "bun", args: ["test"], testDirectories: ["tests/unit", "tests/scripts"] };
  }

  if (mode === "deno-ts") {
    return {
      command: "deno",
      args: ["test", "--no-config", "--no-check", "--no-remote"],
      testDirectories: ["tests/compat"],
    };
  }

  if (mode === "coverage") {
    return {
      command: process.execPath,
      args: [
        "--test",
        "--experimental-test-coverage",
        "--test-reporter=lcov",
        `--test-reporter-destination=${coverageFile}`,
      ],
      coverageFile,
      testDirectories: ["tests/unit", "tests/scripts"],
    };
  }

  return {
    command: process.execPath,
    args: ["--test"],
    testDirectories: ["tests/unit", "tests/scripts"],
  };
}

export function remapCoverageSources(path: string): void {
  const coverage = readFileSync(path, "utf8");
  const remappedCoverage = coverage
    .replace(/^SF:dist\/(.*)\.js$/gm, "SF:src/$1.ts")
    .replace(/^SF:\.build\/scripts\/(.*)\.js$/gm, "SF:scripts/$1.ts");
  writeFileSync(path, remappedCoverage);
}

export function runTestPlan(
  plan: TestRunPlan,
  commandRunner: TestCommandRunner = runTestCommand,
): number {
  const testFiles = plan.testDirectories.flatMap((directory) =>
    listTestFiles(directory, testFileExtension),
  );
  if (testFiles.length === 0) {
    throw new Error(`No ${testFileExtension} files found in ${plan.testDirectories.join(", ")}`);
  }

  const coveragePath = plan.coverageFile;
  if (coveragePath) {
    mkdirSync(dirname(coveragePath), { recursive: true });
  }

  const result = commandRunner(plan.command, plan.args.concat(testFiles));
  const status = result.status ?? 1;
  const passed = status === 0;
  const shouldRemapCoverage = passed && coveragePath !== undefined;
  if (shouldRemapCoverage) {
    remapCoverageSources(coveragePath);
  }

  return status;
}

export function runTests(mode: TestRunMode): number {
  const plan = buildTestRunPlan(mode);
  const status = runTestPlan(plan);
  return status;
}

function runTestCli(args: readonly string[]): void {
  try {
    const mode = parseTestRunMode(args);
    process.exitCode = runTests(mode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function runE2eCli(args: readonly string[]): void {
  try {
    process.exitCode = runE2e(parseE2eMode(args));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

function runCli(args: readonly string[]): void {
  const isE2e = args[0] === "e2e";
  if (isE2e) return runE2eCli(args.slice(1));

  runTestCli(args);
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  runCli(process.argv.slice(2));
}
