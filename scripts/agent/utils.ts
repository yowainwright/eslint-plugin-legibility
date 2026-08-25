#!/usr/bin/env node
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  agentSkillBody,
  agentSkillDescription,
  agentSkillName,
  agentSkillTitle,
  agentsBuildTarget,
  agentsInstallTarget,
  buildTargets,
  claudeBuildTarget,
  claudeInstallTarget,
  codexBuildTarget,
  codexInstallTarget,
  defaultBuildTarget,
  defaultInstallTarget,
  installTargets,
  packageBuildTarget,
} from "./constants.ts";
import type {
  AgentArtifact,
  AgentBuildOptions,
  AgentBuildTarget,
  AgentInstallArtifact,
  AgentInstallOptions,
  AgentInstallTarget,
  AgentSkillDefinition,
} from "./types.ts";

export function createAgentSkillDefinition(): AgentSkillDefinition {
  return {
    body: agentSkillBody,
    description: agentSkillDescription,
    name: agentSkillName,
    title: agentSkillTitle,
  };
}

export function renderAgentSkill(definition = createAgentSkillDefinition()): string {
  const description = renderYamlBlock(definition.description);
  const body = definition.body.trim();
  return `---\nname: ${definition.name}\ndescription: >\n${description}\n---\n\n${body}\n`;
}

export function renderAgentRulePointer(target: "Claude" | "Codex"): string {
  const generatedSource = "`scripts/agent/constants.ts`";
  const sharedSkill = "`skills/eslint-plugin-legibility/SKILL.md`";
  const command = "`nub run build:agent`";
  return [
    `# eslint-plugin-legibility ${target} Rules`,
    `Use ${sharedSkill} as the shared agent skill workflow.`,
    `Generate the package skill with ${command} when it is missing.`,
    `Keep this file generated from ${generatedSource}.`,
  ].join("\n\n");
}

export function createAgentArtifact(target: AgentBuildTarget): AgentArtifact {
  const content = renderArtifactContent(target);
  const relativePath = getArtifactPath(target);
  return { content, relativePath, target };
}

export function parseBuildTargets(args: readonly string[], env: NodeJS.ProcessEnv): AgentBuildTarget[] {
  const targetValue = getTargetArg(args) ?? defaultBuildTarget;
  const shouldBuildAllTargets = targetValue === "all";
  if (shouldBuildAllTargets) return Array.from(buildTargets);

  const shouldDetectTarget = targetValue === "auto";
  if (shouldDetectTarget) return [detectBuildTarget(env) ?? defaultBuildTarget];

  const rawTargets = targetValue.split(",");
  return rawTargets.map(parseBuildTarget);
}

export function detectBuildTarget(env: NodeJS.ProcessEnv): AgentBuildTarget | null {
  const isCodexEnvironment = Boolean(env.CODEX_HOME);
  if (isCodexEnvironment) return codexBuildTarget;

  const isClaudeEnvironment = Boolean(env.CLAUDECODE || env.CLAUDE_CODE);
  if (isClaudeEnvironment) return claudeBuildTarget;

  return null;
}

export function writeAgentArtifacts(options: AgentBuildOptions = {}): AgentArtifact[] {
  const root = resolve(options.root ?? process.cwd());
  const targets = options.targets ?? [defaultBuildTarget];
  const artifacts = targets.map(createAgentArtifact);
  artifacts.forEach((artifact) => writeAgentArtifact(root, artifact));
  return artifacts;
}

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;

  const realMetaPath = getRealPath(fileURLToPath(metaUrl));
  const realArgvPath = getRealPath(resolve(argvPath));

  const argvUrl = pathToFileURL(realArgvPath).href;
  const realMetaUrl = pathToFileURL(realMetaPath).href;
  return argvUrl === realMetaUrl;
}

function getRealPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function renderYamlBlock(value: string): string {
  const lines = value.split("\n");
  return lines.map((line) => `  ${line}`).join("\n");
}

function renderArtifactContent(target: AgentBuildTarget): string {
  const isClaudeRulesTarget = target === claudeBuildTarget;
  if (isClaudeRulesTarget) return renderAgentRulePointer("Claude");

  const isCodexRulesTarget = target === codexBuildTarget;
  if (isCodexRulesTarget) return renderAgentRulePointer("Codex");

  return renderAgentSkill();
}

function getArtifactPath(target: AgentBuildTarget): string {
  const isPackageTarget = target === packageBuildTarget;
  if (isPackageTarget) return getPackageSkillPath();

  const isAgentsTarget = target === agentsBuildTarget;
  if (isAgentsTarget) return getSharedAgentSkillPath();

  const isCodexTarget = target === codexBuildTarget;
  if (isCodexTarget) return getCodexRulePath();

  return getClaudeRulePath();
}

function getTargetArg(args: readonly string[]): string | undefined {
  const equalsArg = args.find((arg) => arg.startsWith("--target="));
  const hasEqualsArg = equalsArg !== undefined;
  if (hasEqualsArg) return equalsArg.slice("--target=".length);

  const index = args.indexOf("--target");
  const isTargetArgMissing = index === -1;
  if (isTargetArgMissing) return undefined;

  const value = args[index + 1];
  const isMissingValue = !value;
  if (isMissingValue) return undefined;

  const isNextFlag = value.startsWith("--");
  if (isNextFlag) return undefined;

  return value;
}

