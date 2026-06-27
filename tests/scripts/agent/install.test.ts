import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createInstallArtifact,
  installAgentSkill,
  parseInstallOptions,
  resolveInstallRoot,
} from "../../../scripts/agent/install.ts";

function createTempDirectory(): string {
  return mkdtempSync(join(tmpdir(), "legibility-agent-install-"));
}

test("parses install options", () => {
  const options = parseInstallOptions(["--target=codex", "--path", "/tmp/skills", "--force"]);

  assert.equal(options.target, "codex");
  assert.equal(options.path, "/tmp/skills");
  assert.equal(options.force, true);
});

test("resolves default install roots", () => {
  const home = "/tmp/example-home";
  const agentsRoot = resolveInstallRoot({ env: {}, home, target: "agents" });
  const codexRoot = resolveInstallRoot({ env: { CODEX_HOME: "" }, home, target: "codex" });
  const claudeRoot = resolveInstallRoot({ env: {}, home, target: "claude" });

  assert.equal(agentsRoot, "/tmp/example-home/.agents/skills");
  assert.equal(codexRoot, "/tmp/example-home/.codex/skills");
  assert.equal(claudeRoot, "/tmp/example-home/.claude/rules");
});

test("creates skill and Claude install artifacts", () => {
  const skillArtifact = createInstallArtifact("agents");
  const claudeArtifact = createInstallArtifact("claude");

  assert.equal(skillArtifact.relativePath, "eslint-plugin-legibility/SKILL.md");
  assert.match(skillArtifact.content, /^---\nname: eslint-plugin-legibility/m);
  assert.equal(claudeArtifact.relativePath, "eslint-plugin-legibility.md");
  assert.match(claudeArtifact.content, /# ESLint Plugin Legibility/);
});

test("installs a skill and refuses accidental replacement", () => {
  const directory = createTempDirectory();
  const skillPath = join(directory, "eslint-plugin-legibility", "SKILL.md");

  try {
    const destination = installAgentSkill({ path: directory, target: "agents" });

    assert.equal(destination, skillPath);
    assert.equal(existsSync(skillPath), true);
    assert.throws(() => installAgentSkill({ path: directory, target: "agents" }), /already exists/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("force replaces an installed artifact", () => {
  const directory = createTempDirectory();
  const skillPath = join(directory, "eslint-plugin-legibility", "SKILL.md");

  try {
    installAgentSkill({ path: directory, target: "agents" });
    writeFileSync(skillPath, "old\n");
    installAgentSkill({ force: true, path: directory, target: "agents" });

    assert.match(readFileSync(skillPath, "utf8"), /npx lint-changed/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
