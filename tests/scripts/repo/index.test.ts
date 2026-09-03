import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getOxlintFixtureConfigs } from "../../../tests/fixtures/oxlint/configs.ts";
import { buildOxlintFixtureConfigs } from "../../../scripts/repo/index.ts";
import {
  getValidationSteps,
  Pack,
  parsePackOutput,
  parseRepoManagerTarget,
  preserveExitCode,
  runRepoDirect,
  runRepoManager,
  Validate,
} from "../../../scripts/repo/utils.ts";
import type { RepoCommandRunner } from "../../../scripts/repo/types.ts";

test("parses repository manager targets", () => {
  assert.equal(parseRepoManagerTarget(["pack"]), "pack");
  assert.equal(parseRepoManagerTarget(["parse-pack-output"]), "parse-pack-output");
  assert.equal(parseRepoManagerTarget(["validate"]), "validate");
  assert.throws(() => parseRepoManagerTarget([]), /Invalid repository manager target/);
});

test("parses Nub pack output after ANSI build logs", () => {
  const output = "\u001b[34mCLI Building entry: src/index.ts\u001b[39m\n[\n  {\n    \"filename\": \"package.tgz\"\n  }\n]";

  assert.equal(parsePackOutput(output), "package.tgz");
});

test("parses object pack output", () => {
  const output = '{"filename":"/home/runner/work/package/./.npm-cache/package.tgz"}';

  assert.equal(parsePackOutput(output), "/home/runner/work/package/.npm-cache/package.tgz");
});

test("rejects pack output without a filename", () => {
  assert.throws(() => parsePackOutput('{"filename":123}'), /Pack JSON output not found/);
  assert.throws(() => parsePackOutput('{"filename":""}'), /Pack JSON output not found/);
  assert.throws(() => parsePackOutput("not JSON"), /Pack JSON output not found/);
});

test("builds validation steps", () => {
  const steps = getValidationSteps();

  assert.deepEqual(steps[3], ["run", "test"]);
  assert.deepEqual(steps.at(-1), ["run", "pack:check"]);
});

test("generates Oxlint fixture configs", () => {
  const root = join("tests/.test-fixtures", "oxlint-generated");
  const configs = getOxlintFixtureConfigs();
  const directories = configs.map((config) => config.directory);

  assert.deepEqual(directories, ["default", "recommended", "strict", "opt-in"]);

  try {
    buildOxlintFixtureConfigs(root);

    configs.forEach((config) => {
      const path = join(root, config.directory, "oxlint.config.mjs");
      assert.equal(readFileSync(path, "utf8"), config.content);
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("Pack runs Nub pack with the repository cache destination", () => {
  const runner: RepoCommandRunner = (command, args) => {
    assert.equal(command, "nub");
    assert.deepEqual(args, ["pack", "--json", "--pack-destination", "./.npm-cache"]);
    return { status: 0 };
  };

  assert.equal(new Pack(runner).run(), 0);
});

test("Validate stops on the first failed Nub step", () => {
  const runner: RepoCommandRunner = (_command, args) => {
    const isTestStep = args[1] === "test";
    return { status: isTestStep ? 7 : 0 };
  };

  assert.equal(new Validate(runner).run(), 7);
  assert.equal(runRepoManager("validate", runner), 7);
});

test("requires an output path for the pack parser target", () => {
  assert.throws(
    () => runRepoManager("parse-pack-output"),
    /parse-pack-output requires an output path/,
  );
});

test("runs the pack target directly", () => {
  const directory = mkdtempSync(join(tmpdir(), "legibility-repo-manager-"));
  const outputPath = join(directory, "npm-pack.json");

  try {
    writeFileSync(outputPath, '{"filename":"package.tgz"}');
    const runner: RepoCommandRunner = (command, args) => {
      assert.equal(command, "nub");
      assert.deepEqual(args, ["pack", "--json", "--pack-destination", "./.npm-cache"]);
      return { status: 0 };
    };

    assert.equal(runRepoDirect(["pack"], runner), 0);
    assert.equal(runRepoDirect(["parse-pack-output", outputPath]), 0);
    assert.throws(() => runRepoDirect(["parse-pack-output"]), /Pack output path is required/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("preserves a recorded failure over a successful CLI result", () => {
  const originalExitCode = process.exitCode;

  try {
    process.exitCode = 17;
    assert.equal(preserveExitCode(0), 17);

    process.exitCode = 0;
    assert.equal(preserveExitCode(9), 9);
  } finally {
    process.exitCode = originalExitCode;
  }
});
