import { chmodSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const binRoot = "bin";
const agentBinRoot = join(binRoot, "agent");
const compiledAgentRoot = join(".build", "scripts", "agent");
const lintChangedSource = join(".build", "scripts", "lint-changed.node.js");
const lintChangedDestination = join(binRoot, "lint-changed.js");

export function buildBin(): void {
  mkdirSync(agentBinRoot, { recursive: true });
  copyFileSync(lintChangedSource, lintChangedDestination);
  copyAgentScripts();
  makeExecutable(lintChangedDestination);
  makeExecutable(join(agentBinRoot, "build.js"));
  makeExecutable(join(agentBinRoot, "install.js"));
}

function copyAgentScripts(): void {
  const files = readdirSync(compiledAgentRoot);
  files.filter(isJavaScriptFile).forEach(copyAgentScript);
}

function isJavaScriptFile(file: string): boolean {
  return file.endsWith(".js");
}

function copyAgentScript(file: string): void {
  const source = join(compiledAgentRoot, file);
  const destination = join(agentBinRoot, file);
  copyFileSync(source, destination);
}

function makeExecutable(path: string): void {
  chmodSync(path, 0o755);
}

buildBin();
