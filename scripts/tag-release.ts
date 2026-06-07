import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const DEFAULT_PUBLISH_ENVIRONMENT = "npm-publish";

function parseArgs(args) {
  return {
    dryRun: args.includes("--dry-run"),
    trustedPublishing: args.includes("--trusted-publishing"),
  };
}

function formatTagName(version) {
  if (!VERSION_PATTERN.test(version)) throw new Error(`Invalid package version: ${version}`);
  return `v${version}`;
}

function readPackageVersion(cwd) {
  const manifest = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  if (typeof manifest.version !== "string") throw new Error("package.json version is missing");
  return manifest.version;
}

function readPackageRepository(cwd) {
  const manifest = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  return parseRepositoryName(manifest.repository);
}

function parseRepositoryName(repository) {
  const url = typeof repository === "string" ? repository : repository?.url;
  if (typeof url !== "string") throw new Error("package.json repository URL is missing");

  const match = url.match(/github\.com[:/]([^/#]+)\/([^/#]+?)(?:\.git)?(?:[#/].*)?$/);
  if (!match) throw new Error(`Unable to resolve GitHub repository from: ${url}`);
  return `${match[1]}/${match[2]}`;
}

function createGitRunner(cwd) {
  return (args) => {
    const result = spawnSync("git", Array.from(args), { cwd, encoding: "utf8" });
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  };
}

function createGhRunner(cwd) {
  return (args) => {
    const result = spawnSync("gh", Array.from(args), { cwd, encoding: "utf8" });
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  };
}

function gitText(git, args, message) {
  const result = git(args);
  if (result.status === 0) return result.stdout.trim();
  throw new Error(result.stderr.trim() || message);
}

function assertMissingTag(git, tagName) {
  const localTag = git(["rev-parse", "-q", "--verify", `refs/tags/${tagName}`]);
  if (localTag.status === 0) throw new Error(`Local tag already exists: ${tagName}`);

  const remoteTag = git(["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tagName}`]);
  if (remoteTag.status === 0) throw new Error(`Remote tag already exists: ${tagName}`);
  if (remoteTag.status === 2) return;
  throw new Error(remoteTag.stderr.trim() || `Unable to check remote tag: ${tagName}`);
}

function assertReleaseReady(
  git,
  tagName,
  { dryRun = false, requireUpstream = true } = {},
) {
  const branch = gitText(git, ["branch", "--show-current"], "Unable to read current branch");
  if (branch !== "main") throw new Error("Release tags must be created from main");

  const status = gitText(git, ["status", "--short"], "Unable to read working tree status");
  if (status) throw new Error("Working tree must be clean before tagging a release");

  if (!dryRun) gitText(git, ["fetch", "origin", "main", "--tags"], "Unable to fetch origin/main");
  if (!requireUpstream) {
    assertMissingTag(git, tagName);
    return;
  }

  const head = gitText(git, ["rev-parse", "HEAD"], "Unable to read HEAD");
  const upstream = gitText(git, ["rev-parse", "origin/main"], "Unable to read origin/main");
  if (head !== upstream) throw new Error("Local main must match origin/main before tagging");

  assertMissingTag(git, tagName);
}

function parseSecretNames(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function secretListHasNpmToken(result) {
  return result.status === 0 && parseSecretNames(result.stdout).includes("NPM_TOKEN");
}

function assertPublishAuthReady({
  environment = DEFAULT_PUBLISH_ENVIRONMENT,
  gh,
  repository,
  trustedPublishing = false,
}: any = {}) {
  if (trustedPublishing) return;
  if (!repository) throw new Error("GitHub repository is required for publish auth checks");

  const repoSecrets = gh(["secret", "list", "--repo", repository]);
  if (secretListHasNpmToken(repoSecrets)) return;
  if (repoSecrets.status !== 0) {
    throw new Error(repoSecrets.stderr.trim() || "Unable to list repository secrets");
  }

  const environmentSecrets = gh(["secret", "list", "--env", environment, "--repo", repository]);
  if (secretListHasNpmToken(environmentSecrets)) return;
  if (environmentSecrets.status !== 0) {
    throw new Error(environmentSecrets.stderr.trim() || `Unable to list ${environment} secrets`);
  }

  throw new Error(
    [
      `NPM_TOKEN secret is not configured for ${repository}.`,
      `Add NPM_TOKEN to the repository or ${environment} environment before tagging,`,
      "or pass --trusted-publishing after configuring npm trusted publishing for this package.",
    ].join(" "),
  );
}

function runReleaseTag({
  cwd = process.cwd(),
  dryRun = false,
  git = createGitRunner(cwd),
  gh = createGhRunner(cwd),
  logger = console,
  publishEnvironment = DEFAULT_PUBLISH_ENVIRONMENT,
  requireUpstream = true,
  repository = readPackageRepository(cwd),
  trustedPublishing = false,
  version = readPackageVersion(cwd),
} = {}) {
  const tagName = formatTagName(version);
  assertReleaseReady(git, tagName, { dryRun, requireUpstream });

  if (dryRun) {
    logger.log(`Dry run: would create and push ${tagName}`);
    return 0;
  }

  assertPublishAuthReady({
    environment: publishEnvironment,
    gh,
    repository,
    trustedPublishing,
  });

  gitText(
    git,
    ["tag", "--annotate", tagName, "--message", `Release ${version}`],
    "Unable to create tag",
  );
  const push = git(["push", "origin", `refs/tags/${tagName}`]);
  if (push.status === 0) {
    logger.log(`Pushed ${tagName}`);
    return 0;
  }

  git(["tag", "--delete", tagName]);
  throw new Error(push.stderr.trim() || `Unable to push ${tagName}`);
}

export {
  assertMissingTag,
  assertPublishAuthReady,
  assertReleaseReady,
  createGitRunner,
  createGhRunner,
  formatTagName,
  gitText,
  parseArgs,
  parseRepositoryName,
  parseSecretNames,
  readPackageRepository,
  readPackageVersion,
  runReleaseTag,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = runReleaseTag(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
