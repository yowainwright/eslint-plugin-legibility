export type PreRelease = "alpha" | "beta" | "rc";
export type ReleaseIncrement = "major" | "minor" | "patch";
export type E2eMode = "benchmark" | "test";

export interface E2eRunPlan {
  args: string[];
  command: "docker";
}

export interface E2eCommandResult {
  status: number | null;
}

export type E2eCommandRunner = (
  command: string,
  args: readonly string[],
) => E2eCommandResult;

export interface ReleaseArgs {
  current: boolean;
  dryRun: boolean;
  increment?: ReleaseIncrement;
  preRelease?: PreRelease;
  yes: boolean;
}

export interface ReleaseCommandResult {
  status: number | null;
  stderr: string;
  stdout: string;
}

export type ReleaseRunner = (
  command: string,
  args: readonly string[],
) => ReleaseCommandResult;

export type ReleaseConfirm = (question: string) => Promise<boolean>;
export type ReleaseLogger = Pick<Console, "error" | "log" | "warn">;

export interface ReleaseOptions {
  args?: readonly string[];
  confirm?: ReleaseConfirm;
  cwd?: string;
  logger?: ReleaseLogger;
  runner?: ReleaseRunner;
}

export interface ReleasePlan {
  command: string;
  distTag: string;
  question: string;
  releaseItArgs: string[];
  tagName: string;
  version: string;
}

export interface RepoCommandResult {
  status: number | null;
}

export type RepoCommandRunner = (
  command: string,
  args: readonly string[],
) => RepoCommandResult;

export type RepoManagerTarget = "pack" | "parse-pack-output" | "validate";
