const { version: PACKAGE_VERSION } = require("../package.json");

export { PACKAGE_VERSION };

export const PLUGIN_NAME = "legibility";

export const DEFAULT_MAX_EXPRESSION_OPERATORS = 4;
export const DEFAULT_MAX_IF_OPERATORS = 0;
export const DEFAULT_MAX_TERNARY_OPERATORS = 2;
export const DEFAULT_MAX_COMPUTED_VALUE_OPERATORS = 1;
export const DEFAULT_MAX_CONTROL_FLOW_DEPTH = 3;
export const DEFAULT_MAX_ARRAY_CHAIN_DEPTH = 2;
export const DEFAULT_MIN_OBJECT_LOOKUP_CHAIN_LENGTH = 3;

export const SKIP_KEYS = new Set(["parent", "loc", "range", "tokens", "comments"]);

export const FUNCTION_NODE_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

export const EXPRESSION_CONTAINER_NODE_TYPES = new Set([
  "ArrayExpression",
  "CallExpression",
  "ObjectExpression",
  "TaggedTemplateExpression",
  "TemplateLiteral",
]);

export const READABILITY_OPERATOR_NODE_TYPES = new Set([
  "ConditionalExpression",
  "LogicalExpression",
]);

export const IF_CONDITION_OPERATOR_NODE_TYPES = new Set([
  "ConditionalExpression",
  "LogicalExpression",
]);

export const COMPUTED_VALUE_OPERATOR_NODE_TYPES = new Set([
  "BinaryExpression",
  "ConditionalExpression",
  "LogicalExpression",
  "UnaryExpression",
]);

export const COMPARISON_OPERATORS = new Set([
  "!=",
  "!==",
  "<",
  "<=",
  "==",
  "===",
  ">",
  ">=",
  "in",
  "instanceof",
]);

export const LOOP_TYPES = new Set([
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "WhileStatement",
]);

export const CONTROL_FLOW_TYPES = new Set([
  "CatchClause",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "IfStatement",
  "SwitchStatement",
  "WhileStatement",
]);

export const TERMINAL_STATEMENT_TYPES = new Set([
  "BreakStatement",
  "ContinueStatement",
  "ReturnStatement",
  "ThrowStatement",
]);

export const SEARCH_METHODS = new Set(["filter", "find", "includes", "indexOf", "some"]);

export const EQUALITY_OPERATORS = new Set(["==", "===", "!=", "!=="]);

export const ITERATION_METHODS = new Set([
  "every",
  "filter",
  "find",
  "flatMap",
  "forEach",
  "map",
  "reduce",
  "some",
]);

export const SIDE_EFFECT_FREE_ITERATION_METHODS = new Set([
  "every",
  "filter",
  "find",
  "flatMap",
  "map",
  "some",
]);

export const MUTATING_METHODS = new Set([
  "add",
  "clear",
  "copyWithin",
  "delete",
  "fill",
  "pop",
  "push",
  "reverse",
  "set",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

export const ARRAY_MUTATING_METHODS = new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

export const DEFAULT_EXECUTABLE_ENTRY_PATTERNS = [
  "src/index.js",
  "src/index.ts",
  "src/cli/index.js",
  "src/cli/index.ts",
];

export const DEFAULT_EXECUTABLE_RUNTIMES = ["bun", "node"];

export const DEFAULT_DIRECT_BIN_ENTRY_PATTERNS = [
  "app/*/index.js",
  "dist/cli/index.js",
  "dist/index.js",
  "src/cli/index.js",
  "src/cli/index.ts",
  "src/index.js",
  "src/index.ts",
  "*/dist/cli/index.js",
  "*/dist/index.js",
];
