export type HookName = "pre-commit" | "post-merge";
export type ObsoleteHookName = "commit-msg";

export interface InstallHooksOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface HookPlan {
  action: "skip" | "write";
  hookName: HookName;
  reason: "managed" | "missing" | "unmanaged";
}

export interface InstallHooksResult {
  removed: ObsoleteHookName[];
  skipped: HookName[];
  written: HookName[];
}
