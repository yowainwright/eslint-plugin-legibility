import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { join } from "node:path";

import type { Engine, MatrixCase } from "./matrix.ts";
import { getBinary, getFixtureSource, matrixCases, runLint } from "./matrix.ts";

type Workload = "project" | "single";

interface BenchmarkStats {
  maxMs: number;
  meanMs: number;
  medianMs: number;
  minMs: number;
  p95Ms: number;
}

const warmups = readCount("BENCHMARK_WARMUPS", 1, 0);
const iterations = readCount("BENCHMARK_ITERATIONS", 5, 1);
const workloads: readonly Workload[] = ["single", "project"];

function readCount(name: string, fallback: number, minimum: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined) return fallback;

  const value = Number.parseInt(rawValue, 10);
  if (Number.isInteger(value) && value >= minimum) return value;
  throw new Error(`${name} must be an integer of at least ${minimum}`);
}

function getSources(matrixCase: MatrixCase, workload: Workload): string[] {
  if (workload === "single") {
    const validFile = matrixCase.validFiles[0] ?? "valid.ts";
    return [getFixtureSource(matrixCase, validFile)];
  }
  return [join(process.cwd(), "workload")];
}

function getFileCount(workload: Workload): number {
  if (workload === "single") return 1;
  return 100;
}

function runOnce(matrixCase: MatrixCase, sources: readonly string[]): number {
  const start = performance.now();
  const result = runLint(matrixCase, sources);
  const elapsed = performance.now() - start;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return elapsed;
}

function measure(matrixCase: MatrixCase, sources: readonly string[]): number[] {
  Array.from({ length: warmups }).forEach(() => runOnce(matrixCase, sources));
  return Array.from({ length: iterations }, () => runOnce(matrixCase, sources));
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function percentile(sortedValues: number[], fraction: number): number {
  const rawIndex = Math.ceil(sortedValues.length * fraction) - 1;
  const index = Math.max(0, rawIndex);
  return sortedValues[index] ?? 0;
}

function summarize(samples: number[]): BenchmarkStats {
  const sortedSamples = samples.toSorted((left, right) => left - right);
  const total = samples.reduce((sum, sample) => sum + sample, 0);
  const meanMs = round(total / samples.length);
  const medianMs = round(percentile(sortedSamples, 0.5));
  const p95Ms = round(percentile(sortedSamples, 0.95));
  const minMs = round(sortedSamples[0] ?? 0);
  const maxMs = round(sortedSamples.at(-1) ?? 0);
  return { maxMs, meanMs, medianMs, minMs, p95Ms };
}

function benchmarkCase(matrixCase: MatrixCase, workload: Workload) {
  const sources = getSources(matrixCase, workload);
  const files = getFileCount(workload);
  const samples = measure(matrixCase, sources);
  const stats = summarize(samples);
  const meanPerFileMs = round(stats.meanMs / files);
  return { engine: matrixCase.engine, files, meanPerFileMs, profile: matrixCase.profile, stats, workload };
}

function benchmarkMatrixCase(matrixCase: MatrixCase) {
  return workloads.map((workload) => benchmarkCase(matrixCase, workload));
}

function getVersion(engine: Engine): string {
  const binary = getBinary(engine);
  const result = spawnSync(binary, ["--version"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

const results = matrixCases.flatMap(benchmarkMatrixCase);
const eslint = getVersion("eslint");
const oxlint = getVersion("oxlint");
const generatedAt = new Date().toISOString();
const node = process.version;
const report = { generatedAt, iterations, node, results, versions: { eslint, oxlint }, warmups };

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
