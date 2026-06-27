export type AgentBuildTarget = "agents" | "claude" | "codex" | "package";
export type AgentInstallTarget = "agents" | "claude" | "codex";

export interface AgentSkillDefinition {
  body: string;
  description: string;
  name: string;
  title: string;
}

export interface AgentArtifact {
  content: string;
  relativePath: string;
  target: AgentBuildTarget;
}

export interface AgentInstallArtifact {
  content: string;
  relativePath: string;
  target: AgentInstallTarget;
}

export interface AgentBuildOptions {
  env?: NodeJS.ProcessEnv;
  root?: string;
  targets?: readonly AgentBuildTarget[];
}

export interface AgentInstallOptions {
  env?: NodeJS.ProcessEnv;
  force?: boolean;
  home?: string;
  path?: string;
  target?: AgentInstallTarget;
}
