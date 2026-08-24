import type { E2eMode, TestRunMode } from "./types.ts";

export const testModes = new Set<TestRunMode>(["bun-ts", "coverage", "deno-ts", "node-ts"]);
export const e2eModes = new Set<E2eMode>(["benchmark", "test"]);
export const composeFile = "tests/e2e/docker/compose.yml";
export const coverageFile = "coverage/lcov.info";
export const testFileExtension = ".test.ts";