function parseBuildTarget(value: string): AgentBuildTarget {
  const isKnownTarget = buildTargets.includes(value as AgentBuildTarget);
  if (isKnownTarget) return value as AgentBuildTarget;

  throw new Error(`Unknown agent build target: ${value}`);
}

function getPackageSkillPath(): string {
  return join("skills", agentSkillName, "SKILL.md");
}

function getSharedAgentSkillPath(): string {
  return join(".agents", "skills", agentSkillName, "SKILL.md");
}

function getCodexRulePath(): string {
  return join(".codex", "rules", `${agentSkillName}.md`);
}

function getClaudeRulePath(): string {
  return join(".claude", "rules", `${agentSkillName}.md`);
}

function writeAgentArtifact(root: string, artifact: AgentArtifact): void {
  const path = join(root, artifact.relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, artifact.content);
}

export function runBuildCli(args: readonly string[], env: NodeJS.ProcessEnv): void {
  const targets = parseBuildTargets(args, env);
  const artifacts = writeAgentArtifacts({ targets });
  artifacts.forEach((artifact) => process.stdout.write(`wrote ${artifact.relativePath}\n`));
}

export function parseInstallOptions(args: readonly string[]): AgentInstallOptions {
  const target = parseInstallTarget(getArgValue(args, "--target"));
  const path = getArgValue(args, "--path");
  const force = args.includes("--force");
  return { force, path, target };
}

export function detectInstallTarget(env: NodeJS.ProcessEnv): AgentInstallTarget | null {
  const buildTarget = detectBuildTarget(env);
  const isInstallTarget = buildTarget !== null && buildTarget !== "package";
  if (isInstallTarget) return buildTarget;

  return null;
}

export function resolveInstallRoot(options: AgentInstallOptions = {}): string {
  const home = options.home ?? process.env.HOME ?? "";
  const env = options.env ?? process.env;
  const target = options.target ?? detectInstallTarget(env) ?? defaultInstallTarget;
  const explicitPath = options.path;
  const hasExplicitPath = explicitPath !== undefined;
  if (hasExplicitPath) return resolve(explicitPath);

  const isAgentsTarget = target === agentsInstallTarget;
  if (isAgentsTarget) return join(home, ".agents", "skills");

  const isCodexTarget = target === codexInstallTarget;
  if (isCodexTarget) return getCodexInstallRoot(env, home);

  return join(home, ".claude", "rules");
}

export function createInstallArtifact(target: AgentInstallTarget): AgentInstallArtifact {
  const isClaudeTarget = target === claudeInstallTarget;
  if (isClaudeTarget) return createClaudeInstallArtifact();

  return createSkillInstallArtifact(target);
}

export function installAgentSkill(options: AgentInstallOptions = {}): string {
  const env = options.env ?? process.env;
  const target = options.target ?? detectInstallTarget(env) ?? defaultInstallTarget;
  const artifact = createInstallArtifact(target);
  const rootOptions = Object.assign({}, options, { env, target });
  const root = resolveInstallRoot(rootOptions);
  const destination = join(root, artifact.relativePath);
  const destinationExists = existsSync(destination);
  const shouldRefuseExisting = destinationExists && !options.force;
  if (shouldRefuseExisting) throw new Error(`${destination} already exists; use --force to replace it`);

  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, artifact.content);
  return destination;
}

function parseInstallTarget(value: string | undefined): AgentInstallTarget | undefined {
  if (value === undefined) return undefined;
  if (value === "auto") return undefined;

  const isKnownTarget = installTargets.includes(value as AgentInstallTarget);
  if (isKnownTarget) return value as AgentInstallTarget;

  throw new Error(`Unknown agent install target: ${value}`);
}

function getArgValue(args: readonly string[], name: string): string | undefined {
  const equalsPrefix = `${name}=`;
  const equalsArg = args.find((arg) => arg.startsWith(equalsPrefix));
  const hasEqualsArg = equalsArg !== undefined;
  if (hasEqualsArg) return equalsArg.slice(equalsPrefix.length);

  const index = args.indexOf(name);
  const isArgMissing = index === -1;
  if (isArgMissing) return undefined;

  const value = args[index + 1];
  const isMissingValue = !value;
  if (isMissingValue) return undefined;

  const isNextFlag = value.startsWith("--");
  if (isNextFlag) return undefined;

  return value;
}

function getCodexInstallRoot(env: NodeJS.ProcessEnv, home: string): string {
  const hasCodexHome = Boolean(env.CODEX_HOME);
  if (hasCodexHome) return join(String(env.CODEX_HOME), "skills");

  return join(home, ".codex", "skills");
}

function createSkillInstallArtifact(target: AgentInstallTarget): AgentInstallArtifact {
  const content = renderAgentSkill();
  const relativePath = join(agentSkillName, "SKILL.md");
  return { content, relativePath, target };
}

function createClaudeInstallArtifact(): AgentInstallArtifact {
  const content = renderClaudeRule();
  const relativePath = `${agentSkillName}.md`;
  return { content, relativePath, target: claudeInstallTarget };
}

function renderClaudeRule(): string {
  return agentSkillBody;
}

export function runInstallCli(args: readonly string[], env: NodeJS.ProcessEnv): void {
  const options = parseInstallOptions(args);
  const installOptions = Object.assign({}, options, { env });
  const destination = installAgentSkill(installOptions);
  process.stdout.write(`installed ${agentSkillName} to ${destination}\n`);
}

export function reportCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
