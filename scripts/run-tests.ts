import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestRunMode, TestRunPlan } from "./types.ts";

const testRunModes = new Set<TestRunMode>(["bun-ts", "coverage", "node-js", "node-ts"]);
const coverageFile = "coverage/lcov.info";

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
  const remappedCoverage = coverage.replace(/^SF:dist\/(.*)\.js$/gm, "SF:src/$1.ts");
  writeFileSync(path, remappedCoverage);
}

export function runTests(mode: TestRunMode): number {
  const plan = buildTestRunPlan(mode);
  const usesCompiledTests = mode === "coverage" || mode === "node-js";
  const extension = usesCompiledTests ? ".test.js" : ".test.ts";
  const testFiles = listTestFiles(plan.testDirectory, extension);
  if (testFiles.length === 0) {
    throw new Error(`No ${extension} files found in ${plan.testDirectory}`);
  }

  if (plan.coverageFile) {
    mkdirSync("coverage", { recursive: true });
  }

  const result = spawnSync(plan.command, plan.args.concat(testFiles), { stdio: "inherit" });
  const status = result.status ?? 1;
  const passed = status === 0;
  const coveragePath = plan.coverageFile;
  const shouldRemapCoverage = passed && coveragePath !== undefined;
  if (shouldRemapCoverage) {
    remapCoverageSources(coveragePath);
  }

  return status;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const mode = parseTestRunMode(process.argv.slice(2));
    process.exitCode = runTests(mode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
