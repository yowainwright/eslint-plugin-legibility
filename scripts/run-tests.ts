import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TestCommandRunner, TestRunMode, TestRunPlan } from "./types.ts";

const testRunModes = new Set<TestRunMode>(["bun-ts", "coverage", "deno-ts", "node-js", "node-ts"]);
const coverageFile = "coverage/lcov.info";
const runTestCommand: TestCommandRunner = (command, args) =>
  spawnSync(command, Array.from(args), { stdio: "inherit" });

export function isTestRunMode(value: string | undefined): value is TestRunMode {
  if (value === undefined) return false;

  const isKnownMode = testRunModes.has(value as TestRunMode);
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
    return { command: "bun", args: ["test"], testDirectory: "tests/unit" };
  }

  if (mode === "deno-ts") {
    return {
      command: "deno",
      args: ["test", "--no-config", "--no-check", "--no-remote"],
      testDirectory: "tests/compat",
    };
  }

  if (mode === "node-js") {
    return { command: process.execPath, args: ["--test"], testDirectory: ".build/tests/unit" };
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
      testDirectory: ".build/tests/unit",
    };
  }

  return { command: process.execPath, args: ["--test"], testDirectory: "tests/unit" };
}

export function remapCoverageSources(path: string): void {
  const coverage = readFileSync(path, "utf8");
  const remappedCoverage = coverage
    .replace(/^SF:dist\/(.*)\.js$/gm, "SF:src/$1.ts")
    .replace(/^SF:\.build\/scripts\/(.*)\.js$/gm, "SF:scripts/$1.ts");
  writeFileSync(path, remappedCoverage);
}

export function getTestFileExtension(mode: TestRunMode): ".test.js" | ".test.ts" {
  const usesCompiledTests = mode === "coverage" || mode === "node-js";
  const extension = usesCompiledTests ? ".test.js" : ".test.ts";
  return extension;
}

export function runTestPlan(
  plan: TestRunPlan,
  extension: ".test.js" | ".test.ts",
  commandRunner: TestCommandRunner = runTestCommand,
): number {
  const testFiles = listTestFiles(plan.testDirectory, extension);
  if (testFiles.length === 0) {
    throw new Error(`No ${extension} files found in ${plan.testDirectory}`);
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
  const extension = getTestFileExtension(mode);
  const status = runTestPlan(plan, extension);
  return status;
}

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;

  const argvUrl = pathToFileURL(resolve(argvPath)).href;
  const isDirect = argvUrl === metaUrl;
  return isDirect;
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  try {
    const mode = parseTestRunMode(process.argv.slice(2));
    process.exitCode = runTests(mode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
