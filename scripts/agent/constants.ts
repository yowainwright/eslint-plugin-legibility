import type { AgentBuildTarget, AgentInstallTarget } from "./types.ts";

export const agentSkillName = "eslint-plugin-legibility";
export const agentSkillTitle = "ESLint Plugin Legibility";
export const defaultBuildTarget: AgentBuildTarget = "package";
export const defaultInstallTarget: AgentInstallTarget = "agents";
export const packageBuildTarget: AgentBuildTarget = "package";
export const agentsBuildTarget: AgentBuildTarget = "agents";
export const codexBuildTarget: AgentBuildTarget = "codex";
export const claudeBuildTarget: AgentBuildTarget = "claude";
export const agentsInstallTarget: AgentInstallTarget = "agents";
export const codexInstallTarget: AgentInstallTarget = "codex";
export const claudeInstallTarget: AgentInstallTarget = "claude";

export const buildTargets: readonly AgentBuildTarget[] = [
  packageBuildTarget,
  agentsBuildTarget,
  codexBuildTarget,
  claudeBuildTarget,
];

export const installTargets: readonly AgentInstallTarget[] = [
  agentsInstallTarget,
  codexInstallTarget,
  claudeInstallTarget,
];

const descriptionStart = "Use when checking JavaScript or TypeScript readability";
const descriptionTool = "with eslint-plugin-legibility, fixing legibility diagnostics,";
const descriptionInstall = "installing the packaged agent skill, maintaining this repository,";
const descriptionLoop = "or guiding agents through a repeatable changed-file lint feedback loop.";

export const agentSkillDescription = [
  descriptionStart,
  descriptionTool,
  descriptionInstall,
  descriptionLoop,
].join(" ");

const purposeHeading = "# ESLint Plugin Legibility";
const purposeBody =
  "Use `eslint-plugin-legibility` with ESLint or Oxlint to keep JavaScript and TypeScript readable during agent-assisted development. Prefer small, behavior-preserving edits that make conditions, computed values, collection processing, naming, and control flow easier to review.";

const compatibilityHeading = "## Agent Compatibility";
const compatibilityBody =
  "Use this as the shared workflow for Codex, Claude, and generic agent skill roots. Keep tool-specific rule files as generated pointers or thin wrappers over this content.";

const installHeading = "## Package Install";
const installBody = [
  "The npm package ships this skill, but does not install it automatically. After installing the package, install the skill explicitly:",
  "```sh\nnpx eslint-plugin-legibility-install-skill\n```",
  "For a specific agent target:",
  "```sh\nnpx eslint-plugin-legibility-install-skill --target codex\nnpx eslint-plugin-legibility-install-skill --target claude\n```",
].join("\n\n");

const cleanupHeading = "## Developer Cleanup Loop";
const cleanupIntro = [
  "1. Inspect the changed JavaScript and TypeScript files before editing.",
  "2. Run changed-file linting:",
  "   ```sh\n   npx lint-changed\n   ```",
  "3. Pass a base ref when the branch does not target `origin/main`:",
  "   ```sh\n   npx lint-changed origin/develop\n   ```",
  "4. Fix actionable diagnostics with behavior-preserving edits:",
].join("\n");

const cleanupEdits = [
  "   - Hoist operator-heavy conditions into named booleans.",
  "   - Prefer guard clauses and early returns over nested main paths.",
  "   - Name intermediate computed values before returns and object or array values.",
  "   - Replace repeated collection scans with lookups.",
  "   - Split long array chains when each step deserves a name.",
  "   - Keep JSX and object literals free of hidden complex logic.",
].join("\n");

const cleanupClose = [
  "5. Re-run `npx lint-changed` until the touched files are clean or only documented unrelated failures remain.",
  "Do not run `eslint .`, `pnpm lint`, or `oxlint .` for the cleanup loop unless the user asks for full-repo validation.",
].join("\n\n");

const maintenanceHeading = "## Repository Maintenance Loop";
const maintenanceCommands = "```sh\npnpm build\nnpx lint-changed\npnpm test\n```";
const maintenanceFullCheck = "```sh\npnpm validate\n```";
const maintenanceBody = [
  "In this repository, use the local package:",
  maintenanceCommands,
  "For a full release-grade check:",
  maintenanceFullCheck,
  "When changing public rule behavior:",
].join("\n\n");

const maintenanceEdits = [
  "- Update rule metadata and implementation in `src/constants.ts` and `src/index.ts`.",
  "- Add positive and negative tests in `tests/unit/plugin`.",
  "- Update README rule tables and examples when public behavior changed.",
  "- Rebuild generated agent artifacts with `pnpm build:agent -- --target all`.",
].join("\n");

const reviewHeading = "## Review Guidance";
const reviewBody = [
  "- Do not install dependencies or fetch packages unless the user asked for it.",
  "- Do not rewrite code just to satisfy a diagnostic when behavior would become less clear.",
  "- Treat false positives as rule bugs and add regression tests before broadening detection.",
  "- Keep generated build artifacts out of commits unless they are package-facing artifacts.",
].join("\n");

export const agentSkillBody = [
  purposeHeading,
  purposeBody,
  compatibilityHeading,
  compatibilityBody,
  installHeading,
  installBody,
  cleanupHeading,
  cleanupIntro,
  cleanupEdits,
  cleanupClose,
  maintenanceHeading,
  maintenanceBody,
  maintenanceEdits,
  reviewHeading,
  reviewBody,
].join("\n\n");
