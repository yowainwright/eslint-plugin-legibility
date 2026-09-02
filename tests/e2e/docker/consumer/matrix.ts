import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";

export type Engine = "eslint" | "oxlint";
export type Profile = "default" | "opt-in" | "recommended" | "strict";

interface PluginShape {
  configs: Record<"flat/recommended" | "flat/strict", { rules: Record<string, unknown> }>;
  rules: Record<string, unknown>;
}

export interface Diagnostic {
  code: string;
  severity: "error" | "warning";
}

export interface MatrixCase {
  engine: Engine;
  expected: Diagnostic[];
  invalidFiles: string[];
  invalidStatus: number;
  profile: Profile;
  validFiles: string[];
}

export interface LintCommandResult {
  status: number | null;
  stderr: string;
  stdout: string;
}

const require = createRequire(import.meta.url);
const legibility = require("eslint-plugin-legibility") as PluginShape;

const defaultFeatureRules = [
  "max-function-parameters",
  "no-complex-ternaries",
  "prefer-early-return",
  "prefer-flat-map",
  "prefer-object-lookup",
];
const recommendedFeatureRules = getPresetRuleNames("flat/recommended");
const strictFeatureRules = getPresetRuleNames("flat/strict");
const optInFeatureRules = Object.keys(legibility.rules);

function getPresetRuleNames(preset: "flat/recommended" | "flat/strict"): string[] {
  return Object.keys(legibility.configs[preset].rules)
    .filter((ruleName) => ruleName.startsWith("legibility/"))
    .map((ruleName) => ruleName.replace("legibility/", ""));
}

function createDiagnostics(
  engine: Engine,
  ruleNames: readonly string[],
  severity: Diagnostic["severity"],
): Diagnostic[] {
  return ruleNames
    .map((ruleName) => {
      const code = engine === "eslint" ? `legibility/${ruleName}` : `legibility(${ruleName})`;
      return { code, severity };
    })
    .toSorted((left, right) => left.code.localeCompare(right.code));
}

export const matrixCases: readonly MatrixCase[] = [
  {
    engine: "eslint",
    expected: createDiagnostics("eslint", defaultFeatureRules, "error"),
    invalidFiles: ["invalid.ts"],
    invalidStatus: 1,
    profile: "default",
    validFiles: ["valid.ts"],
  },
  {
    engine: "eslint",
    expected: createDiagnostics("eslint", optInFeatureRules, "error"),
    invalidFiles: ["button.ts", "features.ts", "mixed-File.ts"],
    invalidStatus: 1,
    profile: "opt-in",
    validFiles: ["index.ts"],
  },
  {
    engine: "eslint",
    expected: createDiagnostics("eslint", recommendedFeatureRules, "warning"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 0,
    profile: "recommended",
    validFiles: ["valid.ts"],
  },
  {
    engine: "eslint",
    expected: createDiagnostics("eslint", strictFeatureRules, "error"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 1,
    profile: "strict",
    validFiles: ["valid.ts"],
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", defaultFeatureRules, "error"),
    invalidFiles: ["invalid.ts"],
    invalidStatus: 1,
    profile: "default",
    validFiles: ["valid.ts"],
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", optInFeatureRules, "error"),
    invalidFiles: ["button.ts", "features.ts", "mixed-File.ts"],
    invalidStatus: 1,
    profile: "opt-in",
    validFiles: ["index.ts"],
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", recommendedFeatureRules, "warning"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 0,
    profile: "recommended",
    validFiles: ["valid.ts"],
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", strictFeatureRules, "error"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 1,
    profile: "strict",
    validFiles: ["valid.ts"],
  },
];

export function getBinary(engine: Engine): string {
  return join(process.cwd(), "node_modules", ".bin", engine);
}

export function getFixtureRoot(matrixCase: MatrixCase): string {
  return join(process.cwd(), "tests", "fixtures", matrixCase.engine, matrixCase.profile);
}

export function getConfigPath(matrixCase: MatrixCase): string {
  const configName = matrixCase.engine === "oxlint" ? "oxlint.config.mjs" : "eslint.config.ts";
  return join(getFixtureRoot(matrixCase), configName);
}

export function getFixtureSource(matrixCase: MatrixCase, filename: string): string {
  return join(getFixtureRoot(matrixCase), filename);
}

export function runLint(matrixCase: MatrixCase, sources: readonly string[]): LintCommandResult {
  const binary = getBinary(matrixCase.engine);
  const config = getConfigPath(matrixCase);
  const args = ["--config", config, "--format", "json"].concat(sources);
  const result = spawnSync(binary, args, { encoding: "utf8" });
  if (result.error) throw result.error;

  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}
