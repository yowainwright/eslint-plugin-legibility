import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import manifest from "../package.json" with { type: "json" };

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
  assert.equal(plugin.meta.name, "legibility");
  assert.equal(plugin.meta.version, manifest.version);
  assert.ok(plugin.rules["max-expression-operators"]);
  assert.ok(plugin.rules["prefer-early-return"]);
  assert.ok(plugin.configs["flat/recommended"].plugins.legibility);
  assert.equal(plugin.configs.recommended.plugins[0], "legibility");
  assert.equal(requiredPlugin, plugin);
  assert.equal(requiredPlugin.meta.name, "legibility");
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

test("no-direct-node-bin-smoke reports direct node smoke tests", () => {
  const { visitor, reports } = createRule("no-direct-node-bin-smoke");
  const execSync = call(id("execSync"), [literal("node src/index.js --help")]);

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

test("oxlint can load the package as a JS plugin when oxlint is installed", (t) => {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    [
      "exec",
      "oxlint",
      "--config",
      "tests/fixtures/oxlint/oxlint.fixture.json",
      "tests/fixtures/oxlint/bad.ts",
    ],
    { encoding: "utf8" },
  );

  const spawnError = result.error as NodeJS.ErrnoException | undefined;
  if (spawnError?.code === "ENOENT") {
    t.skip("pnpm is not installed");
    return;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes('Command "oxlint" not found')) {
    t.skip("Oxlint is not installed");
    return;
  }

  assert.notEqual(result.status, 0);
  assert.match(output, /legibility(?:\/|\()prefer-early-return/);
});
