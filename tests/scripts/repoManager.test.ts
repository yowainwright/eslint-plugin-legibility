import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  getValidationSteps,
  Pack,
  parsePackOutput,
  parseRepoManagerTarget,
  runDirect,
  runRepoManager,
  Validate,
} from "../../scripts/repoManager.ts";
import type { RepoCommandRunner } from "../../scripts/types.ts";

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

    assert.equal(runDirect(["pack"], runner), 0);
    assert.equal(runDirect(["parse-pack-output", outputPath]), 0);
    assert.throws(() => runDirect(["parse-pack-output"]), /Pack output path is required/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
