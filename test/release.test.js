const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");

const release = require("../scripts/release.js");
const tagRelease = require("../scripts/tag-release.js");

test("release args parse increments and prereleases", () => {
  assert.deepEqual(release.parseArgs(["--increment=minor", "--dry-run"]), {
    dryRun: true,
    increment: "minor",
  });
  assert.deepEqual(release.parseArgs(["--preRelease=beta"]), {
    dryRun: false,
    preRelease: "beta",
  });
});

test("release-it args disable git tag and push", () => {
  assert.deepEqual(release.buildReleaseItArgs({ increment: "patch" }), [
    "--increment=patch",
    "--git.tag=false",
    "--git.push=false",
    "--git.requireUpstream=false",
    "--git.getLatestTagFromAllRefs=true",
    "--ci",
  ]);
});

test("release plans match the tag-triggered publish flow", () => {
  const plan = release.buildReleasePlan("1.2.3", { dryRun: true, increment: "patch" });

  assert.equal(plan.tagName, "v1.2.3");
  assert.match(release.formatReleasePlan(plan), /push v1\.2\.3 to trigger publishing/);
  assert.deepEqual(plan.commands, [
    "./node_modules/.bin/release-it 1.2.3 --git.tag=false --git.push=false --git.requireUpstream=false --git.getLatestTagFromAllRefs=true --ci",
    "git tag --annotate v1.2.3 --message \"Release 1.2.3\"",
    "git push origin refs/tags/v1.2.3",
  ]);
});

test("release version fallback skips existing tags", () => {
  const seenTags = new Set(["v1.2.3", "v1.2.4"]);
  const runner = (_command, args) => {
    const tagName = args.at(-1).replace("refs/tags/", "");
    if (args[0] === "rev-parse") {
      return {
        status: 1,
        stdout: "",
        stderr: "",
      };
    }

    return {
      status: 0,
      stdout: seenTags.has(tagName) ? tagName : "",
      stderr: "",
    };
  };

  assert.equal(
    release.resolveAvailableReleaseVersion(
      runner,
      { dryRun: false, increment: "patch" },
      "1.2.3",
    ),
    "1.2.5",
  );
});

test("tag-release reads and validates package versions", () => {
  const directory = mkdtempSync(join(tmpdir(), "legibility-release-"));
  try {
    writeFileSync(join(directory, "package.json"), JSON.stringify({ version: "2.0.0-beta.1" }));

    assert.equal(tagRelease.readPackageVersion(directory), "2.0.0-beta.1");
    assert.equal(tagRelease.formatTagName("2.0.0-beta.1"), "v2.0.0-beta.1");
    assert.throws(() => tagRelease.formatTagName("latest"), /Invalid package version/);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
