import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

import type { Diagnostic, MatrixCase } from "./matrix.ts";
import { getFixtureRoot, getFixtureSource, matrixCases, runLint } from "./matrix.ts";

interface EslintMessage {
  ruleId: string | null;
  severity: number;
}

interface EslintResult {
  messages: EslintMessage[];
}

interface OxlintOutput {
  diagnostics: Diagnostic[];
}

function getEslintSeverity(severity: number): "error" | "warning" {
  if (severity === 2) return "error";
  return "warning";
}

function normalizeEslintMessage(message: EslintMessage): Diagnostic {
  const code = message.ruleId ?? "";
  const severity = getEslintSeverity(message.severity);
  return { code, severity };
}

function getEslintDiagnostics(stdout: string): Diagnostic[] {
  const results = JSON.parse(stdout) as EslintResult[];
  const diagnostics = results
    .flatMap((result) => result.messages)
    .filter((message) => message.ruleId?.startsWith("legibility/"))
    .map(normalizeEslintMessage);
  return uniqueDiagnostics(diagnostics);
}

function getOxlintDiagnostics(stdout: string): Diagnostic[] {
  const output = JSON.parse(stdout) as OxlintOutput;
  const diagnostics = output.diagnostics
    .filter((diagnostic) => diagnostic.code.startsWith("legibility("))
    .map(({ code, severity }) => ({ code, severity }));
  return uniqueDiagnostics(diagnostics);
}

function uniqueDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const entries = diagnostics.map((diagnostic) => [diagnostic.code, diagnostic] as const);
  return Array.from(new Map(entries).values()).toSorted((left, right) =>
    left.code.localeCompare(right.code),
  );
}

function getDiagnostics(matrixCase: MatrixCase, stdout: string): Diagnostic[] {
  if (matrixCase.engine === "eslint") return getEslintDiagnostics(stdout);
  return getOxlintDiagnostics(stdout);
}

function verifyFixtureCoverage(matrixCase: MatrixCase): void {
  const configName = `${matrixCase.engine}.config.ts`;
  const sourceFiles = readdirSync(getFixtureRoot(matrixCase))
    .filter((file) => file.endsWith(".ts") && file !== configName)
    .toSorted();
  const coveredFiles = matrixCase.invalidFiles.concat(matrixCase.validFiles).toSorted();
  assert.deepEqual(coveredFiles, sourceFiles);
}

function getFixtureSources(matrixCase: MatrixCase, files: readonly string[]): string[] {
  return files.map((filename) => getFixtureSource(matrixCase, filename));
}

function verifyCase(matrixCase: MatrixCase): void {
  verifyFixtureCoverage(matrixCase);
  const invalidSources = getFixtureSources(matrixCase, matrixCase.invalidFiles);
  const invalidResult = runLint(matrixCase, invalidSources);
  assert.equal(invalidResult.stderr, "");
  assert.equal(invalidResult.status, matrixCase.invalidStatus);
  assert.deepEqual(getDiagnostics(matrixCase, invalidResult.stdout), matrixCase.expected);

  const validSources = getFixtureSources(matrixCase, matrixCase.validFiles);
  const validResult = runLint(matrixCase, validSources);
  assert.equal(validResult.stderr, "");
  assert.equal(validResult.status, 0);
  assert.deepEqual(getDiagnostics(matrixCase, validResult.stdout), []);
  process.stdout.write(`PASS ${matrixCase.engine}/${matrixCase.profile}\n`);
}

matrixCases.forEach(verifyCase);
