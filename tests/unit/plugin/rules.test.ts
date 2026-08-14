import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { pathToFileURL } from "node:url";

import manifest from "../../../package.json" with { type: "json" };
import {
  COMMENT_RULE_NAMES,
  OPT_IN_RULE_NAMES,
  RECOMMENDED_RULE_NAMES,
  STRICT_ONLY_RULE_NAMES,
} from "../../../dist/constants.js";
import type { RuleModule } from "../../../src/types.ts";

const require = createRequire(import.meta.url);
const plugin = (await import(pathToFileURL(join(process.cwd(), "dist", "index.js")).href))
  .default;
const requiredPlugin = require(join(process.cwd(), "dist", "index.js"));

function createContext(options: any[] = [], overrides: any = {}) {
  const reports = [];
  const context = {
    options,
    filename: "/repo/src/index.js",
    cwd: "/repo",
    sourceCode: {
      text: "const value = true;\n",
      getText(node) {
        return node?.__text ?? "";
      },
    },
    report(report) {
      reports.push(report);
    },
    ...overrides,
  };
  return { context, reports };
}

function createRule(name: string, options: any[] = [], overrides: any = {}) {
  const { context, reports } = createContext(options, overrides);
  return {
    reports,
    visitor: plugin.rules[name].create(context),
  };
}

function createCommentRule(name: string, comments: any[], options: any[] = []) {
  return createRule(name, options, {
    sourceCode: {
      text: "",
      getAllComments: () => comments,
      getText(node) {
        if (!node) return "";
        return typeof node.__text === "string" ? node.__text : "";
      },
    },
  });
}

function comment(type: "Block" | "Line", value: string, text: string): any {
  return { type, value, __text: text };
}

function locatedComment(
  type: "Block" | "Line",
  value: string,
  text: string,
  startLine: number,
  endLine = startLine,
): any {
  const start = { column: 0, line: startLine };
  const end = { column: text.length, line: endLine };
  const node = comment(type, value, text);
  node.loc = { start, end };
  return node;
}

function call(callee: any, args: any[] = []): any {
  const node: any = {
    type: "CallExpression",
    callee,
    arguments: args,
  };
  if (callee && typeof callee === "object") callee.parent = node;
  args
    .filter((arg) => arg && typeof arg === "object")
    .forEach((arg) => {
      arg.parent = node;
    });
  return node;
}

function member(object: any, property: string): any {
  const node: any = {
    type: "MemberExpression",
    object,
    property: {
      type: "Identifier",
      name: property,
    },
    computed: false,
  };
  object.parent = node;
  return node;
}

function methodCall(object: any, property: string, args: any[] = []): any {
  const memberNode = member(object, property);
  const node = call(memberNode, args);
  memberNode.parent = node;
  return node;
}

function expressionStatement(expression: any): any {
  const node: any = {
    type: "ExpressionStatement",
    expression,
  };
  expression.parent = node;
  return node;
}

function block(body: any[] = []): any {
  const node: any = {
    type: "BlockStatement",
    body,
  };
  body.forEach((statement) => {
    statement.parent = node;
  });
  return node;
}

function id(name: string): any {
  return {
    type: "Identifier",
    name,
    __text: name,
  };
}

function literal(value: any): any {
  return {
    type: "Literal",
    value,
    __text: JSON.stringify(value),
  };
}

function arrayExpression(elements: any[]): any {
  const node: any = { type: "ArrayExpression", elements };
  elements.forEach((element) => {
    if (element && typeof element === "object") element.parent = node;
  });
  return node;
}

function newExpression(name: string, args: any[] = []): any {
  const callee = id(name);
  const node: any = { type: "NewExpression", callee, arguments: args };
  callee.parent = node;
  args.forEach((arg) => {
    if (arg && typeof arg === "object") arg.parent = node;
  });
  return node;
}

function objectProperty(name: string): any {
  const key = id(name);
  const value = id(name);
  const node: any = {
    type: "Property",
    key,
    value,
    computed: false,
    kind: "init",
    method: false,
    shorthand: true,
  };
  key.parent = node;
  value.parent = node;
  return node;
}

function objectPattern(names: string[]): any {
  const properties = names.map(objectProperty);
  const node: any = { type: "ObjectPattern", properties };
  properties.forEach((property) => {
    property.parent = node;
  });
  return node;
}

function assignmentPattern(left: any, right: any): any {
  const node: any = { type: "AssignmentPattern", left, right };
  left.parent = node;
  right.parent = node;
  return node;
}

function binary(left: any, operator: string, right: any): any {
  const node: any = {
    type: "BinaryExpression",
    operator,
    left,
    right,
  };
  left.parent = node;
  right.parent = node;
  return node;
}

function logical(left: any, right: any, operator = "&&"): any {
  const node: any = {
    type: "LogicalExpression",
    operator,
    left,
    right,
  };
  left.parent = node;
  right.parent = node;
  return node;
}

function arrow(params: any[], body: any): any {
  const node: any = {
    type: "ArrowFunctionExpression",
    params,
    body,
  };
  params.forEach((param) => {
    param.parent = node;
  });
  if (body && typeof body === "object") body.parent = node;
  return node;
}

test("exports an ESLint and Oxlint compatible plugin shape", () => {
  assert.equal(plugin.meta.name, "eslint-plugin-legibility");
  assert.equal(plugin.meta.namespace, "legibility");
  assert.equal(plugin.meta.version, manifest.version);
  assert.ok(plugin.rules["max-expression-operators"]);
  assert.ok(plugin.rules["max-function-parameters"]);
  assert.ok(plugin.rules["no-automated-comment-attribution"]);
  assert.ok(plugin.rules["no-small-collection-conversion"]);
  assert.ok(plugin.rules["no-unnecessary-async"]);
  assert.ok(plugin.rules["prefer-early-return"]);
  assert.ok(plugin.rules["no-stacked-comments"]);
  assert.ok(plugin.rules["no-unmatched-comments"]);
  assert.ok(plugin.rules["require-jsdoc-multiline-comments"]);
  assert.ok(plugin.configs["flat/recommended"].plugins.legibility);
  assert.equal(
    plugin.configs["flat/recommended"].rules["legibility/max-function-parameters"],
    "warn",
  );
  assert.equal(
    plugin.configs["flat/strict"].rules["legibility/max-function-parameters"],
    "error",
  );
  assert.deepEqual(plugin.configs["flat/recommended"].rules.complexity, [
    "warn",
    20,
  ]);
  assert.deepEqual(plugin.configs["flat/strict"].rules.complexity, [
    "error",
    20,
  ]);
  const maxLinesOptions = {
    max: 40,
    skipBlankLines: true,
    skipComments: true,
    IIFEs: true,
  };
  assert.deepEqual(plugin.configs["flat/recommended"].rules["max-lines-per-function"], [
    "warn",
    maxLinesOptions,
  ]);
  assert.deepEqual(plugin.configs["flat/strict"].rules["max-lines-per-function"], [
    "error",
    maxLinesOptions,
  ]);
  COMMENT_RULE_NAMES.forEach((ruleName) => {
    const ruleId = `legibility/${ruleName}`;
    assert.equal(plugin.rules[ruleName].meta.docs.recommended, true);
    assert.equal(plugin.configs["flat/recommended"].rules[ruleId], "warn");
    assert.equal(plugin.configs["flat/strict"].rules[ruleId], "error");
  });
  OPT_IN_RULE_NAMES.forEach((ruleName) => {
    const ruleId = `legibility/${ruleName}`;
    assert.equal(plugin.rules[ruleName].meta.docs.recommended, false);
    assert.equal(plugin.configs["flat/recommended"].rules[ruleId], undefined);
    assert.equal(plugin.configs["flat/strict"].rules[ruleId], undefined);
  });
  RECOMMENDED_RULE_NAMES.forEach((ruleName) => {
    const ruleId = `legibility/${ruleName}`;
    assert.equal(plugin.rules[ruleName].meta.docs.recommended, true);
    assert.equal(plugin.configs["flat/recommended"].rules[ruleId], "warn");
    assert.equal(plugin.configs["flat/strict"].rules[ruleId], "error");
  });
  STRICT_ONLY_RULE_NAMES.forEach((ruleName) => {
    const ruleId = `legibility/${ruleName}`;
    assert.equal(plugin.rules[ruleName].meta.docs.recommended, false);
    assert.equal(plugin.configs["flat/recommended"].rules[ruleId], undefined);
    assert.equal(plugin.configs["flat/strict"].rules[ruleId], "error");
  });
  const categorizedRules = RECOMMENDED_RULE_NAMES.concat(
    COMMENT_RULE_NAMES,
    STRICT_ONLY_RULE_NAMES,
    Array.from(OPT_IN_RULE_NAMES),
  ).toSorted();
  assert.deepEqual(categorizedRules, Object.keys(plugin.rules).toSorted());
  assert.deepEqual(Object.keys(plugin.configs).sort(), [
    "flat/recommended",
    "flat/strict",
    "oxlint/recommended",
    "oxlint/strict",
  ]);
  assert.equal(requiredPlugin, plugin);
  assert.equal(requiredPlugin.meta.name, "eslint-plugin-legibility");
  assert.equal(requiredPlugin.meta.namespace, "legibility");
});

