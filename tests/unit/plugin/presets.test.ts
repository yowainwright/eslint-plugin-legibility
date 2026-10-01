import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { Linter } from "eslint";

import plugin from "../../../dist/index.js";
import oxlintPlugin from "../../../dist/oxlint.js";

const casingRule = "legibility/no-mixed-filename-casing";
const linter = new Linter({ configType: "flat" });

function lint(config: unknown, filename?: string) {
  return linter.verify("", config as Linter.Config[], { filename });
}

["flat/strict", "flat/all", "flat/agent-strict"].forEach((name) => {
  test(`${name} enables every registered rule as an error`, () => {
    const preset = plugin.configs[name];
    Object.keys(plugin.rules).forEach((rule) => {
      const value = preset.rules[`legibility/${rule}`];
      assert.equal(Array.isArray(value) ? value[0] : value, "error", rule);
    });
    assert.deepEqual(lint([preset], "index.js"), []);
  });

  test(`${name} requires shebangs only for default CLI entrypoints`, () => {
    const preset = plugin.configs[name];
    assert.deepEqual(lint([preset], "src/index.js"), []);
    const messages = lint([preset], "src/cli/index.js");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].ruleId, "legibility/require-executable-shebang");
    assert.equal(messages[0].severity, 2);
  });
});

test("all exports mirror strict for ESLint and Oxlint", () => {
  assert.equal(plugin.configs["flat/all"], plugin.configs["flat/strict"]);
  assert.equal(plugin.configs["oxlint/all"], plugin.configs["oxlint/strict"]);
  assert.deepEqual(oxlintPlugin.configs.all, oxlintPlugin.configs.strict);
  assert.deepEqual(oxlintPlugin.configs.all.rules, plugin.configs["flat/all"].rules);
});

const validNames = ["get-user.js", "getUser.js", "index.js", ".eslintrc.js", "get-user.test.js", "getUser.test.js"];
const invalidNames = ["get_user.js", "GetUser.js", "get-User.js", "get-userName.js", "get__user.js", "get--user.js"];

Object.entries(plugin.configs).filter(([name]) => name.startsWith("flat/")).forEach(([name, preset]) => {
  test(`${name} defaults to camelCase or kebab-case errors`, () => {
    validNames.forEach((filename) => {
      assert.deepEqual(lint([preset], filename), [], filename);
    });
    invalidNames.forEach((filename) => {
      const messages = lint([preset], filename);
      assert.equal(messages.length, 1, filename);
      assert.equal(messages[0].ruleId, casingRule);
      assert.equal(messages[0].severity, 2);
    });
  });
});

test("filename styles and severity can be overridden by scope", () => {
  const config = [
    plugin.configs["flat/recommended"],
    { files: ["camel/*.js"], rules: { [casingRule]: ["error", { case: "camelCase" }] } },
    { files: ["kebab/*.js"], rules: { [casingRule]: ["warn", { case: "kebabCase" }] } },
  ];
  assert.deepEqual(lint(config, "camel/getUser.js"), []);
  assert.equal(lint(config, "camel/get-user.js")[0].severity, 2);
  assert.deepEqual(lint(config, "kebab/get-user.js"), []);
  assert.equal(lint(config, "kebab/getUser.js")[0].severity, 1);
  assert.deepEqual(lint(config, "other/getUser.js"), []);
});

test("explicit cases replace the default styles", () => {
  const cases = { snakeCase: true, pascalCase: true, camelCase: false };
  const config = [{ plugins: { legibility: plugin }, rules: { [casingRule]: ["error", { cases }] } }];
  assert.deepEqual(lint(config, "get_user.js"), []);
  assert.deepEqual(lint(config, "GetUser.js"), []);
  assert.equal(lint(config, "getUser.js").length, 1);
  assert.equal(lint(config, "get-user.js").length, 1);
});

test("invalid filename case options fail config validation", () => {
  const options = [
    { case: "unknown" },
    { cases: {} },
    { cases: { camelCase: false } },
    { cases: { camelCase: true, unknown: true } },
    { case: "camelCase", cases: { kebabCase: true } },
  ];
  options.forEach((option) => {
    const config = [{ plugins: { legibility: plugin }, rules: { [casingRule]: ["error", option] } }];
    assert.throws(() => lint(config, "index.js"));
  });
});

test("filename checks ignore virtual ESLint input", () => {
  assert.deepEqual(lint([plugin.configs["flat/recommended"]]), []);
});

test("Oxlint all loads every rule with working defaults and scoped casing", (t) => {
  const root = resolve("tests");
  const directory = mkdtempSync(join(root, "preset-casing-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const pluginPath = pathToFileURL(resolve("dist/oxlint.js")).href;
  const configPath = join(directory, "oxlint.config.mjs");
  const content = `import plugin from ${JSON.stringify(pluginPath)};
export default {
  ...plugin.configs.all,
  overrides: [{ files: ["**/camel/*.js"], rules: {
    "legibility/no-mixed-filename-casing": ["warn", { case: "camelCase" }]
  } }]
};\n`;
  writeFileSync(configPath, content);
  const filename = join(directory, "index.js");
  writeFileSync(filename, "export {};\n");
  const binary = resolve("node_modules/.bin/oxlint");
  const args = ["--config", configPath, "--format", "json"];
  const valid = spawnSync(binary, args.concat(filename), { encoding: "utf8" });
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
  assert.deepEqual(JSON.parse(valid.stdout).diagnostics, []);
  mkdirSync(join(directory, "camel"));
  const invalidFile = join(directory, "camel", "get-user.js");
  writeFileSync(invalidFile, "export {};\n");
  const invalid = spawnSync(binary, args.concat(invalidFile), { encoding: "utf8" });
  assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
  const messages = JSON.parse(invalid.stdout).diagnostics;
  const casing = messages.find((message) => message.code === "legibility(no-mixed-filename-casing)");
  assert.equal(casing?.severity, "warning", invalid.stdout);
});
