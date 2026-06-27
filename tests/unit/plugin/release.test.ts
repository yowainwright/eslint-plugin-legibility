import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import manifest from "../../../package.json" with { type: "json" };

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
const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const publishWorkflow = readFileSync(".github/workflows/publish.yml", "utf8");

test("release scripts use the publish confirmation wrapper", () => {
  assert.equal(scripts.release, "jiti scripts/release.ts");
  assert.equal(scripts["release:current"], "jiti scripts/release.ts --current");
  assert.equal(scripts["release:current:dry"], "jiti scripts/release.ts --current --dry-run");
  assert.equal(scripts["release:patch"], "jiti scripts/release.ts patch");
  assert.equal(scripts["release:patch:dry"], "jiti scripts/release.ts patch --dry-run");
  assert.equal(scripts["release:minor"], "jiti scripts/release.ts minor");
  assert.equal(scripts["release:minor:dry"], "jiti scripts/release.ts minor --dry-run");
  assert.equal(scripts["release:major"], "jiti scripts/release.ts major");
  assert.equal(scripts["release:major:dry"], "jiti scripts/release.ts major --dry-run");
  assert.equal(scripts["release:beta"], "jiti scripts/release.ts --preRelease=beta");
  assert.equal(scripts["release:beta:dry"], "jiti scripts/release.ts --preRelease=beta --dry-run");
  assert.equal(scripts["release:alpha"], "jiti scripts/release.ts --preRelease=alpha");
  assert.equal(scripts["release:alpha:dry"], "jiti scripts/release.ts --preRelease=alpha --dry-run");
  assert.equal(scripts["release:dry"], "jiti scripts/release.ts patch --dry-run");
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

test("publish workflow uses npm trusted publishing", () => {
  assert.match(publishWorkflow, /id-token: write/);
  assert.match(publishWorkflow, /registry-url: https:\/\/registry\.npmjs\.org/);
  assert.match(
    publishWorkflow,
    /npm publish --access public --tag "\$\{\{ steps\.dist-tag\.outputs\.tag \}\}"/,
  );
  assert.match(
    publishWorkflow,
    /npm config delete "\/\/registry\.npmjs\.org\/:_authToken"/,
  );
  assert.match(publishWorkflow, /environment: npm-publish/);
  assert.doesNotMatch(publishWorkflow, /secrets\.(NODE_AUTH_TOKEN|NPM_TOKEN)/);
});

test("ci workflow runs Bun and Deno compatibility suites", () => {
  assert.match(ciWorkflow, /name: bun/);
  assert.match(ciWorkflow, /pnpm test:bun/);
  assert.match(ciWorkflow, /name: deno/);
  assert.match(ciWorkflow, /denoland\/setup-deno@667a34cdef165d8d2b2e98dde39547c9daac7282/);
  assert.match(ciWorkflow, /pnpm test:deno/);
});