test("Oxlint presets mirror the ESLint rules and register the plugin", () => {
  const recommended = plugin.configs["oxlint/recommended"];
  const strict = plugin.configs["oxlint/strict"];
  const jsPlugins = [{ name: "legibility", specifier: "eslint-plugin-legibility" }];

  assert.deepEqual(recommended.jsPlugins, jsPlugins);
  assert.deepEqual(strict.jsPlugins, jsPlugins);
  assert.deepEqual(recommended.rules, plugin.configs["flat/recommended"].rules);
  assert.deepEqual(strict.rules, plugin.configs["flat/strict"].rules);
  assert.notEqual(recommended.rules, plugin.configs["flat/recommended"].rules);
  assert.notEqual(strict.rules, plugin.configs["flat/strict"].rules);
});

test("createOnce exposes the same visitor events as ESLint create", () => {
  const pluginRules = plugin.rules as Record<string, RuleModule>;
  const createOnceRules = Object.values(pluginRules).filter((rule) => rule.createOnce);

  createOnceRules.forEach((rule) => {
    const { context } = createContext();
    const createOnce = rule.createOnce;
    assert.ok(createOnce);
    const eslintListenerNames = Object.keys(rule.create(context)).toSorted();
    const oxlintListenerNames = Object.keys(createOnce(context)).toSorted();

    assert.deepEqual(oxlintListenerNames, eslintListenerNames);
  });

  assert.equal(createOnceRules.length, 12);
});

test("max-function-parameters reports functions with too many positional parameters", () => {
  const { visitor, reports } = createRule("max-function-parameters");
  const params = ["first", "second", "third", "fourth", "fifth"].map(id);
  const node = {
    type: "FunctionDeclaration",
    id: id("sendRequest"),
    params,
    body: block(),
  };

  visitor.FunctionDeclaration(node);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "tooManyParameters");
  assert.deepEqual(reports[0].data, { name: "sendRequest", count: 5, max: 4 });
});

test("max-function-parameters reports oversized object parameters", () => {
  const names = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
  const pattern = objectPattern(names);
  const defaultValue = { type: "ObjectExpression", properties: [] };
  const node = arrow([assignmentPattern(pattern, defaultValue)], block());
  const { visitor, reports } = createRule("max-function-parameters");

  visitor.ArrowFunctionExpression(node);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "tooManyObjectProperties");
  assert.deepEqual(reports[0].data, { name: "Function", count: 9, max: 8 });
});

test("max-function-parameters supports independent limits", () => {
  const options = [{ max: 1, maxObjectProperties: 2 }];
  const objectParameter = objectPattern(["first", "second", "third"]);
  const node = arrow([objectParameter, id("extra")], block());
  const { visitor, reports } = createRule("max-function-parameters", options);

  visitor.ArrowFunctionExpression(node);

  assert.deepEqual(
    reports.map((report) => report.messageId),
    ["tooManyParameters", "tooManyObjectProperties"],
  );
});

test("max-function-parameters accepts inputs at both limits", () => {
  const names = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const params = [objectPattern(names), id("second"), id("third"), id("fourth")];
  const node = arrow(params, block());
  const { visitor, reports } = createRule("max-function-parameters");

  visitor.ArrowFunctionExpression(node);

  assert.equal(reports.length, 0);
});

test("no-unmatched-comments bans comments by default and ignores shebangs", () => {
  const comments = [
    comment("Line", " Explain the branch.", "// Explain the branch."),
    comment("Block", "*\n * Explain the API.\n ", "/**\n * Explain the API.\n */"),
    { type: "Shebang", value: "/usr/bin/env node", __text: "#!/usr/bin/env node" },
  ];
  const { visitor, reports } = createCommentRule("no-unmatched-comments", comments);

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 2);
  assert.equal(reports[0].messageId, "unmatched");
  assert.equal(reports[1].messageId, "unmatched");
});

