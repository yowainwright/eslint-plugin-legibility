import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("runs the repository manager parser as a direct script", async () => {
  const directory = mkdtempSync(join(tmpdir(), "legibility-repo-manager-direct-"));
  const outputPath = join(directory, "npm-pack.json");
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;

  try {
    writeFileSync(outputPath, '{"filename":"package.tgz"}');
    process.argv = [process.argv[0], resolve("scripts/repo/index.ts"), "parse-pack-output", outputPath];
    process.exitCode = undefined;

    await import("../../scripts/repo/index.ts");

    assert.equal(process.exitCode, 0);
  } finally {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    rmSync(directory, { force: true, recursive: true });
  }
});
