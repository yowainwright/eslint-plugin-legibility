import { spawnSync } from "node:child_process";
import { join } from "node:path";

export type Engine = "eslint" | "oxlint";
export type Preset = "default" | "opt-in" | "recommended" | "strict";

export interface Diagnostic {
  code: string;
  severity: "error" | "warning";
}

export interface MatrixCase {
  engine: Engine;
  expected: Diagnostic[];
  invalidFile: string;
  invalidStatus: number;
  preset: Preset;
  validFile: string;
}

export interface LintCommandResult {
  status: number | null;
  stderr: string;
  stdout: string;
}

const defaultFeatureRules = [
  "max-function-parameters",
  "no-complex-ternaries",
  "prefer-early-return",
  "prefer-flat-map",
  "prefer-object-lookup",
];
const presetFeatureRules = [
  "max-expression-operators",
  "max-function-parameters",
  "no-complex-ternaries",
  "no-computed-values",
  "no-computed-values",
  "no-identity-array-callback",
  "no-unnecessary-async",
  "prefer-early-return",
  "prefer-flat-map",
  "prefer-object-lookup",
];
const optInFeatureRules = presetFeatureRules.concat(
  "no-unmatched-comments",
  "require-filename-matches-dirname",
);

function createDiagnostics(
  engine: Engine,
  ruleNames: string[],
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
    invalidFile: "invalid.ts",
    invalidStatus: 1,
    preset: "default",
    validFile: "valid.ts",
  },
  {
    engine: "eslint",
    expected: createDiagnostics("eslint", optInFeatureRules, "error"),
    invalidFile: "button.ts",
    invalidStatus: 1,
    preset: "opt-in",
    validFile: "index.ts",
  },
  {
    engine: "eslint",
    expected: createDiagnostics("eslint", presetFeatureRules, "warning"),
    invalidFile: "invalid.ts",
    invalidStatus: 0,
    preset: "recommended",
    validFile: "valid.ts",
  },
  {
    engine: "eslint",
    expected: createDiagnostics("eslint", presetFeatureRules, "error"),
    invalidFile: "invalid.ts",
    invalidStatus: 1,
    preset: "strict",
    validFile: "valid.ts",
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", defaultFeatureRules, "error"),
    invalidFile: "invalid.ts",
    invalidStatus: 1,
    preset: "default",
    validFile: "valid.ts",
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", optInFeatureRules, "error"),
    invalidFile: "button.ts",
    invalidStatus: 1,
    preset: "opt-in",
    validFile: "index.ts",
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", presetFeatureRules, "warning"),
    invalidFile: "invalid.ts",
    invalidStatus: 0,
    preset: "recommended",
    validFile: "valid.ts",
  },
  {
    engine: "oxlint",
    expected: createDiagnostics("oxlint", presetFeatureRules, "error"),
    invalidFile: "invalid.ts",
    invalidStatus: 1,
    preset: "strict",
    validFile: "valid.ts",
  },
];

export function getBinary(engine: Engine): string {
  return join(process.cwd(), "node_modules", ".bin", engine);
}

export function getFixtureRoot(matrixCase: MatrixCase): string {
  return join(process.cwd(), "tests", "fixtures", matrixCase.engine, matrixCase.preset);
}

export function getConfigPath(matrixCase: MatrixCase): string {
  const configName = `${matrixCase.engine}.config.ts`;
  return join(getFixtureRoot(matrixCase), configName);
}

export function getFixtureSource(matrixCase: MatrixCase, filename: string): string {
  return join(getFixtureRoot(matrixCase), filename);
}

export function runLint(matrixCase: MatrixCase, source: string): LintCommandResult {
  const binary = getBinary(matrixCase.engine);
  const config = getConfigPath(matrixCase);
  const args = ["--config", config, "--format", "json", source];
  const result = spawnSync(binary, args, { encoding: "utf8" });
  if (result.error) throw result.error;

  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}