test("no-unmatched-comments accepts configured line and JSDoc matcher values", () => {
  const comments = [
    comment("Line", " KEEP-42: Preserve this.", "// KEEP-42: Preserve this."),
    comment(
      "Block",
      "*\n * KEEP-73: Explain the API.\n ",
      "/**\n * KEEP-73: Explain the API.\n */",
    ),
  ];
  const options = [{ matchers: ["^KEEP-\\d+\\b"] }];
  const { visitor, reports } = createCommentRule("no-unmatched-comments", comments, options);

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("no-unmatched-comments supports custom and empty matcher lists", () => {
  const comments = [comment("Line", " TODO #42", "// TODO #42")];
  const customRule = createCommentRule("no-unmatched-comments", comments, [
    { matchers: ["TODO\\s+#\\d+"] },
  ]);
  const banAllRule = createCommentRule("no-unmatched-comments", comments, [{ matchers: [] }]);
  const invalidRule = createCommentRule("no-unmatched-comments", comments, [
    { matchers: ["["] },
  ]);

  customRule.visitor.Program({ type: "Program" });
  banAllRule.visitor.Program({ type: "Program" });
  invalidRule.visitor.Program({ type: "Program" });

  assert.equal(customRule.reports.length, 0);
  assert.equal(banAllRule.reports.length, 1);
  assert.equal(invalidRule.reports.length, 1);
});

test("comment rules accept direct sources without text readers", () => {
  const comments = [comment("Line", " APPROVED: preserve this", "// APPROVED: preserve this")];
  const sourceCode = { getAllComments: () => comments };
  const options = [{ prefixIdentifiers: ["APPROVED"] }];
  const { visitor, reports } = createRule("no-unmatched-comments", options, { sourceCode });

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("no-unmatched-comments accepts bounded prefix and suffix identifiers", () => {
  const allowedComments = [
    comment("Line", " APPROVED: preserve this", "// APPROVED: preserve this"),
    comment("Line", " preserve this @approved", "// preserve this @approved"),
    comment("Block", "*\n * preserve this\n * @approved\n ", "/** comment */"),
  ];
  const rejectedComments = [
    comment("Line", " APPROVEDLY: generated", "// APPROVEDLY: generated"),
    comment("Line", " preserve this not@approved", "// preserve this not@approved"),
  ];
  const options = [
    {
      matchers: [],
      prefixIdentifiers: ["approved"],
      suffixIdentifiers: ["@approved"],
    },
  ];
  const allowedRule = createCommentRule("no-unmatched-comments", allowedComments, options);
  const rejectedRule = createCommentRule("no-unmatched-comments", rejectedComments, options);

  allowedRule.visitor.Program({ type: "Program" });
  rejectedRule.visitor.Program({ type: "Program" });

  assert.equal(allowedRule.reports.length, 0);
  assert.equal(rejectedRule.reports.length, 2);
});

test("no-stacked-comments reports comments on consecutive lines", () => {
  const comments = [
    locatedComment("Line", " First comment.", "// First comment.", 1),
    locatedComment("Line", " Second comment.", "// Second comment.", 2),
  ];
  const { visitor, reports } = createCommentRule("no-stacked-comments", comments);

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "stackedComment");
  assert.equal(reports[0].node, comments[1]);
});

test("no-stacked-comments accepts comments separated by blank lines", () => {
  const comments = [
    locatedComment("Line", " First comment.", "// First comment.", 1),
    locatedComment("Line", " Second comment.", "// Second comment.", 3),
    locatedComment("Block", " Third comment. ", "/* Third comment. */", 5),
  ];
  const { visitor, reports } = createCommentRule("no-stacked-comments", comments);

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("require-jsdoc-multiline-comments reports ordinary multiline blocks", () => {
  const comments = [
    comment(
      "Block",
      "\n * Explain the API contract.\n ",
      "/*\n * Explain the API contract.\n */",
    ),
    comment(
      "Block",
      "*\n * Explain the API contract.\n ",
      "/**\n * Explain the API contract.\n */",
    ),
    comment("Block", " Explain the API contract. ", "/* Explain the API contract. */"),
  ];
  const { visitor, reports } = createCommentRule(
    "require-jsdoc-multiline-comments",
    comments,
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "useJsdoc");
  assert.equal(typeof reports[0].fix, "function");
  assert.equal(plugin.rules["require-jsdoc-multiline-comments"].meta.fixable, "code");
});

test("require-jsdoc-multiline-comments autofixes the block opener", async () => {
  const { Linter } = await import("eslint");
  const linter = new Linter({ configType: "flat" });
  const source = ["/*", " * Explain the API contract.", " */", "const value = true;"].join("\n");
  const rules: Record<string, "error"> = {
    "legibility/require-jsdoc-multiline-comments": "error",
  };
  const config = [{ plugins: { legibility: plugin }, rules }];

  const result = linter.verifyAndFix(source, config, { filename: "src/check.js" });
  const expected = ["/**", " * Explain the API contract.", " */", "const value = true;"].join("\n");

  assert.equal(result.fixed, true);
  assert.equal(result.output, expected);
  assert.equal(result.messages.length, 0);
});

test("no-automated-comment-attribution reports signatures and prohibited authors", () => {
  const firstIdentifier = ["chat", "gpt"].join("");
  const secondIdentifier = ["cl", "aude"].join("");
  const generatedBy = ["Generated by", firstIdentifier].join(" ");
  const prohibitedAuthor = ["@author", secondIdentifier].join(" ");
  const comments = [
    comment("Line", ` ${generatedBy}.`, `// ${generatedBy}.`),
    comment("Block", `*\n * ${prohibitedAuthor}\n `, `/**\n * ${prohibitedAuthor}\n */`),
  ];
  const { visitor, reports } = createCommentRule(
    "no-automated-comment-attribution",
    comments,
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 2);
  assert.equal(reports[0].data.identifier, firstIdentifier);
  assert.equal(reports[1].data.identifier, secondIdentifier);
});

test("no-automated-comment-attribution ignores ordinary technology references", () => {
  const identifier = ["chat", "gpt"].join("");
  const value = ` Send a request to ${identifier}. @author Jeff`;
  const comments = [comment("Line", value, "// request")];
  const { visitor, reports } = createCommentRule(
    "no-automated-comment-attribution",
    comments,
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("no-automated-comment-attribution supports custom identifiers", () => {
  const comments = [comment("Line", " @author robot", "// @author robot")];
  const { visitor, reports } = createCommentRule(
    "no-automated-comment-attribution",
    comments,
    [{ identifiers: ["robot"] }],
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].data.identifier, "robot");
});

function lintFilename(filename: string, options: any): any[] {
  const { visitor, reports } = createRule("require-filename-matches-dirname", [options], {
    cwd: "/repo",
    filename,
  });
  visitor.Program({ type: "Program" });
  return reports;
}

test("require-filename-matches-dirname requires a schema", () => {
  const reports = lintFilename("/repo/src/components/foo/index.ts", { minDepth: 2 });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "missingSchema");
});

test("require-filename-matches-dirname enforces the dirname schema", () => {
  const options = { schema: "dirname", minDepth: 2 };
  const unrelatedReports = lintFilename("/repo/src/components/foo/useAuth.ts", options);
  const qualifierReports = lintFilename("/repo/src/components/foo/foo.effect.ts", options);

  assert.equal(unrelatedReports[0].messageId, "mismatch");
  assert.equal(qualifierReports[0].messageId, "mismatch");
});

test("require-filename-matches-dirname accepts dirname schema patterns", () => {
  const options = { schema: "dirname", minDepth: 2 };
  const filenames = ["foo.ts", "foo.utils.tsx", "index.ts"];
  const reportCounts = filenames.map((name) =>
    lintFilename(`/repo/src/components/foo/${name}`, options).length,
  );

  assert.deepEqual(reportCounts, [0, 0, 0]);
});

test("require-filename-matches-dirname accepts dirname schema overrides", () => {
  const options = {
    schema: "dirname",
    minDepth: 2,
    allowedQualifiers: ["effect"],
    allowedFilenames: ["schema"],
  };
  const effectReports = lintFilename("/repo/src/components/foo/foo.effect.ts", options);
  const schemaReports = lintFilename("/repo/src/components/foo/schema.ts", options);

  assert.equal(effectReports.length, 0);
  assert.equal(schemaReports.length, 0);
});

test("require-filename-matches-dirname accepts the index schema", () => {
  const options = { schema: "index", minDepth: 2 };
  const filenames = [
    "constants.ts",
    "index.tsx",
    "index.test.ts",
    "types.ts",
    "utils.tsx",
    "utils.test.tsx",
  ];
  const reportCounts = filenames.map((name) =>
    lintFilename(`/repo/src/components/foo/${name}`, options).length,
  );

  assert.deepEqual(reportCounts, [0, 0, 0, 0, 0, 0]);
});

test("require-filename-matches-dirname rejects dirname patterns under the index schema", () => {
  const options = { schema: "index", minDepth: 2 };
  const reports = lintFilename("/repo/src/components/button/button.test.ts", options);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "mismatch");
});

test("require-filename-matches-dirname supports custom schemas", () => {
  const patterns = ["{dirname}.effect", "schema", "schema.test"];
  const options = { schema: "custom", minDepth: 2, patterns };
  const effectReports = lintFilename("/repo/src/components/foo/foo.effect.ts", options);
  const schemaReports = lintFilename("/repo/src/components/foo/schema.test.tsx", options);
  const indexReports = lintFilename("/repo/src/components/foo/index.ts", options);

  assert.equal(effectReports.length, 0);
  assert.equal(schemaReports.length, 0);
  assert.equal(indexReports.length, 1);
});

test("require-filename-matches-dirname exempts files below minDepth", () => {
  const options = { schema: "index", minDepth: 3 };
  const reports = lintFilename("/repo/src/hooks/useAuth.ts", options);

  assert.equal(reports.length, 0);
});

test("require-filename-matches-dirname validates the required schema option", async () => {
  const { Linter } = await import("eslint");
  const linter = new Linter({ configType: "flat" });
  const ruleConfig: ["error", Record<string, never>] = ["error", {}];
  const rules = { "legibility/require-filename-matches-dirname": ruleConfig };
  const config = [{ plugins: { legibility: plugin }, rules }];
  const verify = () => linter.verify("const value = true;", config);

  assert.throws(verify, /required property 'schema'/);
});

test("no-mixed-filename-casing reports hyphen mixed with uppercase", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/src/my-File.ts" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "mixedCasing");
});

test("no-mixed-filename-casing reports camelCase mixed with hyphens", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/src/myFile-helper.ts" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 1);
});

test("no-mixed-filename-casing reports mixed separators", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/src/my-file_helper.ts" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 1);
});

test("no-mixed-filename-casing allows kebab-case", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/src/my-file.ts" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 0);
});

test("no-mixed-filename-casing allows camelCase", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/src/myFile.ts" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 0);
});

