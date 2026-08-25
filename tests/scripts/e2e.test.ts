import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  buildE2eCleanupPlan,
  buildE2eRunPlan,
  isDirectRun,
  parseE2eMode,
  runE2e,
} from "../../scripts/test/utils.ts";
import type { E2eCommandRunner } from "../../scripts/test/types.ts";

test("parses Docker end-to-end modes", () => {
  assert.equal(parseE2eMode(["test"]), "test");
  assert.equal(parseE2eMode(["benchmark"]), "benchmark");
  assert.throws(() => parseE2eMode([]), /Invalid end-to-end mode/);
});

test("builds Docker Compose run plans", () => {
  const testPlan = buildE2eRunPlan("test");
  const benchmarkPlan = buildE2eRunPlan("benchmark");
  const commonArgs = ["compose", "-f", "tests/e2e/docker/compose.yml", "run", "--build", "--rm"];

  assert.equal(testPlan.command, "docker");
  assert.deepEqual(testPlan.args, commonArgs.concat("test"));
  assert.deepEqual(benchmarkPlan.args, commonArgs.concat("benchmark"));
});

test("builds a scoped Docker Compose cleanup plan", () => {
  const cleanupPlan = buildE2eCleanupPlan();

  assert.equal(cleanupPlan.command, "docker");
  assert.deepEqual(cleanupPlan.args, [
    "compose",
    "-f",
    "tests/e2e/docker/compose.yml",
    "down",
    "--volumes",
    "--remove-orphans",
    "--rmi",
    "all",
  ]);
});

test("cleans Docker resources after a failed end-to-end run", () => {
  const calls: string[][] = [];
  const runner: E2eCommandRunner = (command, args) => {
    assert.equal(command, "docker");
    calls.push(Array.from(args));
    const isCleanup = args.includes("down");
    return { status: isCleanup ? 0 : 7 };
  };

  assert.equal(runE2e("test", runner), 7);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.includes("run"), true);
  assert.equal(calls[1]?.includes("down"), true);
});

test("returns a cleanup failure after a successful run", () => {
  const runner: E2eCommandRunner = (_command, args) => {
    const isCleanup = args.includes("down");
    return { status: isCleanup ? 9 : 0 };
  };

  assert.equal(runE2e("benchmark", runner), 9);
});

test("cleans Docker resources when the runner throws", () => {
  let callCount = 0;
  const runner: E2eCommandRunner = () => {
    callCount += 1;
    if (callCount === 1) throw new Error("Docker failed");
    return { status: 0 };
  };

  assert.throws(() => runE2e("test", runner), /Docker failed/);
  assert.equal(callCount, 2);
});

test("detects direct Docker runner execution", () => {
  const scriptPath = resolve("scripts/test/utils.ts");
  const scriptUrl = pathToFileURL(scriptPath).href;

  assert.equal(isDirectRun(scriptUrl, scriptPath), true);
  assert.equal(isDirectRun(scriptUrl, undefined), false);
});
