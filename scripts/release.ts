"use strict";

const { spawnSync } = require("node:child_process");
const { readPackageVersion, runReleaseTag } = require("./tag-release.js");

const VERSION_PATTERN = /\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/g;
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const PRE_RELEASES = new Set(["alpha", "beta", "rc"]);
const RELEASE_INCREMENTS = new Set(["patch", "minor", "major"]);
const SAFE_SHELL_ARG_PATTERN = /^[A-Za-z0-9_./:=@-]+$/;

function parseArgs(args) {
  const preRelease = parsePreRelease(args);
  const increment = parseIncrement(args);
  return Object.assign(
    {
      dryRun: args.includes("--dry-run"),
      trustedPublishing: args.includes("--trusted-publishing"),
    },
    increment ? { increment } : undefined,
    preRelease ? { preRelease } : undefined,
  );
}

function buildReleaseItArgs(options) {
  const args = [
    "--git.tag=false",
    "--git.push=false",
    "--git.requireUpstream=false",
    "--git.getLatestTagFromAllRefs=true",
    "--ci",
  ];
  const releaseArgs = options.preRelease ? [`--preRelease=${options.preRelease}`, ...args] : args;
  if (options.version) return [options.version, ...releaseArgs];
  if (options.increment) return [`--increment=${options.increment}`, ...releaseArgs];
  return releaseArgs;
}

function parseReleaseVersion(output) {
  const matches = output.match(VERSION_PATTERN);
  const version = matches?.at(-1);
  if (!version) throw new Error("Unable to resolve release version");
  return version;
}

function quoteShellArg(arg) {
  return SAFE_SHELL_ARG_PATTERN.test(arg) ? arg : JSON.stringify(arg);
}

function formatShellCommand(command, args) {
  return [command, ...args].map(quoteShellArg).join(" ");
}

function buildReleaseCommands(version, releaseArgs) {
  const tagName = `v${version}`;
  return [
    formatShellCommand(
      "./node_modules/.bin/release-it",
      buildReleaseItArgs({ preRelease: releaseArgs.preRelease, version }),
    ),
    formatShellCommand("git", ["tag", "--annotate", tagName, "--message", `Release ${version}`]),
    formatShellCommand("git", ["push", "origin", `refs/tags/${tagName}`]),
  ];
}

function buildReleasePlan(version, releaseArgs) {
  const tagName = `v${version}`;
  return {
    commands: buildReleaseCommands(version, releaseArgs),
    steps: [
      "verify clean, up-to-date main",
      "create the release commit without pushing main",
      `push ${tagName} to trigger publishing`,
      "restore local main to its starting commit",
    ],
    tagName,
    version,
  };
}

function buildCurrentVersionTagPlan(version) {
  const tagName = `v${version}`;
  return {
    commands: [
      formatShellCommand("git", ["tag", "--annotate", tagName, "--message", `Release ${version}`]),
      formatShellCommand("git", ["push", "origin", `refs/tags/${tagName}`]),
    ],
    steps: ["verify clean, up-to-date main", `push ${tagName} to trigger publishing`],
    tagName,
    version,
  };
}

function formatReleasePlan(plan) {
  const steps = plan.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const commands = plan.commands.map((command, index) => `${index + 1}. ${command}`).join("\n");
  return [
    `Dry run release commands for ${plan.tagName}`,
    `Version: ${plan.version}`,
    "",
    "Steps:",
    steps,
    "",
    "Commands:",
    commands,
  ].join("\n");
}

function createRunner(cwd) {
  return (command, args) => {
    const result = spawnSync(command, Array.from(args), { cwd, encoding: "utf8" });
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  };
}

async function runRelease(options: any = {}) {
  const cwd = options.cwd ?? process.cwd();
  const logger = options.logger ?? console;
  const runner = options.runner ?? createRunner(cwd);
  const releaseArgs = normalizeOptions(options);
  const startingHead = assertMainReady(runner);
  const packageVersion = options.packageVersion ?? readPackageVersion(cwd);

  const shouldTagCurrentVersion =
    !releaseArgs.preRelease && !releaseArgs.increment && isPreReleaseVersion(packageVersion);
  if (shouldTagCurrentVersion) {
    if (releaseArgs.dryRun) {
      assertReleaseTagAvailable(runner, packageVersion);
      logger.log(formatReleasePlan(buildCurrentVersionTagPlan(packageVersion)));
      return 0;
    }

    runReleaseTag({
      cwd,
      git: (args) => runner("git", args),
      logger,
      requireUpstream: false,
      trustedPublishing: releaseArgs.trustedPublishing,
      version: packageVersion,
    });
    logger.log(`Tagged current package version ${packageVersion}.`);
    return 0;
  }

  if (!releaseArgs.preRelease && !releaseArgs.increment) {
    throw new Error("Stable releases require an explicit increment: patch, minor, or major");
  }

  const version = resolveReleaseVersion(runner, releaseArgs);

  if (releaseArgs.dryRun) {
    logger.log(formatReleasePlan(buildReleasePlan(version, releaseArgs)));
    return 0;
  }

  try {
    createReleaseCommit(runner, releaseArgs, version);
    runReleaseTag({
      cwd,
      git: (args) => runner("git", args),
      logger,
      requireUpstream: false,
      trustedPublishing: releaseArgs.trustedPublishing,
      version,
    });
    logger.log("No PR was created and main was not pushed.");
    return 0;
  } finally {
    restoreStartingHead(runner, startingHead);
  }
}

function isPreReleaseVersion(version) {
  return /^\d+\.\d+\.\d+-[0-9A-Za-z.-]+(?:\+[0-9A-Za-z.-]+)?$/.test(version);
}

function isStableVersion(version) {
  return STABLE_VERSION_PATTERN.test(version);
}

