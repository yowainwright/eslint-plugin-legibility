import assert from "node:assert/strict";
import test from "node:test";

import type {
  AstNode,
  RuleConfig,
  RuleContext,
  RuleOptions,
  RuleReport,
  RuleSchema,
} from "../../../src/types.ts";

const literalNode = {
  __text: '"ready"',
  type: "Literal",
  value: "ready",
} satisfies AstNode;

const operatorOptions = [
  {
    complexity: { "&&": 1, "||": 1 },
    max: 2,
    operators: ["&&", "||"],
  },
] as const satisfies RuleOptions;

const operatorRuleConfig = [
  "warn",
  {
    complexity: { "&&": 1 },
    max: 1,
    operators: ["&&"],
  },
] as const satisfies RuleConfig;

const operatorRuleSchema = [
  {
    additionalProperties: false,
    properties: {
      max: { minimum: 0, type: "number" },
      operators: {
        items: { type: "string" },
        type: "array",
      },
    },
    type: "object",
  },
] as const satisfies RuleSchema;

function assertRejectedTypes(): void {
  const context = {
    report(_report: RuleReport): void {},
  } satisfies RuleContext;

  // @ts-expect-error report nodes must be AST nodes.
  context.report({ messageId: "bad", node: "literal" });

  // @ts-expect-error rule options must be JSON-like values.
  void (["warn", { parse: () => true }] satisfies RuleConfig);

  // @ts-expect-error AST values must be AST/JSON-like values.
  void ({ type: "Literal", value: () => true } satisfies AstNode);

  // @ts-expect-error rule report data only accepts primitive interpolation values.
  context.report({ data: { nested: { count: 1 } }, messageId: "bad", node: literalNode });
}

void assertRejectedTypes;

test("exported types accept strict rule configs, schemas, and reports", () => {
  const reports: RuleReport[] = [];
  const context = {
    options: operatorOptions,
    report(report: RuleReport): void {
      reports.push(report);
    },
  } satisfies RuleContext;

  context.report({
    data: { count: 1, enabled: true, name: "value" },
    messageId: "literal",
    node: literalNode,
  });

  assert.deepEqual(context.options, operatorOptions);
  assert.equal(operatorRuleConfig[0], "warn");
  assert.equal(operatorRuleSchema[0].type, "object");
  assert.equal(reports[0]?.data?.count, 1);
});
