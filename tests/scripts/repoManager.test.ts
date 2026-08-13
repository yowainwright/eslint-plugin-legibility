import assert from "node:assert/strict";
import test from "node:test";

import {
  getValidationSteps,
  Pack,
  parseRepoManagerTarget,
  runRepoManager,
  Validate,
} from "../../scripts/repoManager.ts";
import type { RepoCommandRunner } from "../../scripts/types.ts";

test("parses repository manager targets", () => {
  assert.equal(parseRepoManagerTarget(["pack"]), "pack");
  assert.equal(parseRepoManagerTarget(["validate"]), "validate");
  assert.equal(parseRepoManagerTarget(["validate:compat"]), "validate:compat");
  assert.throws(() => parseRepoManagerTarget([]), /Invalid repository manager target/);
});

test("builds default and compatibility validation steps", () => {
  const defaultSteps = getValidationSteps("default");
  const compatSteps = getValidationSteps("compat");

  assert.deepEqual(defaultSteps[3], ["run", "test"]);
  assert.deepEqual(compatSteps[3], ["run", "test:compat"]);
  assert.deepEqual(defaultSteps.at(-1), ["run", "pack:check"]);
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

  assert.equal(new Validate("default", runner).run(), 7);
});

test("runs compatibility validation through the repository manager", () => {
  const runner: RepoCommandRunner = (_command, args) => {
    const isCompatTest = args[1] === "test:compat";
    return { status: isCompatTest ? 5 : 0 };
  };

  assert.equal(runRepoManager("validate:compat", runner), 5);
});
