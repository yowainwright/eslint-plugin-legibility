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
  const agentScriptPaths = copyAgentScripts();
  const executablePaths = [lintChangedDestination].concat(agentScriptPaths);

  executablePaths.forEach(makeExecutable);
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

buildBin();