test("no-mixed-filename-casing allows PascalCase", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/src/MyFile.ts" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 0);
});

test("no-mixed-filename-casing allows snake_case", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/src/my_file.ts" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 0);
});

test("no-mixed-filename-casing allows dotfile names", () => {
  const { visitor, reports } = createRule("no-mixed-filename-casing", [], { filename: "/repo/.eslintrc.js" });
  visitor.Program({ type: "Program" });
  assert.equal(reports.length, 0);
});

test("max-expression-operators reports operator-heavy expressions", () => {
  const { visitor, reports } = createRule("max-expression-operators", [{ max: 1 }]);
  const expression = logical(logical(id("a"), id("b")), id("c"));

  visitor.ReturnStatement({ type: "ReturnStatement", argument: expression });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "tooMany");
  assert.equal(reports[0].data.count, 2);
});

test("max-expression-operators allows custom operators and complexity weights", () => {
  const { visitor, reports } = createRule("max-expression-operators", [
    { complexity: { "+": 3 }, max: 2, operators: ["+"] },
  ]);

  visitor.ReturnStatement({
    type: "ReturnStatement",
    argument: binary(id("a"), "+", id("b")),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].data.count, 3);
});

test("max-expression-operators respects explicitly empty operator lists", () => {
  const { visitor, reports } = createRule("max-expression-operators", [
    { max: 0, operators: [] },
  ]);

  visitor.ReturnStatement({
    type: "ReturnStatement",
    argument: logical(id("a"), id("b")),
  });

  assert.equal(reports.length, 0);
});

test("hoist-if-operators reports boolean-heavy if conditions", () => {
  const { visitor, reports } = createRule("hoist-if-operators");

  visitor.IfStatement({
    type: "IfStatement",
    test: logical(id("ready"), id("enabled")),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "tooMany");
});

test("hoist-if-operators allows custom condition operators", () => {
  const { visitor, reports } = createRule("hoist-if-operators", [
    { max: 0, operators: ["==="] },
  ]);

  visitor.IfStatement({
    type: "IfStatement",
    test: binary(id("status"), "===", literal("ready")),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].data.count, 1);
});

test("no-quadratic-patterns reports search calls inside loops", () => {
  const { visitor, reports } = createRule("no-quadratic-patterns");
  const search = methodCall(id("items"), "find");
  const body = block([expressionStatement(search)]);
  const loop = { type: "ForStatement", body };
  body.parent = loop;

  visitor.ForStatement(loop);
  visitor.CallExpression(search);
  visitor["ForStatement:exit"](loop);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "searchInLoop");
});

test("no-quadratic-patterns allows custom search methods", () => {
  const { visitor, reports } = createRule("no-quadratic-patterns", [
    { searchMethods: ["lookup"] },
  ]);
  const search = methodCall(id("items"), "lookup");
  const body = block([expressionStatement(search)]);
  const loop = { type: "ForStatement", body };
  body.parent = loop;

  visitor.ForStatement(loop);
  visitor.CallExpression(search);
  visitor["ForStatement:exit"](loop);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "searchInLoop");
});

test("no-quadratic-patterns ignores one-time search calls in loop headers", () => {
  const { visitor, reports } = createRule("no-quadratic-patterns");
  const filter = methodCall(id("users"), "filter", [id("Boolean")]);
  const body = block();
  const loop = {
    type: "ForOfStatement",
    right: filter,
    body,
  };
  filter.parent = loop;
  body.parent = loop;

  visitor.ForOfStatement(loop);
  visitor.CallExpression(filter);
  visitor["ForOfStatement:exit"](loop);

  assert.equal(reports.length, 0);
});

test("require-executable-shebang reports configured executable sources without shebangs", () => {
  const { visitor, reports } = createRule("require-executable-shebang");

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "missingShebang");
});

