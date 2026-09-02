import type { PreRelease, ReleaseIncrement } from "./types.ts";

export const binRoot = "bin";
export const agentBinRoot = `${binRoot}/agent`;
export const distRoot = "dist";
export const cjsRoot = `${distRoot}/cjs`;
export const cjsEntryPath = `${distRoot}/index.cjs`;
export const cjsOxlintEntryPath = `${distRoot}/oxlint.cjs`;
export const compiledAgentRoot = ".build/scripts/agent";
export const repoConstantsSource = ".build/scripts/repo/constants.js";
export const repoConstantsDestination = `${binRoot}/constants.js`;
export const lintChangedSource = ".build/scripts/repo/utils.js";
export const lintChangedDestination = `${binRoot}/lint-changed.js`;
export const pluginEntryPath = "src/index.ts";
export const pluginOxlintEntryPath = "src/oxlint.ts";
export const pluginCompilerOptions = {
  declaration: true,
  noEmit: false,
  outDir: "../dist",
  rootDir: "../src",
};
export const pluginTsconfigPath = ".build/tsconfig.plugin.json";
export const tsupPath = "node_modules/.bin/tsup";
export const pluginConfig = {
  compilerOptions: pluginCompilerOptions,
  include: ["../src/**/*.ts"],
  out: pluginTsconfigPath,
  tsconfigs: ["tsconfig.json"],
};
export const strictArgs = ["--noEmit", "--strict", "--noImplicitAny", "--noUncheckedIndexedAccess"];
export const tscPath = "node_modules/.bin/tsc";

export const packArgs = ["pack", "--json", "--pack-destination", "./.npm-cache"];
export const repoManagerTargets: ReadonlySet<string> = new Set([
  "pack",
  "parse-pack-output",
  "validate",
]);
export const validationStart = [
  ["run", "typecheck"],
  ["run", "typecheck:strict"],
  ["run", "type-coverage"],
];
export const validationEnd = [
  ["run", "lint"],
  ["run", "lint:oxlint"],
  ["run", "pack:check"],
];

export const packageName = "eslint-plugin-legibility";
export const releaseItBin = "./node_modules/.bin/release-it";
export const preReleases = ["alpha", "beta", "rc"] as const satisfies readonly PreRelease[];
export const releaseIncrements = ["patch", "minor", "major"] as const satisfies readonly ReleaseIncrement[];
export const safeShellArgPattern = /^[A-Za-z0-9_./:=@-]+$/;
export const versionPattern = /\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/g;
