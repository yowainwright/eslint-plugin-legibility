import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  buildTestRunPlan,
  isTestRunMode,
  listTestFiles,
  parseTestRunMode,
  remapCoverageSources,
  runTestPlan,
} from "../../scripts/test/index.ts";
import { isDirectRun } from "../../scripts/test/utils.ts";
import type { TestCommandRunner, TestRunPlan } from "../../scripts/test/types.ts";

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "legibility-test-"));
  return directory;
}

test("parses known test run modes", () => {
  assert.equal(isTestRunMode("node-ts"), true);
  assert.equal(isTestRunMode("coverage"), true);
  assert.equal(isTestRunMode("bun-ts"), true);
  assert.equal(isTestRunMode("deno-ts"), true);
  assert.equal(isTestRunMode("unknown"), false);
  assert.equal(parseTestRunMode(["coverage"]), "coverage");
  assert.throws(() => parseTestRunMode([]), /Invalid test run mode/);
});

test("builds test run plans for each runtime", () => {
  const nodeTsPlan = buildTestRunPlan("node-ts");
  const bunPlan = buildTestRunPlan("bun-ts");
  const denoPlan = buildTestRunPlan("deno-ts");
  const coveragePlan = buildTestRunPlan("coverage");

  assert.equal(nodeTsPlan.command, process.execPath);
  assert.deepEqual(nodeTsPlan.args, ["--test"]);
  assert.deepEqual(nodeTsPlan.testDirectories, ["tests/unit", "tests/scripts"]);
  assert.equal(bunPlan.command, "bun");
  assert.deepEqual(bunPlan.args, ["test"]);
  assert.equal(denoPlan.command, "deno");
  assert.deepEqual(denoPlan.args, ["test", "--no-config", "--no-check", "--no-remote"]);
  assert.deepEqual(denoPlan.testDirectories, ["tests/compat"]);
  assert.deepEqual(coveragePlan.testDirectories, ["tests/unit", "tests/scripts"]);
  assert.equal(coveragePlan.coverageFile, "coverage/lcov.info");
});

test("detects direct script execution with resolved file URLs", () => {
  const directory = createTempDirectory();
  const scriptPath = join(directory, "run tests.ts");

  try {
    const scriptUrl = pathToFileURL(scriptPath).href;
    assert.equal(isDirectRun(scriptUrl, scriptPath), true);
    assert.equal(isDirectRun(scriptUrl, undefined), false);
    assert.equal(isDirectRun(scriptUrl, join(directory, "other.ts")), false);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("lists matching test files recursively in sorted order", () => {
  const directory = createTempDirectory();
  const nestedDirectory = join(directory, "nested");

  try {
    mkdirSync(nestedDirectory);
    writeFileSync(join(directory, "z.test.ts"), "");
    writeFileSync(join(directory, "a.ts"), "");
    writeFileSync(join(nestedDirectory, "b.test.ts"), "");

    assert.deepEqual(listTestFiles(directory, ".test.ts"), [
      join(directory, "nested", "b.test.ts"),
      join(directory, "z.test.ts"),
    ]);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("remaps generated coverage source paths", () => {
  const directory = createTempDirectory();
  const coveragePath = join(directory, "lcov.info");

  try {
    writeFileSync(coveragePath, "SF:dist/index.js\nSF:.build/scripts/test/index.js\n");
    remapCoverageSources(coveragePath);
    assert.equal(readFileSync(coveragePath, "utf8"), "SF:src/index.ts\nSF:scripts/test/index.ts\n");
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("runs a test plan with sorted files and remaps passing coverage", () => {
  const directory = createTempDirectory();
  const testDirectory = join(directory, "tests");
  const coveragePath = join(directory, "coverage", "lcov.info");
  let recordedCommand = "";
  let recordedArgs: string[] = [];
  const commandRunner: TestCommandRunner = (command, args) => {
    recordedCommand = command;
    recordedArgs = Array.from(args);
    mkdirSync(dirname(coveragePath), { recursive: true });
    writeFileSync(coveragePath, "SF:dist/constants.js\n");
    return { status: 0 };
  };
  const plan: TestRunPlan = {
    args: ["--test"],
    command: "node",
    coverageFile: coveragePath,
    testDirectories: [testDirectory],
  };

  try {
    mkdirSync(testDirectory, { recursive: true });
    writeFileSync(join(testDirectory, "b.test.ts"), "");
    writeFileSync(join(testDirectory, "a.test.ts"), "");

    assert.equal(runTestPlan(plan, commandRunner), 0);
    assert.equal(recordedCommand, "node");
    assert.deepEqual(recordedArgs, [
      "--test",
      join(testDirectory, "a.test.ts"),
      join(testDirectory, "b.test.ts"),
    ]);
    assert.equal(readFileSync(coveragePath, "utf8"), "SF:src/constants.ts\n");
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("fails when a test plan has no matching files", () => {
  const directory = createTempDirectory();
  const plan: TestRunPlan = {
    args: ["--test"],
    command: "node",
    testDirectories: [directory],
  };

  try {
    assert.throws(() => runTestPlan(plan), /No \.test\.ts files found/);
    assert.equal(existsSync(join(directory, "coverage")), false);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
