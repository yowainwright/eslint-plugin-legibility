#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { basename } from "node:path";

import {
  isDirectRun,
  reportCliError,
  runBuildCli,
  runInstallCli,
} from "./utils.ts";

function isInstallInvocation(path: string | undefined): boolean {
  if (!path) return false;

  try {
    return basename(realpathSync(path)) === "install.js";
  } catch {
    return basename(path) === "install.js";
  }
}

const isRunningDirectly = isDirectRun(import.meta.url, process.argv[1]);

if (isRunningDirectly) {
  try {
    const isInstall = isInstallInvocation(process.argv[1]);
    const runCli = isInstall ? runInstallCli : runBuildCli;
    runCli(process.argv.slice(2), process.env);
  } catch (error) {
    reportCliError(error);
  }
}
