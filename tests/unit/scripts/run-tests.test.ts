import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  buildTestRunPlan,
  getTestFileExtension,
  isDirectRun,
  isTestRunMode,
  listTestFiles,
  parseTestRunMode,
  remapCoverageSources,
  runTestPlan,
} from "../../../scripts/run-tests.ts";
import type { TestCommandRunner, TestRunPlan } from "../../../scripts/types.ts";

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "legibility-run-tests-"));
  return directory;
}

test("parses known test run modes", () => {
  assert.equal(isTestRunMode("node-ts"), true);
  assert.equal(isTestRunMode("node-js"), true);
  assert.equal(isTestRunMode("coverage"), true);
  assert.equal(isTestRunMode("bun-ts"), true);
  assert.equal(isTestRunMode("unknown"), false);
  assert.equal(parseTestRunMode(["coverage"]), "coverage");
  assert.throws(() => parseTestRunMode([]), /Invalid test run mode/);
});

test("builds test run plans for each runtime", () => {
  const nodeTsPlan = buildTestRunPlan("node-ts");
  const nodeJsPlan = buildTestRunPlan("node-js");
  const bunPlan = buildTestRunPlan("bun-ts");
  const coveragePlan = buildTestRunPlan("coverage");

  assert.equal(nodeTsPlan.command, process.execPath);
  assert.deepEqual(nodeTsPlan.args, ["--test"]);
  assert.equal(nodeTsPlan.testDirectory, "tests/unit");
  assert.equal(nodeJsPlan.testDirectory, ".build/tests/unit");
  assert.equal(bunPlan.command, "bun");
  assert.deepEqual(bunPlan.args, ["test"]);
  assert.equal(coveragePlan.testDirectory, ".build/tests/unit");
  assert.equal(coveragePlan.coverageFile, "coverage/lcov.info");
});

test("selects extensions for source and compiled tests", () => {
  assert.equal(getTestFileExtension("node-ts"), ".test.ts");
  assert.equal(getTestFileExtension("bun-ts"), ".test.ts");
  assert.equal(getTestFileExtension("node-js"), ".test.js");
  assert.equal(getTestFileExtension("coverage"), ".test.js");
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
    writeFileSync(join(directory, "z.test.js"), "");
    writeFileSync(join(directory, "a.test.ts"), "");
    writeFileSync(join(nestedDirectory, "b.test.js"), "");

    assert.deepEqual(listTestFiles(directory, ".test.js"), [
      join(directory, "nested", "b.test.js"),
      join(directory, "z.test.js"),
    ]);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("remaps generated coverage source paths", () => {
  const directory = createTempDirectory();
  const coveragePath = join(directory, "lcov.info");

  try {
    writeFileSync(coveragePath, "SF:dist/index.js\nSF:.build/scripts/run-tests.js\n");
    remapCoverageSources(coveragePath);
    assert.equal(readFileSync(coveragePath, "utf8"), "SF:src/index.ts\nSF:scripts/run-tests.ts\n");
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
    testDirectory,
  };

  try {
    mkdirSync(testDirectory, { recursive: true });
    writeFileSync(join(testDirectory, "b.test.js"), "");
    writeFileSync(join(testDirectory, "a.test.js"), "");

    assert.equal(runTestPlan(plan, ".test.js", commandRunner), 0);
    assert.equal(recordedCommand, "node");
    assert.deepEqual(recordedArgs, [
      "--test",
      join(testDirectory, "a.test.js"),
      join(testDirectory, "b.test.js"),
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
    testDirectory: directory,
  };

  try {
    assert.throws(() => runTestPlan(plan, ".test.js"), /No \.test\.js files found/);
    assert.equal(existsSync(join(directory, "coverage")), false);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
