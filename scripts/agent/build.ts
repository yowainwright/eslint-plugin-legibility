#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  agentSkillBody,
  agentSkillDescription,
  agentSkillName,
  agentSkillTitle,
  agentsBuildTarget,
  buildTargets,
  claudeBuildTarget,
  codexBuildTarget,
  defaultBuildTarget,
  packageBuildTarget,
} from "./constants.ts";
import type {
  AgentArtifact,
  AgentBuildOptions,
  AgentBuildTarget,
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
  const sharedSkill = "`.agents/skills/eslint-plugin-legibility/SKILL.md`";
  const command = "`pnpm build:agent -- --target agents`";
  return [
    `# eslint-plugin-legibility ${target} Rules`,
    `Use ${sharedSkill} as the shared agent skill workflow.`,
    `Generate the shared skill with ${command} when it is missing.`,
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
  const isCodexEnvironment = env.CODEX_HOME !== undefined;
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

  const argvUrl = pathToFileURL(resolve(argvPath)).href;
  return argvUrl === metaUrl;
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

function runBuildCli(args: readonly string[], env: NodeJS.ProcessEnv): void {
  const targets = parseBuildTargets(args, env);
  const artifacts = writeAgentArtifacts({ targets });
  artifacts.forEach((artifact) => process.stdout.write(`wrote ${artifact.relativePath}\n`));
}

function reportCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

const isRunningDirectly = isDirectRun(import.meta.url, process.argv[1]);

if (isRunningDirectly) {
  try {
    runBuildCli(process.argv.slice(2), process.env);
  } catch (error) {
    reportCliError(error);
  }
}
