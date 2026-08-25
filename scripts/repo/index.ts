import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import mergeTsconfigs from "merge-tsconfigs";

import {
  agentBinRoot,
  cjsEntryPath,
  cjsRoot,
  compiledAgentRoot,
  distRoot,
  lintChangedDestination,
  lintChangedSource,
  pluginConfig,
  pluginEntryPath,
  pluginTsconfigPath,
  repoConstantsDestination,
  repoConstantsSource,
  strictArgs,
  tscPath,
  tsupPath,
} from "./constants.ts";
import { isDirectRun, preserveExitCode, runRelease, runRepoDirect } from "./utils.ts";

export function buildBin(): void {
  mkdirSync(agentBinRoot, { recursive: true });
  copyFileSync(lintChangedSource, lintChangedDestination);
  copyFileSync(repoConstantsSource, repoConstantsDestination);
  const agentScriptPaths = copyAgentScripts();
  const installPath = copyAgentInstallAlias();
  const executablePaths = [lintChangedDestination, installPath].concat(agentScriptPaths);

  executablePaths.forEach(makeExecutable);
}

export function buildConfig(): void {
  mergeTsconfigs(pluginConfig);
}

function runCommand(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status === 0) return;

  process.exitCode = result.status ?? 1;
}

function runTsc(args: string[]): void {
  runCommand(tscPath, args);
}

export function buildPlugin(): void {
  cleanDist();
  buildConfig();
  runTsc(["-p", pluginTsconfigPath]);
  runCommand(tsupPath, [
    pluginEntryPath,
    "--format",
    "cjs",
    "--out-dir",
    cjsRoot,
    "--no-dts",
    "--no-splitting",
    "--clean",
  ]);
  writeCjsArtifacts();
}

function cleanDist(): void {
  rmSync(distRoot, { force: true, recursive: true });
}

function writeCjsArtifacts(): void {
  const cjsEntry = '"use strict";\nmodule.exports = require("./cjs/index.cjs").default;\n';

  mkdirSync(cjsRoot, { recursive: true });
  writeFileSync(cjsEntryPath, cjsEntry);
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

function copyAgentInstallAlias(): string {
  const source = join(agentBinRoot, "index.js");
  const destination = join(agentBinRoot, "install.js");
  copyFileSync(source, destination);
  return destination;
}

function makeExecutable(path: string): void {
  chmodSync(path, 0o755);
}

function runRepoCli(args: readonly string[]): number | Promise<number> {
  const command = args[0];
  if (command === "plugin") {
    build("plugin");
    return 0;
  }

  if (command === "bin") {
    build("bin");
    return 0;
  }

  if (command === "config") {
    build("config");
    return 0;
  }

  if (command === "strict") {
    build("strict");
    return 0;
  }

  if (command === "release") return runRelease({ args: args.slice(1) });
  return runRepoDirect(args);
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  try {
    process.exitCode = preserveExitCode(await runRepoCli(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
