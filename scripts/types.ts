export type PreRelease = "alpha" | "beta" | "rc";
export type ReleaseIncrement = "major" | "minor" | "patch";

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

export type TestRunMode = "bun-ts" | "coverage" | "deno-ts" | "node-js" | "node-ts";

export interface TestRunPlan {
  command: string;
  args: string[];
  coverageFile?: string;
  testDirectories: string[];
}

export interface TestCommandResult {
  status: number | null;
}

export type TestCommandRunner = (
  command: string,
  args: readonly string[],
) => TestCommandResult;
