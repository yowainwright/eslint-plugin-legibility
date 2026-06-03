const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");

function requireRuntimeScript(name) {
  const extension = __filename.endsWith(".ts") ? "ts" : "js";
  const runtimeRoot = extension === "ts" ? process.cwd() : join(process.cwd(), ".build");
  return require(join(runtimeRoot, "scripts", `${name}.${extension}`));
}

const release = requireRuntimeScript("release");
const tagRelease = requireRuntimeScript("tag-release");

test("release args parse increments and prereleases", () => {
  assert.deepEqual(release.parseArgs(["--increment=minor", "--dry-run"]), {
    dryRun: true,
    increment: "minor",
    trustedPublishing: false,
  });
  assert.deepEqual(release.parseArgs(["--preRelease=beta", "--trusted-publishing"]), {
    dryRun: false,
    preRelease: "beta",
    trustedPublishing: true,
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

test("tag-release parses release flags and GitHub repository URLs", () => {
  assert.deepEqual(tagRelease.parseArgs(["--dry-run", "--trusted-publishing"]), {
    dryRun: true,
    trustedPublishing: true,
  });
  assert.equal(
    tagRelease.parseRepositoryName("git+https://github.com/yowainwright/eslint-plugin-legibility.git"),
    "yowainwright/eslint-plugin-legibility",
  );
  assert.equal(
    tagRelease.parseRepositoryName({ url: "git@github.com:yowainwright/eslint-plugin-legibility.git" }),
    "yowainwright/eslint-plugin-legibility",
  );
});

test("publish auth check accepts repository and environment NPM_TOKEN secrets", () => {
  const calls = [];
  const gh = (args) => {
    calls.push(args);
    if (args.includes("--env")) return { status: 0, stdout: "NPM_TOKEN\t2026-06-01\n", stderr: "" };
    return { status: 0, stdout: "OTHER_SECRET\t2026-06-01\n", stderr: "" };
  };

  assert.doesNotThrow(() => {
    tagRelease.assertPublishAuthReady({ gh, repository: "yowainwright/eslint-plugin-legibility" });
  });
  assert.deepEqual(calls, [
    ["secret", "list", "--repo", "yowainwright/eslint-plugin-legibility"],
    ["secret", "list", "--env", "npm-publish", "--repo", "yowainwright/eslint-plugin-legibility"],
  ]);
});

test("publish auth check can be explicitly satisfied by trusted publishing", () => {
  let called = false;

  tagRelease.assertPublishAuthReady({
    gh: () => {
      called = true;
      return { status: 1, stdout: "", stderr: "should not run" };
    },
    trustedPublishing: true,
  });

  assert.equal(called, false);
});

test("publish auth check fails before a tag is pushed without publish credentials", () => {
  const gitCalls = [];
  const git = (args) => {
    gitCalls.push(args);
    if (args[0] === "branch") return { status: 0, stdout: "main\n", stderr: "" };
    if (args[0] === "status") return { status: 0, stdout: "", stderr: "" };
    if (args[0] === "fetch") return { status: 0, stdout: "", stderr: "" };
    if (args[0] === "rev-parse") return { status: 1, stdout: "", stderr: "" };
    if (args[0] === "ls-remote") return { status: 2, stdout: "", stderr: "" };
    if (args[0] === "tag") return { status: 0, stdout: "", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  const gh = () => ({ status: 0, stdout: "OTHER_SECRET\t2026-06-01\n", stderr: "" });

  assert.throws(
    () =>
      tagRelease.runReleaseTag({
        gh,
        git,
        repository: "yowainwright/eslint-plugin-legibility",
        requireUpstream: false,
        version: "0.1.0",
      }),
    /NPM_TOKEN secret is not configured/,
  );
  assert.equal(gitCalls.some((args) => args[0] === "tag" && args[1] === "--annotate"), false);
});
