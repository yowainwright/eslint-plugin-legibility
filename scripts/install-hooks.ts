import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  HookName,
  HookPlan,
  InstallHooksOptions,
  InstallHooksResult,
  ObsoleteHookName,
} from "./types.ts";

export const managedHookMarker = "legibility-managed-hook";
export const hookNames = ["pre-commit", "post-merge"] as const satisfies readonly HookName[];
export const obsoleteHookNames = ["commit-msg"] as const satisfies readonly ObsoleteHookName[];

export function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  const ci = env.CI;
  const isTrueValue = ci === "true";
  const isNumericValue = ci === "1";
  const isCi = isTrueValue || isNumericValue;
  return isCi;
}

export function getHooksDirectory(cwd: string): string {
  return join(cwd, ".git", "hooks");
}

export function getHookPath(cwd: string, hookName: HookName | ObsoleteHookName): string {
  return join(getHooksDirectory(cwd), hookName);
}

export function hasManagedHookMarker(content: string): boolean {
  return content.includes(managedHookMarker);
}

export function createChangedFileLookup(changedFiles: readonly string[]): ReadonlySet<string> {
  const changedFileLookup = new Set(changedFiles);
  return changedFileLookup;
}

export function shouldRefreshDependencies(changedFiles: readonly string[]): boolean {
  const changedFileLookup = createChangedFileLookup(changedFiles);
  const packageManifestChanged = changedFileLookup.has("package.json");
  const lockfileChanged = changedFileLookup.has("pnpm-lock.yaml");
  const shouldRefresh = packageManifestChanged || lockfileChanged;
  return shouldRefresh;
}

export function createPreCommitHook(): string {
  return `#!/bin/sh
# ${managedHookMarker}

set -eu

pnpm validate
`;
}

export function createPostMergeHook(): string {
  return `#!/bin/sh
# ${managedHookMarker}

set -eu

changed_files="$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD || true)"

case "$changed_files" in
  *package.json*|*pnpm-lock.yaml*)
    echo "Dependencies changed; running pnpm install --frozen-lockfile"
    pnpm install --frozen-lockfile
    ;;
esac
`;
}

export function createHookContent(hookName: HookName): string {
  if (hookName === "pre-commit") return createPreCommitHook();
  return createPostMergeHook();
}

export function planHookInstall(
  hookName: HookName,
  existingContent: string | null,
): HookPlan {
  if (existingContent === null) {
    return { action: "write", hookName, reason: "missing" };
  }

  const isManagedHook = hasManagedHookMarker(existingContent);
  if (isManagedHook) {
    return { action: "write", hookName, reason: "managed" };
  }

  return { action: "skip", hookName, reason: "unmanaged" };
}

export function readHookContent(path: string): string | null {
  const hookExists = existsSync(path);
  if (!hookExists) return null;

  const content = readFileSync(path, "utf8");
  return content;
}

export function writeHook(path: string, content: string): void {
  writeFileSync(path, content, { mode: 0o755 });
  chmodSync(path, 0o755);
}

export function removeObsoleteManagedHook(cwd: string, hookName: ObsoleteHookName): boolean {
  const hookPath = getHookPath(cwd, hookName);
  const content = readHookContent(hookPath);
  if (content === null) return false;
  if (!hasManagedHookMarker(content)) return false;

  rmSync(hookPath);
  return true;
}

export function installManagedHook(cwd: string, hookName: HookName): HookPlan {
  const hookPath = getHookPath(cwd, hookName);
  const existingContent = readHookContent(hookPath);
  const plan = planHookInstall(hookName, existingContent);
  if (plan.action === "write") {
    writeHook(hookPath, createHookContent(hookName));
  }
  return plan;
}

export function getSkippedHookNames(plans: readonly HookPlan[]): HookName[] {
  const skippedHookNames = plans
    .filter((plan) => plan.action === "skip")
    .map((plan) => plan.hookName);
  return skippedHookNames;
}

export function getWrittenHookNames(plans: readonly HookPlan[]): HookName[] {
  const writtenHookNames = plans
    .filter((plan) => plan.action === "write")
    .map((plan) => plan.hookName);
  return writtenHookNames;
}

export function installHooks(options: InstallHooksOptions = {}): InstallHooksResult {
  const cwd = resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;

  if (isCiEnvironment(env)) {
    return { removed: [], skipped: [], written: [] };
  }

  const gitDirectory = join(cwd, ".git");
  const isGitRepository = existsSync(gitDirectory);
  if (!isGitRepository) {
    return { removed: [], skipped: [], written: [] };
  }

  mkdirSync(getHooksDirectory(cwd), { recursive: true });

  const plans = hookNames.map((hookName) => installManagedHook(cwd, hookName));
  const removed = obsoleteHookNames.filter((hookName) => removeObsoleteManagedHook(cwd, hookName));
  const skipped = getSkippedHookNames(plans);
  const written = getWrittenHookNames(plans);
  return { removed, skipped, written };
}

export function isDirectRun(metaUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) return false;
  return pathToFileURL(resolve(argvPath)).href === metaUrl;
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  installHooks();
}
