import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const hooksPath = join(process.cwd(), "scripts", "hooks.sh");
const managedHookMarker = "legibility-managed-hook";

function createTempDirectory(): string {
  return mkdtempSync(join(tmpdir(), "legibility-hooks-"));
}

function createTempRepository(): string {
  const directory = createTempDirectory();
  const result = spawnSync("git", ["init", "--quiet", directory], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return directory;
}

function getHookPath(directory: string, hookName: string): string {
  return join(directory, ".git", "hooks", hookName);
}

function runHooksScript(directory: string, ci = "") {
  const env = { ...process.env, CI: ci };
  return spawnSync("sh", [hooksPath], { cwd: directory, encoding: "utf8", env });
}

function assertSuccessfulRun(directory: string, ci = ""): void {
  const result = runHooksScript(directory, ci);
  assert.equal(result.status, 0, result.stderr);
}

test("skips CI and directories without git metadata", () => {
  const ciRepository = createTempRepository();
  const nonRepository = createTempDirectory();

  try {
    assertSuccessfulRun(ciRepository, "true");
    assertSuccessfulRun(nonRepository);
    assert.equal(existsSync(getHookPath(ciRepository, "pre-commit")), false);
    assert.equal(existsSync(join(nonRepository, ".git")), false);
  } finally {
    rmSync(ciRepository, { force: true, recursive: true });
    rmSync(nonRepository, { force: true, recursive: true });
  }
});

test("installs executable managed hooks", () => {
  const directory = createTempRepository();
  const preCommitPath = getHookPath(directory, "pre-commit");
  const postMergePath = getHookPath(directory, "post-merge");

  try {
    assertSuccessfulRun(directory);

    const preCommitHook = readFileSync(preCommitPath, "utf8");
    const postMergeHook = readFileSync(postMergePath, "utf8");
    assert.match(preCommitHook, new RegExp(managedHookMarker));
    assert.match(preCommitHook, /pnpm validate/);
    assert.match(postMergeHook, new RegExp(managedHookMarker));
    assert.match(postMergeHook, /pnpm install --frozen-lockfile/);
    assert.equal(statSync(preCommitPath).mode & 0o111, 0o111);
    assert.equal(statSync(postMergePath).mode & 0o111, 0o111);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("updates managed hooks and preserves unmanaged hooks", () => {
  const directory = createTempRepository();
  const preCommitPath = getHookPath(directory, "pre-commit");
  const postMergePath = getHookPath(directory, "post-merge");
  const obsoleteHookPath = getHookPath(directory, "commit-msg");

  try {
    writeFileSync(preCommitPath, `# ${managedHookMarker}\nstale\n`);
    writeFileSync(postMergePath, "# user hook\n");
    writeFileSync(obsoleteHookPath, `# ${managedHookMarker}\n`);
    assertSuccessfulRun(directory);

    assert.doesNotMatch(readFileSync(preCommitPath, "utf8"), /stale/);
    assert.equal(readFileSync(postMergePath, "utf8"), "# user hook\n");
    assert.equal(existsSync(obsoleteHookPath), false);

    writeFileSync(obsoleteHookPath, "# user hook\n");
    assertSuccessfulRun(directory);
    assert.equal(readFileSync(obsoleteHookPath, "utf8"), "# user hook\n");
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