function normalizeOptions(options) {
  return {
    dryRun: options.dryRun ?? false,
    increment: options.increment,
    preRelease: options.preRelease,
    trustedPublishing: options.trustedPublishing ?? false,
  };
}

function parseIncrement(args) {
  const flagValue = args.find((arg) => arg.startsWith("--increment="))?.split("=")[1];
  if (flagValue) return validateIncrement(flagValue);

  const positionalValue = args.find((arg) => RELEASE_INCREMENTS.has(arg));
  if (positionalValue) return positionalValue;

  return undefined;
}

function validateIncrement(value) {
  if (RELEASE_INCREMENTS.has(value)) return value;
  throw new Error(`Invalid release increment: ${value}`);
}

function parsePreRelease(args) {
  const value = args.find((arg) => arg.startsWith("--preRelease="))?.split("=")[1];
  if (!value) return undefined;
  if (PRE_RELEASES.has(value)) return value;
  throw new Error(`Invalid prerelease identifier: ${value}`);
}

function commandText(runner, command, args) {
  const result = runner(command, args);
  if (result.status === 0) return result.stdout.trim();
  throw new Error(result.stderr.trim() || `${command} ${args.join(" ")} failed`);
}

function runCommand(runner, command, args) {
  commandText(runner, command, args);
}

function assertMainReady(runner) {
  const branch = commandText(runner, "git", ["branch", "--show-current"]);
  if (branch !== "main") throw new Error("Run releases from main");

  const status = commandText(runner, "git", ["status", "--short"]);
  if (status) throw new Error("Working tree must be clean before starting a release");

  runCommand(runner, "git", ["fetch", "origin", "main", "--tags"]);
  const head = commandText(runner, "git", ["rev-parse", "HEAD"]);
  const upstream = commandText(runner, "git", ["rev-parse", "origin/main"]);
  if (head !== upstream) throw new Error("Local main must match origin/main before release");
  return head;
}

function resolveReleaseVersion(runner, releaseArgs) {
  const output = commandText(runner, "./node_modules/.bin/release-it", [
    "--release-version",
    ...buildReleaseItArgs(releaseArgs),
  ]);
  const version = parseReleaseVersion(output);
  return resolveAvailableReleaseVersion(runner, releaseArgs, version);
}

function incrementPreReleaseVersion(version, preRelease) {
  const match = version.match(/^(\d+\.\d+\.\d+)-([0-9A-Za-z.-]+)\.(\d+)(\+[0-9A-Za-z.-]+)?$/);
  if (!match || match[2] !== preRelease) {
    throw new Error(`Unable to advance ${preRelease} release version: ${version}`);
  }

  const nextPrerelease = Number(match[3]) + 1;
  return `${match[1]}-${preRelease}.${nextPrerelease}${match[4] ?? ""}`;
}

function incrementStableVersion(version, increment) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Unable to advance stable release version: ${version}`);

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (increment === "major") return `${major + 1}.0.0`;
  if (increment === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function releaseTagExists(runner, tagName) {
  const localTag = runner("git", ["rev-parse", "-q", "--verify", `refs/tags/${tagName}`]);
  const localTagError = localTag.stderr.trim();
  if (localTag.status !== 0 && localTagError) {
    throw new Error(localTagError);
  }
  if (localTag.status === 0) return true;

  const remoteTag = runner("git", ["ls-remote", "--tags", "origin", `refs/tags/${tagName}`]);
  if (remoteTag.status !== 0) {
    throw new Error(remoteTag.stderr.trim() || `Unable to check remote tag: ${tagName}`);
  }
  return remoteTag.stdout.trim().length > 0;
}

function assertReleaseTagAvailable(runner, version) {
  const tagName = `v${version}`;
  if (releaseTagExists(runner, tagName)) throw new Error(`Release tag already exists: ${tagName}`);
}

function resolveAvailableReleaseVersion(runner, releaseArgs, version) {
  if (!releaseArgs.preRelease) {
    if (!releaseArgs.increment) {
      throw new Error("Stable release resolution requires an explicit increment");
    }
    if (!isStableVersion(version)) {
      throw new Error(`release-it resolved a prerelease version for a stable release: ${version}`);
    }

    let candidate = version;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const tagName = `v${candidate}`;
      if (!releaseTagExists(runner, tagName)) return candidate;
      candidate = incrementStableVersion(candidate, releaseArgs.increment);
    }

    throw new Error(`Unable to find an available release tag for ${version}`);
  }

  let candidate = version;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const tagName = `v${candidate}`;
    if (!releaseTagExists(runner, tagName)) return candidate;
    candidate = incrementPreReleaseVersion(candidate, releaseArgs.preRelease);
  }

  throw new Error(`Unable to find an available release tag for ${version}`);
}

function createReleaseCommit(runner, releaseArgs, version) {
  runCommand(
    runner,
    "./node_modules/.bin/release-it",
    buildReleaseItArgs({ preRelease: releaseArgs.preRelease, version }),
  );
}

function restoreStartingHead(runner, startingHead) {
  runCommand(runner, "git", ["reset", "--hard", startingHead]);
}

module.exports = {
  buildCurrentVersionTagPlan,
  buildReleaseCommands,
  buildReleaseItArgs,
  buildReleasePlan,
  createRunner,
  formatReleasePlan,
  formatShellCommand,
  incrementPreReleaseVersion,
  incrementStableVersion,
  isPreReleaseVersion,
  isStableVersion,
  parseArgs,
  parseReleaseVersion,
  quoteShellArg,
  releaseTagExists,
  resolveAvailableReleaseVersion,
  runRelease,
};

if (require.main === module) {
  runRelease(parseArgs(process.argv.slice(2)))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
