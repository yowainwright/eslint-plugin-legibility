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

interface ManifestExports {
  [key: string]: {
    import?: string;
    require?: string;
  };
}

const scripts = manifest.scripts as ManifestScripts;
const releaseIt = manifest["release-it"] as ReleaseItConfig;
const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const publishWorkflow = readFileSync(".github/workflows/publish.yml", "utf8");
const updateWorkflow = readFileSync(".github/workflows/update.yml", "utf8");

test("release scripts use the publish confirmation wrapper", () => {
  assert.equal(scripts.release, "nub --node scripts/repo/index.ts release");
  assert.equal(scripts["release:current"], "nub --node scripts/repo/index.ts release --current");
  assert.equal(scripts["release:current:dry"], "nub --node scripts/repo/index.ts release --current --dry-run");
  assert.equal(scripts["release:patch"], "nub --node scripts/repo/index.ts release patch");
  assert.equal(scripts["release:patch:dry"], "nub --node scripts/repo/index.ts release patch --dry-run");
  assert.equal(scripts["release:minor"], "nub --node scripts/repo/index.ts release minor");
  assert.equal(scripts["release:minor:dry"], "nub --node scripts/repo/index.ts release minor --dry-run");
  assert.equal(scripts["release:major"], "nub --node scripts/repo/index.ts release major");
  assert.equal(scripts["release:major:dry"], "nub --node scripts/repo/index.ts release major --dry-run");
  assert.equal(scripts["release:beta"], "nub --node scripts/repo/index.ts release --preRelease=beta");
  assert.equal(scripts["release:beta:dry"], "nub --node scripts/repo/index.ts release --preRelease=beta --dry-run");
  assert.equal(scripts["release:alpha"], "nub --node scripts/repo/index.ts release --preRelease=alpha");
  assert.equal(scripts["release:alpha:dry"], "nub --node scripts/repo/index.ts release --preRelease=alpha --dry-run");
  assert.equal(scripts["release:dry"], "nub --node scripts/repo/index.ts release patch --dry-run");
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
  assert.equal(releaseIt.hooks?.["before:init"], "nub run validate");
});

test("publish workflow uses npm trusted publishing", () => {
  assert.match(publishWorkflow, /id-token: write/);
  assert.match(publishWorkflow, /registry-url: https:\/\/registry\.npmjs\.org/);
  assert.match(
    publishWorkflow,
    /nub --node scripts\/repo\/index\.ts parse-pack-output npm-pack\.json/,
  );
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

test("ci workflow covers supported runtimes and linter hosts", () => {
  assert.match(ciWorkflow, /node: \[22, 24, 26\]/);
  assert.match(ciWorkflow, /eslint: "8\.57\.1"/);
  assert.match(ciWorkflow, /eslint: "10\.8\.1"/);
  assert.match(ciWorkflow, /oxlint: "1\.55\.0"/);
  assert.match(ciWorkflow, /name: bun/);
  assert.match(ciWorkflow, /nub run test:bun/);
  assert.match(ciWorkflow, /name: deno/);
  assert.match(ciWorkflow, /denoland\/setup-deno@22d081ff2d3a40755e97629de92e3bcbfa7cf2ed/);
  assert.match(ciWorkflow, /nub run test:deno/);
});

test("package metadata declares supported runtimes and optional linter hosts", () => {
  assert.equal(manifest.engines.node, ">=22");
  assert.ok(manifest.engines.node);
  assert.ok(manifest.dependencies["@oxlint/plugins"]);
  assert.ok(manifest.peerDependencies.eslint);
  assert.ok(manifest.peerDependencies.oxlint);
  assert.equal(manifest.peerDependenciesMeta.eslint.optional, true);
  assert.equal(manifest.peerDependenciesMeta.oxlint.optional, true);
});

test("package metadata publishes separate ESM and CommonJS entries", () => {
  const packageExports = manifest.exports as ManifestExports;

  assert.equal(manifest.main, "./dist/index.cjs");
  assert.equal(packageExports["."].import, "./dist/index.js");
  assert.equal(packageExports["."].require, "./dist/index.cjs");
  assert.equal(packageExports["./oxlint"].import, "./dist/oxlint.js");
  assert.equal(packageExports["./oxlint"].require, "./dist/oxlint.cjs");
});

test("update workflow maintains dependencies and override metadata", () => {
  assert.match(updateWorkflow, /nub run codependence:update/);
  assert.match(updateWorkflow, /nub run pastoralist/);
  assert.match(updateWorkflow, /nub run pastoralist --dry-run --strict/);
  assert.match(updateWorkflow, /nub run validate/);
  assert.match(updateWorkflow, /peter-evans\/create-pull-request@/);
});
