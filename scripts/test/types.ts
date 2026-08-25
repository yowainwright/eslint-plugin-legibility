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

export type TestRunMode = "bun-ts" | "coverage" | "deno-ts" | "node-ts";

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
