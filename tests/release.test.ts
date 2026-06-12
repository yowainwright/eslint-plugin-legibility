import assert from "node:assert/strict";
import test from "node:test";

import manifest from "../package.json" with { type: "json" };

type ManifestScripts = Record<string, string>;

interface ReleaseItConfig {
  git?: {
    commitMessage?: string;
    push?: boolean;
    requireBranch?: string;
    requireCleanWorkingDir?: boolean;
    requireUpstream?: boolean;
    tagName?: string;
  };
  github?: {
    release?: boolean;
  };
  hooks?: Record<string, string>;
  npm?: {
    publish?: boolean;
  };
}

const scripts = manifest.scripts as ManifestScripts;
const releaseIt = manifest["release-it"] as ReleaseItConfig;

test("release scripts use release-it directly", () => {
  assert.equal(scripts.release, "release-it");
  assert.equal(scripts["release:current"], "release-it --no-increment --ci");
  assert.equal(scripts["release:current:dry"], "release-it --no-increment --dry-run");
  assert.equal(scripts["release:patch"], "release-it patch --ci");
  assert.equal(scripts["release:minor"], "release-it minor --ci");
  assert.equal(scripts["release:major"], "release-it major --ci");
  assert.equal(scripts["release:beta"], "release-it --preRelease=beta --ci");
  assert.equal(scripts["release:alpha"], "release-it --preRelease=alpha --ci");
  assert.equal(scripts["release:dry"], "release-it --dry-run");

  const customReleaseScripts = Object.entries(scripts).filter(
    ([name, command]) => name.startsWith("release") && command.includes("scripts/"),
  );
  assert.deepEqual(customReleaseScripts, []);
});

test("release-it creates git releases while GitHub Actions publishes npm", () => {
  assert.equal(releaseIt.git?.requireBranch, "main");
  assert.equal(releaseIt.git?.requireCleanWorkingDir, true);
  assert.equal(releaseIt.git?.requireUpstream, true);
  assert.equal(releaseIt.git?.commitMessage, "chore(release): ${version}");
  assert.equal(releaseIt.git?.tagName, "v${version}");
  assert.equal(releaseIt.git?.push, true);
  assert.equal(releaseIt.npm?.publish, false);
  assert.equal(releaseIt.github?.release, false);
  assert.equal(releaseIt.hooks?.["before:init"], "pnpm validate");
});
