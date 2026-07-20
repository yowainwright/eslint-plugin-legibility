import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import mergeTsconfigs from "merge-tsconfigs";

const binRoot = "bin";
const agentBinRoot = join(binRoot, "agent");
const compiledAgentRoot = join(".build", "scripts", "agent");
const lintChangedSource = join(".build", "scripts", "diff.js");
const lintChangedDestination = join(binRoot, "lint-changed.js");
const pluginCompilerOptions = {
  declaration: true,
  noEmit: false,
  outDir: "../dist",
  rootDir: "../src",
};
const pluginTsconfigPath = ".build/tsconfig.plugin.json";
const pluginConfig = {
  compilerOptions: pluginCompilerOptions,
  include: ["../src/**/*.ts"],
  out: pluginTsconfigPath,
  tsconfigs: ["tsconfig.json"],
};
const strictArgs = ["--noEmit", "--strict", "--noImplicitAny", "--noUncheckedIndexedAccess"];
const tscPath = join("node_modules", ".bin", "tsc");

export function buildBin(): void {
  mkdirSync(agentBinRoot, { recursive: true });
  copyFileSync(lintChangedSource, lintChangedDestination);
  const agentScriptPaths = copyAgentScripts();
  const executablePaths = [lintChangedDestination].concat(agentScriptPaths);

  executablePaths.forEach(makeExecutable);
}

export function buildConfig(): void {
  mergeTsconfigs(pluginConfig);
}

function runTsc(args: string[]): void {
  const result = spawnSync(tscPath, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status === 0) return;

  process.exitCode = result.status ?? 1;
}

export function buildPlugin(): void {
  buildConfig();
  runTsc(["-p", pluginTsconfigPath]);
}

export function typecheckStrict(): void {
  buildConfig();
  runTsc(["-p", pluginTsconfigPath].concat(strictArgs));
}

export function build(target: string | undefined): void {
  const isBinTarget = target === undefined || target === "bin";
  if (isBinTarget) return buildBin();
  if (target === "config") return buildConfig();
  if (target === "plugin") return buildPlugin();
  if (target === "strict") return typecheckStrict();
  throw new Error(`Unknown build target: ${target ?? "(missing)"}`);
}

function copyAgentScripts(): string[] {
  const files = readdirSync(compiledAgentRoot);
  const javaScriptFiles = files.filter(isJavaScriptFile);
  return javaScriptFiles.map(copyAgentScript);
}

function isJavaScriptFile(file: string): boolean {
  return file.endsWith(".js");
}

function copyAgentScript(file: string): string {
  const source = join(compiledAgentRoot, file);
  const destination = join(agentBinRoot, file);
  copyFileSync(source, destination);
  return destination;
}

function makeExecutable(path: string): void {
  chmodSync(path, 0o755);
}

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;

  const argvUrl = pathToFileURL(resolve(argvPath)).href;
  return argvUrl === metaUrl;
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  build(process.argv[2]);
}