test("require-executable-shebang accepts Deno shebangs by default", () => {
  const { visitor, reports } = createRule("require-executable-shebang", [], {
    sourceCode: {
      text: "#!/usr/bin/env deno run --allow-read\nconsole.log('ok');\n",
      getText: () => "",
    },
  });

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("text rules use readable fallbacks for comment-only direct sources", () => {
  const sourceText = "#!/usr/bin/env node\nconsole.log('ok');\n";
  const sourceCode = { getAllComments: () => [] };
  const getSourceCode = () => ({ getText: () => sourceText });
  const overrides = { sourceCode, getSourceCode };
  const { visitor, reports } = createRule("require-executable-shebang", [], overrides);

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("require-executable-shebang matches configured wildcard paths", () => {
  const { visitor, reports } = createRule(
    "require-executable-shebang",
    [{ files: ["packages/*/src/index.ts"] }],
    { filename: "/repo/packages/cli/src/index.ts", cwd: "/repo" },
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "missingShebang");
});

test("require-executable-shebang accepts bounded wildcard path segments", () => {
  const { visitor, reports } = createRule(
    "require-executable-shebang",
    [{ files: ["packages/cli-*/src/index.ts"] }],
    { filename: "/repo/packages/cli-tool/src/index.ts", cwd: "/repo" },
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "missingShebang");
});

test("require-executable-shebang ignores wildcard path segment mismatches", () => {
  const { visitor, reports } = createRule(
    "require-executable-shebang",
    [{ files: ["packages/cli-*/src/index.ts"] }],
    { filename: "/repo/packages/web/src/index.ts", cwd: "/repo" },
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("require-executable-shebang matches recursive wildcard paths", () => {
  const { visitor, reports } = createRule(
    "require-executable-shebang",
    [{ files: ["packages/**/src/index.ts"] }],
    { filename: "/repo/packages/tools/cli/src/index.ts", cwd: "/repo" },
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "missingShebang");
});

test("require-executable-shebang ignores wildcard patterns longer than the path", () => {
  const { visitor, reports } = createRule(
    "require-executable-shebang",
    [{ files: ["packages/*/src/index.ts"] }],
    { filename: "/repo/packages/src/index.ts", cwd: "/repo" },
  );

  visitor.Program({ type: "Program" });

  assert.equal(reports.length, 0);
});

test("no-direct-node-bin-smoke reports direct node smoke tests", () => {
  const { visitor, reports } = createRule("no-direct-node-bin-smoke");
  const execSync = call(id("execSync"), [literal("node src/index.js --help")]);

  visitor.CallExpression(execSync);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "directNodeBin");
});

test("no-direct-node-bin-smoke matches nested wildcard bin paths", () => {
  const { visitor, reports } = createRule("no-direct-node-bin-smoke");
  const execSync = call(id("execSync"), [literal("node packages/cli/dist/index.js --help")]);

  visitor.CallExpression(execSync);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "directNodeBin");
});

test("no-complex-ternaries reports nested ternaries", () => {
  const { visitor, reports } = createRule("no-complex-ternaries");
  const expression = {
    type: "ConditionalExpression",
    test: id("ready"),
    consequent: {
      type: "ConditionalExpression",
      test: id("enabled"),
      consequent: id("a"),
      alternate: id("b"),
    },
    alternate: id("c"),
  };

  visitor.ConditionalExpression(expression);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "nested");
});

test("no-complex-ternaries allows custom ternary complexity", () => {
  const { visitor, reports } = createRule("no-complex-ternaries", [
    { complexity: { "?:": 2 }, max: 1, operators: ["?:"] },
  ]);

  visitor.ConditionalExpression({
    type: "ConditionalExpression",
    test: id("ready"),
    consequent: id("enabled"),
    alternate: id("disabled"),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].data.count, 2);
});

test("no-computed-values reports computed object values", () => {
  const { visitor, reports } = createRule("no-computed-values", [{ max: 1 }]);

  visitor.Property({
    type: "Property",
    value: logical(logical(id("a"), id("b")), id("c")),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "computedObjectValue");
});

test("no-computed-values allows custom computed operator complexity", () => {
  const { visitor, reports } = createRule("no-computed-values", [
    { complexity: { "+": 2 }, max: 1, operators: ["+"] },
  ]);

  visitor.Property({
    type: "Property",
    value: binary(id("subtotal"), "+", id("tax")),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].data.count, 2);
});

test("no-hidden-side-effects reports nested assignments", () => {
  const { visitor, reports } = createRule("no-hidden-side-effects");
  const assignment = {
    type: "AssignmentExpression",
    parent: { type: "ReturnStatement" },
  };

  visitor.AssignmentExpression(assignment);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "hiddenSideEffect");
});

test("no-hidden-side-effects allows custom mutating methods", () => {
  const { visitor, reports } = createRule("no-hidden-side-effects", [
    { mutatingMethods: ["commit"] },
  ]);
  const commitCall = methodCall(id("store"), "commit");
  commitCall.parent = { type: "ReturnStatement", argument: commitCall };

  visitor.CallExpression(commitCall);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "hiddenSideEffect");
});

test("no-standalone-array-mutations reports standalone mutating calls", () => {
  const { visitor, reports } = createRule("no-standalone-array-mutations");
  const pushCall = methodCall(id("items"), "push");
  pushCall.parent = {
    type: "ExpressionStatement",
    expression: pushCall,
  };

  visitor.CallExpression(pushCall);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "standaloneArrayMutation");
});

test("no-standalone-array-mutations allows custom mutating methods", () => {
  const { visitor, reports } = createRule("no-standalone-array-mutations", [
    { arrayMutatingMethods: ["append"], mutatingMethods: ["append"] },
  ]);
  const appendCall = methodCall(id("items"), "append");
  appendCall.parent = {
    type: "ExpressionStatement",
    expression: appendCall,
  };

  visitor.CallExpression(appendCall);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "standaloneArrayMutation");
});

test("prefer-concat-object-assign reports array and object spreads", () => {
  const { visitor, reports } = createRule("prefer-concat-object-assign");

  visitor.ArrayExpression({
    type: "ArrayExpression",
    elements: [{ type: "SpreadElement" }],
  });
  visitor.ObjectExpression({
    type: "ObjectExpression",
    properties: [{ type: "SpreadElement" }],
  });

  assert.equal(reports.length, 2);
  assert.equal(reports[0].messageId, "arraySpread");
  assert.equal(reports[1].messageId, "objectSpread");
});

test("prefer-early-return reports else branches after an exiting consequent", () => {
  const { visitor, reports } = createRule("prefer-early-return");
  const alternate = { type: "BlockStatement", body: [] };

  visitor.IfStatement({
    type: "IfStatement",
    test: id("failed"),
    consequent: {
      type: "BlockStatement",
      body: [{ type: "ReturnStatement" }],
    },
    alternate,
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].node, alternate);
});

test("max-control-flow-depth reports branches beyond the configured depth", () => {
  const { visitor, reports } = createRule("max-control-flow-depth", [{ max: 2 }]);
  const outer = { type: "IfStatement" };
  const middle = { type: "IfStatement", parent: outer };
  const inner = { type: "IfStatement", parent: middle };

  visitor.IfStatement(outer);
  visitor.IfStatement(middle);
  visitor.IfStatement(inner);
  visitor["IfStatement:exit"](inner);
  visitor["IfStatement:exit"](middle);
  visitor["IfStatement:exit"](outer);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "tooDeep");
});

test("max-control-flow-depth resets depth inside nested function declarations", () => {
  const { visitor, reports } = createRule("max-control-flow-depth", [{ max: 3 }]);
  const outer = { type: "IfStatement" };
  const fn = {
    type: "FunctionDeclaration",
    body: block(),
    parent: outer,
  };
  const first = { type: "IfStatement", parent: fn.body };
  const second = { type: "IfStatement", parent: first };
  const third = { type: "IfStatement", parent: second };

  visitor.IfStatement(outer);
  visitor.FunctionDeclaration(fn);
  visitor.IfStatement(first);
  visitor.IfStatement(second);
  visitor.IfStatement(third);
  visitor["IfStatement:exit"](third);
  visitor["IfStatement:exit"](second);
  visitor["IfStatement:exit"](first);
  visitor["FunctionDeclaration:exit"](fn);
  visitor["IfStatement:exit"](outer);

  assert.equal(reports.length, 0);
});

test("max-array-chain-depth reports long array callback chains once", () => {
  const { visitor, reports } = createRule("max-array-chain-depth", [{ max: 2 }]);
  const filterCall = methodCall(id("items"), "filter");
  const mapCall = methodCall(filterCall, "map");
  const someCall = methodCall(mapCall, "some");

  visitor.CallExpression(filterCall);
  visitor.CallExpression(mapCall);
  visitor.CallExpression(someCall);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].node, someCall);
  assert.equal(reports[0].data.chain, "filter.map.some");
});

test("max-array-chain-depth allows custom iteration methods", () => {
  const { visitor, reports } = createRule("max-array-chain-depth", [
    { iterationMethods: ["collect", "select"], max: 1 },
  ]);
  const collectCall = methodCall(id("items"), "collect");
  const selectCall = methodCall(collectCall, "select");

  visitor.CallExpression(collectCall);
  visitor.CallExpression(selectCall);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].data.chain, "collect.select");
});

test("no-repeated-collection-search reports repeated scoped scans", () => {
  const { visitor, reports } = createRule("no-repeated-collection-search");

  visitor.Program({ type: "Program" });
  visitor.CallExpression(methodCall(id("users"), "find"));
  visitor.CallExpression(methodCall(id("users"), "find"));
  visitor["Program:exit"]({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "repeatedSearch");
});

test("no-repeated-collection-search allows custom search methods", () => {
  const { visitor, reports } = createRule("no-repeated-collection-search", [
    { searchMethods: ["lookup"] },
  ]);

  visitor.Program({ type: "Program" });
  visitor.CallExpression(methodCall(id("users"), "lookup"));
  visitor.CallExpression(methodCall(id("users"), "lookup"));
  visitor["Program:exit"]({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].data.method, "lookup");
});

test("no-redundant-boolean-logic reports boolean comparisons and ternaries", () => {
  const { visitor, reports } = createRule("no-redundant-boolean-logic");

  visitor.BinaryExpression(binary(id("isReady"), "===", literal(true)));
  visitor.ConditionalExpression({
    type: "ConditionalExpression",
    test: id("isReady"),
    consequent: literal(true),
    alternate: literal(false),
  });

  assert.equal(reports.length, 2);
  assert.equal(reports[0].messageId, "booleanComparison");
  assert.equal(reports[1].messageId, "booleanTernary");
});

test("no-redundant-boolean-logic allows custom equality operators", () => {
  const { visitor, reports } = createRule("no-redundant-boolean-logic", [
    { equalityOperators: ["~~"] },
  ]);

  visitor.BinaryExpression(binary(id("isReady"), "~~", literal(true)));

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "booleanComparison");
});

