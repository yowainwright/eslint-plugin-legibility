import assert from "node:assert/strict";
import test from "node:test";

import plugin from "../../dist/index.js";
import type { RuleReport } from "../../dist/types.js";

const denoShebangText = "#!/usr/bin/env deno run --allow-read\nconsole.log('ok');\n";
const denoSourceCode = {
  text: denoShebangText,
  getText: () => denoShebangText,
};

function createDenoShebangContext(reports: RuleReport[]) {
  return {
    cwd: "/repo",
    filename: "/repo/src/index.ts",
    options: [],
    sourceCode: denoSourceCode,
    report(report: RuleReport) {
      reports.push(report);
    },
  };
}

function getDenoShebangReports(): RuleReport[] {
  const reports: RuleReport[] = [];
  const context = createDenoShebangContext(reports);
  const visitor = plugin.rules["require-executable-shebang"].create(context);

  visitor.Program({ type: "Program" });

  return reports;
}

test("Deno imports the built plugin", () => {
  assert.equal(plugin.meta.name, "legibility");
  assert.ok(plugin.configs["flat/recommended"].plugins.legibility);
});

test("Deno shebangs are accepted by default", () => {
  const reports = getDenoShebangReports();

  assert.equal(reports.length, 0);
});
