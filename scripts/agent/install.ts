#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  agentSkillBody,
  agentSkillName,
  agentsInstallTarget,
  claudeInstallTarget,
  codexInstallTarget,
  defaultInstallTarget,
  installTargets,
} from "./constants.ts";
import { detectBuildTarget, isDirectRun, renderAgentSkill } from "./build.ts";
import type {
  AgentInstallArtifact,
  AgentInstallOptions,
  AgentInstallTarget,
} from "./types.ts";

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

function runInstallCli(args: readonly string[], env: NodeJS.ProcessEnv): void {
  const options = parseInstallOptions(args);
  const installOptions = Object.assign({}, options, { env });
  const destination = installAgentSkill(installOptions);
  process.stdout.write(`installed ${agentSkillName} to ${destination}\n`);
}

function reportCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

const isRunningDirectly = isDirectRun(import.meta.url, process.argv[1]);

if (isRunningDirectly) {
  try {
    runInstallCli(process.argv.slice(2), process.env);
  } catch (error) {
    reportCliError(error);
  }
}