test("no-trivial-wrapper-functions reports parameter-forwarding wrappers", () => {
  const { visitor, reports } = createRule("no-trivial-wrapper-functions");
  const wrapper = arrow([id("userId")], call(id("fetchUser"), [id("userId")]));
  wrapper.parent = {
    type: "VariableDeclarator",
    id: id("getUser"),
  };

  visitor.ArrowFunctionExpression(wrapper);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "trivialWrapper");
});

test("no-trivial-wrapper-functions ignores async and generator wrappers", () => {
  const { visitor, reports } = createRule("no-trivial-wrapper-functions");
  const asyncWrapper = arrow([id("userId")], call(id("fetchUser"), [id("userId")]));
  asyncWrapper.async = true;
  asyncWrapper.parent = {
    type: "VariableDeclarator",
    id: id("loadUser"),
  };
  const generatorWrapper = {
    type: "FunctionDeclaration",
    id: id("ids"),
    generator: true,
    params: [id("items")],
    body: block([
      {
        type: "ReturnStatement",
        argument: call(id("iterate"), [id("items")]),
      },
    ]),
  };

  visitor.ArrowFunctionExpression(asyncWrapper);
  visitor.FunctionDeclaration(generatorWrapper);

  assert.equal(reports.length, 0);
});

test("prefer-positive-condition-names reports negative boolean names", () => {
  const { visitor, reports } = createRule("prefer-positive-condition-names");

  visitor.VariableDeclarator({
    type: "VariableDeclarator",
    id: id("isNotReady"),
    init: literal(false),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "negativeName");
});

test("prefer-positive-condition-names allows custom boolean operators", () => {
  const { visitor, reports } = createRule("prefer-positive-condition-names", [
    { booleanOperators: ["matches"] },
  ]);

  visitor.VariableDeclarator({
    type: "VariableDeclarator",
    id: id("isNotReady"),
    init: binary(id("status"), "matches", literal("ready")),
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "negativeName");
});

test("no-single-use-renaming-alias reports aliases used once", () => {
  const { visitor, reports } = createRule("no-single-use-renaming-alias");
  const alias = {
    type: "VariableDeclarator",
    id: id("userData"),
    init: id("user"),
  };

  visitor.Program({ type: "Program" });
  visitor.VariableDeclarator(alias);
  visitor.Identifier({
    type: "Identifier",
    name: "userData",
    parent: { type: "ReturnStatement" },
  });
  visitor["Program:exit"]({ type: "Program" });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "singleUseAlias");
});

test("prefer-guard-clauses reports whole-function wrapped branches", () => {
  const { visitor, reports } = createRule("prefer-guard-clauses");

  visitor.FunctionDeclaration({
    type: "FunctionDeclaration",
    body: {
      type: "BlockStatement",
      body: [
        {
          type: "IfStatement",
          test: id("user"),
          consequent: {
            type: "BlockStatement",
            body: [{ type: "ExpressionStatement" }, { type: "ExpressionStatement" }],
          },
        },
      ],
    },
  });

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "preferGuard");
});

test("no-unnecessary-block-callback reports callbacks that only return", () => {
  const { visitor, reports } = createRule("no-unnecessary-block-callback");
  const callback = arrow([id("item")], {
    type: "BlockStatement",
    body: [{ type: "ReturnStatement", argument: id("item") }],
  });
  call(id("map"), [callback]);

  visitor.ArrowFunctionExpression(callback);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "unnecessaryBlock");
});

test("no-unnecessary-async catches no-op async and direct return await", () => {
  const { visitor, reports } = createRule("no-unnecessary-async");
  const noAwait = arrow([], block());
  noAwait.async = true;
  const returnedAwait: any = { type: "AwaitExpression", argument: call(id("load")) };
  const directReturn: any = { type: "ReturnStatement", argument: returnedAwait };
  returnedAwait.parent = directReturn;
  const returnAwait = arrow([], block([directReturn]));
  returnAwait.async = true;

  visitor.ArrowFunctionExpression(noAwait);
  visitor.ArrowFunctionExpression(returnAwait);

  assert.deepEqual(
    reports.map((report) => report.messageId),
    ["unnecessaryAsync", "unnecessaryReturnAwait"],
  );
});

test("no-unnecessary-async keeps async functions with meaningful awaited work", () => {
  const { visitor, reports } = createRule("no-unnecessary-async");
  const awaited: any = { type: "AwaitExpression", argument: call(id("load")) };
  const statement = expressionStatement(awaited);
  const node = arrow([], block([statement, { type: "ReturnStatement", argument: id("value") }]));
  node.async = true;

  visitor.ArrowFunctionExpression(node);

  assert.equal(reports.length, 0);
});

test("no-small-collection-conversion reports small Map and Set inputs", () => {
  const { visitor, reports } = createRule("no-small-collection-conversion");
  const setNode = newExpression("Set", [arrayExpression([literal("a"), literal("b")])]);
  const mapEntry = arrayExpression([literal("a"), literal(1)]);
  const mapNode = newExpression("Map", [arrayExpression([mapEntry])]);
  methodCall(setNode, "has", [id("value")]);
  methodCall(mapNode, "get", [id("key")]);

  visitor.NewExpression(setNode);
  visitor.NewExpression(mapNode);

  assert.deepEqual(
    reports.map((report) => report.data),
    [
      { collection: "Set", count: 2, min: 3 },
      { collection: "Map", count: 1, min: 3 },
    ],
  );
});

test("no-small-collection-conversion ignores useful or unknown collection sizes", () => {
  const { visitor, reports } = createRule("no-small-collection-conversion");
  const values = arrayExpression([literal("a"), literal("b"), literal("c")]);
  const largeSet = newExpression("Set", [values]);
  const dynamicMap = newExpression("Map", [id("entries")]);
  methodCall(largeSet, "has", [id("value")]);
  methodCall(dynamicMap, "get", [id("key")]);

  visitor.NewExpression(largeSet);
  visitor.NewExpression(dynamicMap);
  visitor.NewExpression(newExpression("Set", [arrayExpression([literal("a")])]));
  visitor.NewExpression(newExpression("Set"));

  assert.equal(reports.length, 0);
});

test("prefer-flat-map reports map followed by flat", () => {
  const { visitor, reports } = createRule("prefer-flat-map");
  const mapCall = methodCall(id("items"), "map", [arrow([id("item")], id("item"))]);
  const flatCall = methodCall(mapCall, "flat");

  visitor.CallExpression(flatCall);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "preferFlatMap");
});

test("no-identity-array-callback reports identity map and always-true filter", () => {
  const { visitor, reports } = createRule("no-identity-array-callback");

  visitor.CallExpression(methodCall(id("items"), "map", [arrow([id("item")], id("item"))]));
  visitor.CallExpression(methodCall(id("items"), "filter", [arrow([], literal(true))]));

  assert.equal(reports.length, 2);
  assert.equal(reports[0].messageId, "identityMap");
  assert.equal(reports[1].messageId, "alwaysTrueFilter");
});

test("no-redundant-nullish-fallback reports undefined fallbacks", () => {
  const { visitor, reports } = createRule("no-redundant-nullish-fallback");

  visitor.LogicalExpression(logical(id("value"), id("undefined"), "??"));

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "redundantUndefined");
});

test("prefer-object-lookup reports long equality OR chains", () => {
  const { visitor, reports } = createRule("prefer-object-lookup");
  const first = binary(id("type"), "===", literal("a"));
  const second = binary(id("type"), "===", literal("b"));
  const third = binary(id("type"), "===", literal("c"));
  const chain = logical(logical(first, second, "||"), third, "||");

  visitor.LogicalExpression(chain);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "preferLookup");
});

