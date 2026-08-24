import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const installRoot = mkdtempSync(join("/tmp", "legibility-install-"));
const installBin = resolve("node_modules/.bin/eslint-plugin-legibility-install-skill");

try {
  const result = spawnSync(
    installBin,
    ["--target", "agents", "--path", installRoot],
    { encoding: "utf8" },
  );
  const errorMessage = result.error?.message ?? result.stderr;
  const skillPath = join(installRoot, "eslint-plugin-legibility", "SKILL.md");

  assert.equal(result.status, 0, errorMessage);
  assert.equal(existsSync(skillPath), true);
  process.stdout.write("PASS package install bin symlink\n");
} finally {
  rmSync(installRoot, { force: true, recursive: true });
}
