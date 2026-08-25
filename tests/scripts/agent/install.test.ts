import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createInstallArtifact,
  installAgentSkill,
  parseInstallOptions,
  resolveInstallRoot,
} from "../../../scripts/agent/utils.ts";

function createTempDirectory(): string {
  return mkdtempSync(join(tmpdir(), "legibility-agent-install-"));
}

test("parses install options", () => {
  const options = parseInstallOptions(["--target=codex", "--path", "/tmp/skills", "--force"]);
  const positionalOptions = parseInstallOptions(["codex", "/tmp/skills"]);

  assert.equal(options.target, "codex");
  assert.equal(options.path, "/tmp/skills");
  assert.equal(options.force, true);
  assert.equal(positionalOptions.target, undefined);
  assert.equal(positionalOptions.path, undefined);
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

test("installs through the package manager bin symlink", () => {
  const directory = createTempDirectory();
  const binDirectory = join(directory, "node_modules", ".bin");
  const symlinkPath = join(binDirectory, "eslint-plugin-legibility-install-skill");
  const installRoot = join(directory, "installed");
  const installScript = join(process.cwd(), "bin", "agent", "install.js");

  try {
    mkdirSync(binDirectory, { recursive: true });
    symlinkSync(installScript, symlinkPath);
    const result = spawnSync(
      process.execPath,
      [symlinkPath, "--target", "agents", "--path", installRoot],
      { cwd: directory, encoding: "utf8" },
    );

    const skillPath = join(installRoot, "eslint-plugin-legibility", "SKILL.md");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(skillPath), true);
    assert.match(result.stdout, /installed eslint-plugin-legibility/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