test("prefer-object-lookup allows custom equality operators", () => {
  const { visitor, reports } = createRule("prefer-object-lookup", [
    { min: 2, operators: ["is"] },
  ]);
  const first = binary(id("type"), "is", literal("a"));
  const second = binary(id("type"), "is", literal("b"));
  const chain = logical(first, second, "||");

  visitor.LogicalExpression(chain);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].messageId, "preferLookup");
});

test("flat config works through ESLint Linter when ESLint is installed", async (t) => {
  let Linter;
  try {
    ({ Linter } = await import("eslint"));
  } catch {
    t.skip("ESLint is not installed");
    return;
  }

  const linter = new Linter({ configType: "flat" });
  const messages = linter.verify(
    "if (ready && enabled) { run(); }\n",
    [
      {
        plugins: { legibility: plugin },
        languageOptions: { ecmaVersion: 2022, sourceType: "script" },
        rules: { "legibility/hoist-if-operators": "error" },
      },
    ],
    { filename: "src/check.js" },
  );

  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, "legibility/hoist-if-operators");
});

test("flat config enables ESLint complexity limits", async () => {
  const { Linter } = await import("eslint");
  const branches = Array.from(
    { length: 21 },
    (_, index) => `  if (value === ${index}) return ${index};`,
  );
  const padding = Array.from({ length: 20 }, (_, index) => `  const pad${index} = ${index};`);
  const lines = ["function choose(value) {"].concat(branches, padding, "  return value;", "}");
  const source = lines.join("\n");
  const linter = new Linter({ configType: "flat" });
  const messages = linter.verify(source, [plugin.configs["flat/strict"]]);
  const coreRuleIds = messages
    .map((message) => message.ruleId)
    .filter((ruleId) => ruleId === "complexity" || ruleId === "max-lines-per-function")
    .sort();

  assert.deepEqual(coreRuleIds, ["complexity", "max-lines-per-function"]);
});

test("no-unnecessary-async ignores shadowed filesystem imports", async () => {
  const { Linter } = await import("eslint");
  const source = [
    'import { readFile } from "node:fs/promises";',
    'import { promises as fs } from "node:fs";',
    'async function readConfig() { return await readFile("config.json", "utf8"); }',
    'async function readData() { const value = await fs.readFile("data.json"); return value; }',
    'async function request() { const value = await fetch("/data"); return value.json(); }',
    'async function readParameter(readFile) { const value = await readFile("remote"); return value; }',
    'async function readClient() { const fs = client; const value = await fs.readFile("remote"); return value; }',
  ].join("\n");
  const linter = new Linter({ configType: "flat" });
  const messages = linter.verify(
    source,
    [
      {
        plugins: { legibility: plugin },
        languageOptions: { ecmaVersion: 2022, sourceType: "module" },
        rules: { "legibility/no-unnecessary-async": "error" },
      },
    ],
    { filename: "scripts/read-data.js" },
  );

  assert.deepEqual(
    messages.map((message) => ({ line: message.line, messageId: message.messageId })),
    [
      { line: 3, messageId: "synchronousFilesystem" },
      { line: 4, messageId: "synchronousFilesystem" },
    ],
  );
});

test("max-function-parameters handles TypeScript signatures and this parameters", async () => {
  const { Linter } = await import("eslint");
  const tseslint = (await import("typescript-eslint")).default;
  const source = [
    "declare function declared(a: string, b: string, c: string, d: string, e: string): void;",
    "type Handler = (a: string, b: string, c: string, d: string, e: string) => void;",
    "function runtime(this: void, a: string, b: string, c: string, d: string): void {}",
  ].join("\n");
  const linter = new Linter({ configType: "flat" });
  const messages = linter.verify(
    source,
    [
      {
        files: ["**/*.ts"],
        plugins: { legibility: plugin },
        languageOptions: { parser: tseslint.parser },
        rules: { "legibility/max-function-parameters": "error" },
      },
    ],
    { filename: "src/check.ts" },
  );

  assert.deepEqual(
    messages.map((message) => ({ line: message.line, ruleId: message.ruleId })),
    [
      { line: 1, ruleId: "legibility/max-function-parameters" },
      { line: 2, ruleId: "legibility/max-function-parameters" },
    ],
  );
});

test("comment rules work through ESLint Linter when ESLint is installed", async (t) => {
  let Linter;
  try {
    ({ Linter } = await import("eslint"));
  } catch {
    t.skip("ESLint is not installed");
    return;
  }

  const identifier = ["chat", "gpt"].join("");
  const attribution = ["Generated by", identifier].join(" ");
  const invalidSource = ["/*", ` * ${attribution}.`, " */", "const value = true;"].join(
    "\n",
  );
  const linter = new Linter({ configType: "flat" });
  const config = [
    {
      plugins: { legibility: plugin },
      languageOptions: { ecmaVersion: 2022, sourceType: "script" },
      rules: {
        "legibility/no-automated-comment-attribution": "error",
        "legibility/no-stacked-comments": "error",
        "legibility/no-unmatched-comments": [
          "error",
          { matchers: [], prefixIdentifiers: ["APPROVED"] },
        ],
        "legibility/require-jsdoc-multiline-comments": "error",
      },
    },
  ];
  const invalidMessages = linter.verify(invalidSource, config, { filename: "src/check.js" });
  const invalidRuleIds = invalidMessages.map((message) => message.ruleId).sort();

  assert.deepEqual(invalidRuleIds, [
    "legibility/no-automated-comment-attribution",
    "legibility/no-unmatched-comments",
    "legibility/require-jsdoc-multiline-comments",
  ]);

  const validSource = [
    "/**",
    " * APPROVED: Explain the value.",
    " */",
    "const value = true;",
  ].join("\n");
  const validMessages = linter.verify(validSource, config, { filename: "src/check.js" });

  assert.equal(validMessages.length, 0);

  const stackedSource = [
    "// APPROVED: First explanation.",
    "// APPROVED: Second explanation.",
    "const value = true;",
  ].join("\n");
  const stackedMessages = linter.verify(stackedSource, config, { filename: "src/check.js" });

  assert.deepEqual(
    stackedMessages.map((message) => message.ruleId),
    ["legibility/no-stacked-comments"],
  );
});

interface LintDiagnostic {
  code: string;
  severity: string;
}

interface LintFixtureCase {
  directory: string;
  expected: LintDiagnostic[];
  invalidFiles: string[];
  invalidStatus: number;
  validFiles: string[];
}

const defaultFixtureRuleNames = [
  "max-function-parameters",
  "no-complex-ternaries",
  "prefer-early-return",
  "prefer-flat-map",
  "prefer-object-lookup",
];
const recommendedFixtureRuleNames = RECOMMENDED_RULE_NAMES.concat(COMMENT_RULE_NAMES);
const strictFixtureRuleNames = recommendedFixtureRuleNames.concat(STRICT_ONLY_RULE_NAMES);
const optInFixtureRuleNames = strictFixtureRuleNames.concat(Array.from(OPT_IN_RULE_NAMES));

function createFixtureDiagnostics(
  engine: "eslint" | "oxlint",
  ruleNames: readonly string[],
  severity: string,
): LintDiagnostic[] {
  return ruleNames
    .map((ruleName) => {
      const code = engine === "eslint" ? `legibility/${ruleName}` : `legibility(${ruleName})`;
      return { code, severity };
    })
    .toSorted((left, right) => left.code.localeCompare(right.code));
}

function assertFixtureFilesCovered(engine: "eslint" | "oxlint", fixture: LintFixtureCase): void {
  const fixtureRoot = join("tests", "fixtures", engine, fixture.directory);
  const configName = `${engine}.config.ts`;
  const sourceFiles = readdirSync(fixtureRoot)
    .filter((file) => file.endsWith(".ts") && file !== configName)
    .toSorted();
  const coveredFiles = fixture.invalidFiles.concat(fixture.validFiles).toSorted();
  assert.deepEqual(coveredFiles, sourceFiles);
}

