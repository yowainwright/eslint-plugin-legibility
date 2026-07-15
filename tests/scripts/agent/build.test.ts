import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createAgentArtifact,
  parseBuildTargets,
  renderAgentSkill,
  writeAgentArtifacts,
} from "../../../scripts/agent/build.ts";

function createTempDirectory(): string {
  return mkdtempSync(join(tmpdir(), "legibility-agent-build-"));
}

test("renders a Codex-compatible skill", () => {
  const skill = renderAgentSkill();

  assert.match(skill, /^---\nname: eslint-plugin-legibility/m);
  assert.match(skill, /description: >/);
  assert.match(skill, /npx lint-changed/);
  assert.match(skill, /Agents must not add source comments, matcher text, or prefix\/suffix identifiers/);
  assert.match(skill, /comments accepted by a configured matcher or identifier as human-owned/);
});

test("parses build targets", () => {
  assert.deepEqual(parseBuildTargets([], {}), ["package"]);
  assert.deepEqual(parseBuildTargets(["--target", "codex,claude"], {}), ["codex", "claude"]);
  assert.deepEqual(parseBuildTargets(["--target=all"], {}), ["package", "agents", "codex", "claude"]);
  assert.deepEqual(parseBuildTargets(["--target=auto"], { CODEX_HOME: "/tmp/codex" }), ["codex"]);
  assert.deepEqual(parseBuildTargets(["codex"], {}), ["package"]);
  assert.deepEqual(parseBuildTargets(["--target=auto"], { CODEX_HOME: "" }), ["package"]);
  assert.throws(() => parseBuildTargets(["--target=unknown"], {}), /Unknown agent build target/);
});

test("creates package and rule artifacts", () => {
  const packageArtifact = createAgentArtifact("package");
  const codexArtifact = createAgentArtifact("codex");

  assert.equal(packageArtifact.relativePath, "skills/eslint-plugin-legibility/SKILL.md");
  assert.match(packageArtifact.content, /# ESLint Plugin Legibility/);
  assert.equal(codexArtifact.relativePath, ".codex/rules/eslint-plugin-legibility.md");
  assert.match(codexArtifact.content, /shared agent skill workflow/);
});

test("writes selected artifacts", () => {
  const directory = createTempDirectory();
  const skillPath = join(directory, "skills", "eslint-plugin-legibility", "SKILL.md");

  try {
    const artifacts = writeAgentArtifacts({ root: directory, targets: ["package"] });
    const skill = readFileSync(skillPath, "utf8");

    assert.equal(artifacts.length, 1);
    assert.equal(existsSync(skillPath), true);
    assert.match(skill, /eslint-plugin-legibility/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
