import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createHookContent,
  getSkippedHookNames,
  getWrittenHookNames,
  hasManagedHookMarker,
  installHooks,
  isCiEnvironment,
  managedHookMarker,
  planHookInstall,
  shouldRefreshDependencies,
} from "../scripts/install-hooks.ts";

function createTempRepository(): string {
  const directory = mkdtempSync(join(tmpdir(), "legibility-hooks-"));
  const hooksDirectory = join(directory, ".git", "hooks");
  mkdirSync(hooksDirectory, { recursive: true });
  return directory;
}

test("detects CI environments", () => {
  assert.equal(isCiEnvironment({ CI: "true" }), true);
  assert.equal(isCiEnvironment({ CI: "1" }), true);
  assert.equal(isCiEnvironment({ CI: "false" }), false);
  assert.equal(isCiEnvironment({}), false);
});

test("plans managed hook writes without replacing unmanaged hooks", () => {
  const missingHookPlan = planHookInstall("pre-commit", null);
  const managedHookPlan = planHookInstall("pre-commit", `# ${managedHookMarker}\n`);
  const unmanagedHookPlan = planHookInstall("pre-commit", "# user hook\n");

  assert.deepEqual(missingHookPlan, {
    action: "write",
    hookName: "pre-commit",
    reason: "missing",
  });
  assert.deepEqual(managedHookPlan, {
    action: "write",
    hookName: "pre-commit",
    reason: "managed",
  });
  assert.deepEqual(unmanagedHookPlan, {
    action: "skip",
    hookName: "pre-commit",
    reason: "unmanaged",
  });
});

test("groups hook plans by action", () => {
  const plans = [
    { action: "write", hookName: "pre-commit", reason: "missing" },
    { action: "skip", hookName: "post-merge", reason: "unmanaged" },
  ] as const;

  assert.deepEqual(getWrittenHookNames(plans), ["pre-commit"]);
  assert.deepEqual(getSkippedHookNames(plans), ["post-merge"]);
});

test("detects dependency refresh inputs", () => {
  assert.equal(shouldRefreshDependencies(["README.md"]), false);
  assert.equal(shouldRefreshDependencies(["package.json"]), true);
  assert.equal(shouldRefreshDependencies(["pnpm-lock.yaml"]), true);
});

test("creates managed pnpm hooks", () => {
  const preCommitHook = createHookContent("pre-commit");
  const postMergeHook = createHookContent("post-merge");

  assert.equal(hasManagedHookMarker(preCommitHook), true);
  assert.match(preCommitHook, /pnpm validate/);
  assert.equal(hasManagedHookMarker(postMergeHook), true);
  assert.match(postMergeHook, /pnpm install --frozen-lockfile/);
});

test("installs hooks in a git repository and preserves unmanaged hooks", () => {
  const directory = createTempRepository();
  const hooksDirectory = join(directory, ".git", "hooks");
  const unmanagedHookPath = join(hooksDirectory, "post-merge");
  const obsoleteHookPath = join(hooksDirectory, "commit-msg");

  try {
    writeFileSync(unmanagedHookPath, "# user hook\n");
    writeFileSync(obsoleteHookPath, `# ${managedHookMarker}\n`);

    const result = installHooks({ cwd: directory, env: {} });
    const preCommitHook = readFileSync(join(hooksDirectory, "pre-commit"), "utf8");
    const postMergeHook = readFileSync(unmanagedHookPath, "utf8");

    assert.deepEqual(result.written, ["pre-commit"]);
    assert.deepEqual(result.skipped, ["post-merge"]);
    assert.deepEqual(result.removed, ["commit-msg"]);
    assert.match(preCommitHook, /pnpm validate/);
    assert.equal(postMergeHook, "# user hook\n");
    assert.equal(existsSync(obsoleteHookPath), false);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