interface OxlintFixtureResult {
  diagnostics: LintDiagnostic[];
  error: Error | undefined;
  status: number | null;
  stderr: string;
}

function runOxlintFixture(directory: string, filenames: readonly string[]): OxlintFixtureResult {
  const oxlintName = process.platform === "win32" ? "oxlint.cmd" : "oxlint";
  const oxlintPath = join(process.cwd(), "node_modules", ".bin", oxlintName);
  const fixtureRoot = join("tests", "fixtures", "oxlint", directory);
  const configPath = join(fixtureRoot, "oxlint.config.ts");
  const sourcePaths = filenames.map((filename) => join(fixtureRoot, filename));
  const result = spawnSync(
    oxlintPath,
    ["--config", configPath, "--format", "json"].concat(sourcePaths),
    { encoding: "utf8" },
  );
  const output: { diagnostics: LintDiagnostic[] } = result.stdout
    ? JSON.parse(result.stdout)
    : { diagnostics: [] };
  return {
    diagnostics: output.diagnostics,
    error: result.error,
    status: result.status,
    stderr: result.stderr,
  };
}

function getOxlintDiagnostics(diagnostics: LintDiagnostic[]): LintDiagnostic[] {
  const pluginDiagnostics = diagnostics
    .filter((diagnostic) => diagnostic.code.startsWith("legibility("))
    .map(({ code, severity }) => ({ code, severity }));
  return uniqueDiagnostics(pluginDiagnostics);
}

function uniqueDiagnostics(diagnostics: LintDiagnostic[]): LintDiagnostic[] {
  const entries = diagnostics.map((diagnostic) => [diagnostic.code, diagnostic] as const);
  return Array.from(new Map(entries).values()).toSorted((left, right) =>
    left.code.localeCompare(right.code),
  );
}

const oxlintFixtureCases: LintFixtureCase[] = [
  {
    directory: "default",
    expected: createFixtureDiagnostics("oxlint", defaultFixtureRuleNames, "error"),
    invalidFiles: ["invalid.ts"],
    invalidStatus: 1,
    validFiles: ["valid.ts"],
  },
  {
    directory: "recommended",
    expected: createFixtureDiagnostics("oxlint", recommendedFixtureRuleNames, "warning"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 0,
    validFiles: ["valid.ts"],
  },
  {
    directory: "strict",
    expected: createFixtureDiagnostics("oxlint", strictFixtureRuleNames, "error"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 1,
    validFiles: ["valid.ts"],
  },
  {
    directory: "opt-in",
    expected: createFixtureDiagnostics("oxlint", optInFixtureRuleNames, "error"),
    invalidFiles: ["button.ts", "features.ts", "mixed-File.ts"],
    invalidStatus: 1,
    validFiles: ["index.ts"],
  },
];

oxlintFixtureCases.forEach((fixture) => {
  test(`oxlint ${fixture.directory} fixture enforces its config`, (t) => {
    assertFixtureFilesCovered("oxlint", fixture);
    const invalidResult = runOxlintFixture(fixture.directory, fixture.invalidFiles);
    const spawnError = invalidResult.error as NodeJS.ErrnoException | undefined;
    if (spawnError?.code === "ENOENT") {
      t.skip("Oxlint is not installed");
      return;
    }

    assert.equal(invalidResult.stderr, "");
    assert.equal(invalidResult.status, fixture.invalidStatus);
    assert.deepEqual(getOxlintDiagnostics(invalidResult.diagnostics), fixture.expected);
    const validResult = runOxlintFixture(fixture.directory, fixture.validFiles);
    assert.equal(validResult.status, 0);
    assert.deepEqual(getOxlintDiagnostics(validResult.diagnostics), []);
  });
});

interface EslintMessage {
  ruleId: string | null;
  severity: number;
}

interface EslintFileResult {
  messages: EslintMessage[];
}

interface EslintFixtureResult {
  error: Error | undefined;
  results: EslintFileResult[];
  status: number | null;
  stderr: string;
}

function createEslintArgs(fixtureRoot: string, filenames: readonly string[]): string[] {
  const configPath = join(fixtureRoot, "eslint.config.ts");
  const sourcePaths = filenames.map((filename) => join(fixtureRoot, filename));
  return ["--config", configPath, "--format", "json"].concat(sourcePaths);
}

function runEslintFixture(directory: string, filenames: readonly string[]): EslintFixtureResult {
  const eslintName = process.platform === "win32" ? "eslint.cmd" : "eslint";
  const eslintPath = join(process.cwd(), "node_modules", ".bin", eslintName);
  const fixtureRoot = join("tests", "fixtures", "eslint", directory);
  const args = createEslintArgs(fixtureRoot, filenames);
  const result = spawnSync(eslintPath, args, { encoding: "utf8" });
  const results: EslintFileResult[] = result.stdout ? JSON.parse(result.stdout) : [];
  return { error: result.error, results, status: result.status, stderr: result.stderr };
}

function getEslintSeverity(severity: number): string {
  if (severity === 2) return "error";
  return "warning";
}

function normalizeEslintMessage(message: EslintMessage): LintDiagnostic {
  const code = message.ruleId ?? "";
  const severity = getEslintSeverity(message.severity);
  return { code, severity };
}

function getEslintDiagnostics(results: EslintFileResult[]): LintDiagnostic[] {
  const pluginDiagnostics = results
    .flatMap((result) => result.messages)
    .filter((message) => message.ruleId?.startsWith("legibility/"))
    .map(normalizeEslintMessage);
  return uniqueDiagnostics(pluginDiagnostics);
}

const eslintFixtureCases: LintFixtureCase[] = [
  {
    directory: "default",
    expected: createFixtureDiagnostics("eslint", defaultFixtureRuleNames, "error"),
    invalidFiles: ["invalid.ts"],
    invalidStatus: 1,
    validFiles: ["valid.ts"],
  },
  {
    directory: "recommended",
    expected: createFixtureDiagnostics("eslint", recommendedFixtureRuleNames, "warning"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 0,
    validFiles: ["valid.ts"],
  },
  {
    directory: "strict",
    expected: createFixtureDiagnostics("eslint", strictFixtureRuleNames, "error"),
    invalidFiles: ["features.ts", "invalid.ts", "mixed-File.ts"],
    invalidStatus: 1,
    validFiles: ["valid.ts"],
  },
  {
    directory: "opt-in",
    expected: createFixtureDiagnostics("eslint", optInFixtureRuleNames, "error"),
    invalidFiles: ["button.ts", "features.ts", "mixed-File.ts"],
    invalidStatus: 1,
    validFiles: ["index.ts"],
  },
];

function verifyEslintFixture(fixture: LintFixtureCase, t: TestContext): void {
  assertFixtureFilesCovered("eslint", fixture);
  const invalidResult = runEslintFixture(fixture.directory, fixture.invalidFiles);
  const spawnError = invalidResult.error as NodeJS.ErrnoException | undefined;
  if (spawnError?.code === "ENOENT") {
    t.skip("ESLint is not installed");
    return;
  }

  assert.equal(invalidResult.stderr, "");
  assert.equal(invalidResult.status, fixture.invalidStatus);
  assert.deepEqual(getEslintDiagnostics(invalidResult.results), fixture.expected);
  const validResult = runEslintFixture(fixture.directory, fixture.validFiles);
  assert.equal(validResult.status, 0);
  assert.deepEqual(getEslintDiagnostics(validResult.results), []);
}

eslintFixtureCases.forEach((fixture) => {
  test(`eslint ${fixture.directory} fixture enforces its config`, (t) => {
    verifyEslintFixture(fixture, t);
  });
});
