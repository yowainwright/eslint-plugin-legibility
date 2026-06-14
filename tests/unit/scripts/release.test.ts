import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReleaseItArgs,
  buildReleasePlan,
  formatReleasePlan,
  parseConfirmAnswer,
  parseReleaseArgs,
  resolveDistTag,
  runRelease,
} from "../../../scripts/release.ts";
import type { ReleaseCommandResult, ReleaseRunner } from "../../../scripts/types.ts";

interface MockRunner {
  calls: string[];
  runner: ReleaseRunner;
}

interface MockLogger {
  errors: string[];
  logs: string[];
  logger: ConsoleLike;
  warnings: string[];
}

type ConsoleLike = Pick<Console, "error" | "log" | "warn">;

function ok(stdout = ""): ReleaseCommandResult {
  const result = { status: 0, stderr: "", stdout };
  return result;
}

function fail(stderr: string): ReleaseCommandResult {
  const result = { status: 1, stderr, stdout: "" };
  return result;
}

function commandKey(command: string, args: readonly string[]): string {
  const key = [command, ...args].join(" ");
  return key;
}

function createMockRunner(responses: Record<string, ReleaseCommandResult>): MockRunner {
  const calls: string[] = [];
  const runner: ReleaseRunner = (command, args) => {
    const key = commandKey(command, args);
    calls.push(key);
    const response = responses[key] ?? fail(`Unexpected command: ${key}`);
    return response;
  };
  return { calls, runner };
}

function createReadyResponses(versionOutput: string): Record<string, ReleaseCommandResult> {
  const responses = {
    "./node_modules/.bin/release-it --increment=patch --ci": ok("released"),
    "./node_modules/.bin/release-it --release-version --increment=patch --ci": ok(versionOutput),
    "git branch --show-current": ok("main\n"),
    "git fetch origin main --tags": ok(),
    "git rev-parse HEAD": ok("abc123\n"),
    "git rev-parse origin/main": ok("abc123\n"),
    "git status --short": ok(),
  };
  return responses;
}

function createMockLogger(): MockLogger {
  const errors: string[] = [];
  const logs: string[] = [];
  const warnings: string[] = [];
  const logger = {
    error: (message?: unknown) => {
      errors.push(String(message));
    },
    log: (message?: unknown) => {
      logs.push(String(message));
    },
    warn: (message?: unknown) => {
      warnings.push(String(message));
    },
  };
  return { errors, logger, logs, warnings };
}

test("parseReleaseArgs reads release mode flags", () => {
  const args = parseReleaseArgs(["minor", "--dry-run", "--yes"]);

  assert.deepEqual(args, {
    current: false,
    dryRun: true,
    increment: "minor",
    preRelease: undefined,
    yes: true,
  });
});

test("buildReleaseItArgs uses noninteractive release-it args", () => {
  const args = parseReleaseArgs(["--preRelease=beta"]);
  const releaseItArgs = buildReleaseItArgs(args);

  assert.deepEqual(releaseItArgs, ["--preRelease=beta", "--ci"]);
});

test("buildReleasePlan includes the publish confirmation question", () => {
  const args = parseReleaseArgs(["patch"]);
  const plan = buildReleasePlan("0.1.10", args);

  assert.equal(plan.command, "./node_modules/.bin/release-it --increment=patch --ci");
  assert.equal(plan.distTag, "latest");
  assert.equal(plan.tagName, "v0.1.10");
  assert.equal(
    plan.question,
    "Publish eslint-plugin-legibility@0.1.10 from GitHub Actions trusted publishing? This will push v0.1.10 and npm latest will update if the workflow succeeds. Continue?",
  );
});

test("resolveDistTag maps prereleases to npm dist-tags", () => {
  assert.equal(resolveDistTag("1.2.3"), "latest");
  assert.equal(resolveDistTag("1.2.3-alpha.1"), "alpha");
  assert.equal(resolveDistTag("1.2.3-beta.4"), "beta");
  assert.equal(resolveDistTag("1.2.3-rc.0"), "rc");
});

test("parseConfirmAnswer only accepts yes answers", () => {
  assert.equal(parseConfirmAnswer("y"), true);
  assert.equal(parseConfirmAnswer("yes"), true);
  assert.equal(parseConfirmAnswer(""), false);
  assert.equal(parseConfirmAnswer("no"), false);
});

test("formatReleasePlan prints the publish question and release command", () => {
  const args = parseReleaseArgs(["patch"]);
  const plan = buildReleasePlan("0.1.10", args);
  const output = formatReleasePlan(plan);

  assert.match(output, /Release plan for v0\.1\.10/);
  assert.match(output, /Publish question:/);
  assert.match(output, /npm latest will update/);
  assert.match(output, /release-it --increment=patch --ci/);
});

test("runRelease dry run prints the plan without publishing", async () => {
  const { calls, runner } = createMockRunner(
    createReadyResponses("Let's release eslint-plugin-legibility (0.1.9...0.1.10)"),
  );
  const { logger, logs } = createMockLogger();

  const result = await runRelease({
    args: ["patch", "--dry-run"],
    confirm: async () => false,
    logger,
    runner,
  });

  assert.equal(result, 0);
  assert.equal(calls.includes("./node_modules/.bin/release-it --increment=patch --ci"), false);
  assert.match(logs.join("\n"), /Publish eslint-plugin-legibility@0\.1\.10/);
});

test("runRelease aborts before release-it when confirmation is declined", async () => {
  const { calls, runner } = createMockRunner(
    createReadyResponses("Let's release eslint-plugin-legibility (0.1.9...0.1.10)"),
  );
  const { logger, warnings } = createMockLogger();

  const result = await runRelease({
    args: ["patch"],
    confirm: async () => false,
    logger,
    runner,
  });

  assert.equal(result, 1);
  assert.equal(calls.includes("./node_modules/.bin/release-it --increment=patch --ci"), false);
  assert.match(warnings.join("\n"), /Release aborted before publishing v0\.1\.10/);
});

test("runRelease runs release-it after confirmation", async () => {
  let publishQuestion = "";
  const { calls, runner } = createMockRunner(
    createReadyResponses("Let's release eslint-plugin-legibility (0.1.9...0.1.10)"),
  );
  const { logger, logs } = createMockLogger();

  const result = await runRelease({
    args: ["patch"],
    confirm: async (question) => {
      publishQuestion = question;
      return true;
    },
    logger,
    runner,
  });

  assert.equal(result, 0);
  assert.match(publishQuestion, /Continue\?/);
  assert.equal(calls.includes("./node_modules/.bin/release-it --increment=patch --ci"), true);
  assert.match(logs.join("\n"), /GitHub Actions will publish npm dist-tag latest/);
});

test("runRelease skips confirmation with --yes", async () => {
  const { calls, runner } = createMockRunner(
    createReadyResponses("Let's release eslint-plugin-legibility (0.1.9...0.1.10)"),
  );
  const { logger } = createMockLogger();

  const result = await runRelease({
    args: ["patch", "--yes"],
    confirm: async () => {
      throw new Error("confirm should not run");
    },
    logger,
    runner,
  });

  assert.equal(result, 0);
  assert.equal(calls.includes("./node_modules/.bin/release-it --increment=patch --ci"), true);
});

test("runRelease requires main", async () => {
  const { runner } = createMockRunner({
    "git branch --show-current": ok("cont-work\n"),
  });
  const { logger } = createMockLogger();

  await assert.rejects(
    runRelease({ args: ["patch"], logger, runner }),
    /Run releases from main/,
  );
});
