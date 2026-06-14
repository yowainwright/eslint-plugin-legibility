import packageManifest from "../package.json" with { type: "json" };
import type { RuleMeta } from "./types.js";

const PACKAGE_VERSION = packageManifest.version;

export { PACKAGE_VERSION };

export const PLUGIN_NAME = "legibility";

export const DEFAULT_MAX_EXPRESSION_OPERATORS = 4;
export const DEFAULT_MIN_DIRNAME_MATCH_DEPTH = 3;

export const DEFAULT_ALLOWED_FILENAME_QUALIFIERS = new Set([
  "constants",
  "helpers",
  "spec",
  "styles",
  "test",
  "types",
  "utils",
]);

export const DEFAULT_ALLOWED_STANDALONE_FILENAMES = new Set([
  "constants",
  "index",
  "types",
  "utils",
]);
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

export const DEFAULT_READABILITY_OPERATOR_COMPLEXITY = {
  "!=": 1,
  "!==": 1,
  "&&": 1,
  "<": 1,
  "<=": 1,
  "==": 1,
  "===": 1,
  ">": 1,
  ">=": 1,
  "??": 1,
  "?:": 1,
  "!": 1,
  in: 1,
  instanceof: 1,
  "||": 1,
};

export const DEFAULT_IF_CONDITION_OPERATOR_COMPLEXITY = {
  "&&": 1,
  "??": 1,
  "?:": 1,
  "||": 1,
};

export const DEFAULT_COMPUTED_VALUE_OPERATOR_COMPLEXITY = {
  "!=": 1,
  "!==": 1,
  "%": 1,
  "&": 1,
  "&&": 1,
  "*": 1,
  "**": 1,
  "+": 1,
  "-": 1,
  "/": 1,
  "<": 1,
  "<<": 1,
  "<=": 1,
  "==": 1,
  "===": 1,
  ">": 1,
  ">=": 1,
  ">>": 1,
  ">>>": 1,
  "??": 1,
  "?:": 1,
  "!": 1,
  "~": 1,
  "^": 1,
  delete: 1,
  in: 1,
  instanceof: 1,
  typeof: 1,
  void: 1,
  "|": 1,
  "||": 1,
};

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

export const OBJECT_LOOKUP_OPERATORS = new Set(["==", "==="]);

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

export const SHELL_COMMAND_FUNCTIONS = new Set(["exec", "execSync"]);
export const ARG_COMMAND_FUNCTIONS = new Set(["execFile", "execFileSync", "spawn", "spawnSync"]);

export const NEGATIVE_CONDITION_NAME_PATTERN =
  /^(?:is|are|was|were|has|have|had|can|could|should|will|would|did|does)(?:Not|No)[A-Z]/;

export const FLAT_METHODS = new Set(["flat"]);
export const MAP_METHODS = new Set(["map"]);

export const RECOMMENDED_RULE_NAMES = [
  "hoist-if-operators",
  "max-array-chain-depth",
  "max-control-flow-depth",
  "max-expression-operators",
  "no-complex-ternaries",
  "no-computed-values",
  "no-direct-node-bin-smoke",
  "no-hidden-side-effects",
  "no-identity-array-callback",
  "no-mixed-filename-casing",
  "no-quadratic-patterns",
  "no-redundant-boolean-logic",
  "no-redundant-nullish-fallback",
  "no-standalone-array-mutations",
  "no-trivial-wrapper-functions",
  "no-unnecessary-block-callback",
  "prefer-concat-object-assign",
  "prefer-early-return",
  "prefer-flat-map",
  "prefer-guard-clauses",
  "prefer-object-lookup",
  "require-executable-shebang",
  "require-filename-matches-dirname",
];

const STRING_ARRAY_SCHEMA = { type: "array", items: { type: "string" } };

const OPERATOR_COMPLEXITY_SCHEMA = {
  type: "object",
  additionalProperties: { type: "number", minimum: 0 },
};

const OPERATOR_OPTIONS_SCHEMA = {
  complexity: OPERATOR_COMPLEXITY_SCHEMA,
  operators: STRING_ARRAY_SCHEMA,
};

function maxOperatorRuleSchema(minimum: number): RuleMeta["schema"] {
  return [
    {
      type: "object",
      properties: Object.assign({}, { max: { type: "number", minimum } }, OPERATOR_OPTIONS_SCHEMA),
      additionalProperties: false,
    },
  ];
}

function ruleUrl(ruleName: string): string {
  return `https://github.com/yowainwright/eslint-plugin-legibility#${ruleName}`;
}

function defineMeta(ruleName: string, meta: RuleMeta): RuleMeta {
  const docs = Object.assign({}, meta.docs, { url: ruleUrl(ruleName) });
  return Object.assign({}, meta, { docs });
}

export const MAX_EXPRESSION_OPERATORS_META = defineMeta("max-expression-operators", {
  type: "suggestion",
  docs: {
    description: "Limit readable-complexity operators inside a single expression.",
    recommended: true,
  },
  schema: maxOperatorRuleSchema(1),
  messages: {
    tooMany:
      "Expression has {{count}} readability operators (max {{max}}). Extract named sub-expressions.",
  },
});

export const NO_QUADRATIC_PATTERNS_META = defineMeta("no-quadratic-patterns", {
  type: "suggestion",
  docs: {
    description: "Flag nested loops, search-in-loop, and nested array iteration patterns.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        iterationMethods: STRING_ARRAY_SCHEMA,
        searchMethods: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    nestedIteration:
      "Nested array iteration (.{{outer}}() containing .{{inner}}()) is likely O(n^2). Consider restructuring.",
    nestedLoop: "Nested loop detected. Consider using a Map or Set for lookups.",
    searchInLoop:
      "Array search method .{{method}}() inside a loop is likely O(n^2). Consider using a Map or Set.",
  },
});

export const HOIST_IF_OPERATORS_META = defineMeta("hoist-if-operators", {
  type: "suggestion",
  docs: {
    description: "Prefer named boolean expressions before operator-heavy if statements.",
    recommended: true,
  },
  schema: maxOperatorRuleSchema(0),
  messages: {
    tooMany:
      "If condition has {{count}} readability operators (max {{max}}). Hoist it into a named boolean.",
  },
});

export const NO_HIDDEN_SIDE_EFFECTS_META = defineMeta("no-hidden-side-effects", {
  type: "suggestion",
  docs: {
    description: "Flag side effects hidden inside expressions and side-effect-free callbacks.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        mutatingMethods: STRING_ARRAY_SCHEMA,
        sideEffectFreeIterationMethods: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    callbackSideEffect:
      "Avoid side effects inside .{{method}}() callbacks. Extract the mutation or use a clearer control flow.",
    hiddenSideEffect:
      "Avoid side effects inside expressions. Move this mutation into its own statement.",
  },
});

export const NO_STANDALONE_ARRAY_MUTATIONS_META = defineMeta("no-standalone-array-mutations", {
  type: "suggestion",
  docs: {
    description: "Avoid standalone array mutations when a composable expression is clearer.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        arrayMutatingMethods: STRING_ARRAY_SCHEMA,
        mutatingMethods: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    standaloneArrayMutation:
      "Avoid standalone .{{method}}() array mutation. Prefer a returned array expression or a named helper.",
  },
});

export const NO_COMPUTED_VALUES_META = defineMeta("no-computed-values", {
  type: "suggestion",
  docs: {
    description:
      "Prefer named values before returning computed expressions or assigning computed object values.",
    recommended: true,
  },
  schema: maxOperatorRuleSchema(0),
  messages: {
    computedObjectValue:
      "Object value has {{count}} computed operators (max {{max}}). Extract it into a named value before building the object.",
    computedReturn:
      "Return value has {{count}} computed operators (max {{max}}). Extract it into a named value before returning.",
  },
});

export const PREFER_CONCAT_OBJECT_ASSIGN_META = defineMeta("prefer-concat-object-assign", {
  type: "suggestion",
  docs: {
    description:
      "Prefer explicit concat/Object.assign composition over array or object literal spread.",
    recommended: true,
  },
  schema: [],
  messages: {
    arraySpread: "Prefer Array#concat over array literal spread so array composition is explicit.",
    objectSpread:
      "Prefer Object.assign with an empty target over object literal spread so object composition is explicit.",
  },
});

export const NO_COMPLEX_TERNARIES_META = defineMeta("no-complex-ternaries", {
  type: "suggestion",
  docs: {
    description: "Keep ternaries simple enough to read without extracting branches.",
    recommended: true,
  },
  schema: maxOperatorRuleSchema(1),
  messages: {
    tooMany:
      "Ternary has {{count}} readability operators (max {{max}}). Extract named branches or use an if statement.",
    nested: "Nested ternary detected. Extract named branches or use an if statement.",
  },
});

export const REQUIRE_EXECUTABLE_SHEBANG_META = defineMeta("require-executable-shebang", {
  type: "problem",
  docs: {
    description: "Require configured executable entry source files to start with a shebang.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        files: STRING_ARRAY_SCHEMA,
        runtimes: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    missingShebang:
      "{{file}} is configured as an executable entry source but has no Node/Bun shebang.",
  },
});

export const NO_DIRECT_NODE_BIN_SMOKE_META = defineMeta("no-direct-node-bin-smoke", {
  type: "problem",
  docs: {
    description:
      "Prefer smoke-testing installed package binaries instead of direct node entrypoint execution.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        entryPatterns: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    directNodeBin:
      "Smoke tests should execute the installed package bin, not `node {{entry}}`, so bin shims and shebangs are exercised.",
  },
});

export const MAX_CONTROL_FLOW_DEPTH_META = defineMeta("max-control-flow-depth", {
  type: "suggestion",
  docs: {
    description: "Limit nested control flow so branches stay easy to scan.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: { max: { type: "integer", minimum: 1 } },
      additionalProperties: false,
    },
  ],
  messages: {
    tooDeep:
      "Control-flow depth is {{depth}} (max {{max}}). Extract a helper or return early to flatten the branch.",
  },
});

export const PREFER_EARLY_RETURN_META = defineMeta("prefer-early-return", {
  type: "suggestion",
  docs: {
    description: "Avoid else branches after an if branch already exits.",
    recommended: true,
  },
  schema: [],
  messages: {
    avoidElse:
      "Avoid an else branch after this if branch exits. Return early and keep the follow-up path unindented.",
  },
});

export const MAX_ARRAY_CHAIN_DEPTH_META = defineMeta("max-array-chain-depth", {
  type: "suggestion",
  docs: {
    description: "Limit consecutive array callback chains to keep data flow readable.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        iterationMethods: STRING_ARRAY_SCHEMA,
        max: { type: "integer", minimum: 1 },
      },
      additionalProperties: false,
    },
  ],
  messages: {
    tooMany:
      "Array method chain has {{count}} steps (max {{max}}): {{chain}}. Name intermediate values or use a single pass.",
  },
});

export const NO_REPEATED_COLLECTION_SEARCH_META = defineMeta("no-repeated-collection-search", {
  type: "suggestion",
  docs: {
    description:
      "Flag repeated searches over the same collection in one scope; prefer a named lookup Map or Set.",
    recommended: false,
  },
  schema: [
    {
      type: "object",
      properties: {
        searchMethods: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    repeatedSearch:
      "{{collection}} is searched multiple times with .{{method}}() in this scope. Build a named lookup when repeated scans are intentional.",
  },
});

export const NO_REDUNDANT_BOOLEAN_LOGIC_META = defineMeta("no-redundant-boolean-logic", {
  type: "suggestion",
  docs: {
    description: "Avoid verbose boolean comparisons and boolean-only ternaries.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        equalityOperators: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    booleanComparison:
      "Avoid comparing to {{value}}. Use the boolean expression directly.",
    booleanTernary:
      "Avoid a ternary that only returns booleans. Use the condition or its negation.",
  },
});

export const NO_TRIVIAL_WRAPPER_FUNCTIONS_META = defineMeta("no-trivial-wrapper-functions", {
  type: "suggestion",
  docs: {
    description: "Avoid functions that only forward their parameters to another call.",
    recommended: true,
  },
  schema: [],
  messages: {
    trivialWrapper:
      "{{name}} only forwards its parameters to {{target}}. Inline it or give the wrapper distinct behavior.",
  },
});

export const PREFER_POSITIVE_CONDITION_NAMES_META = defineMeta("prefer-positive-condition-names", {
  type: "suggestion",
  docs: {
    description: "Prefer positive boolean names instead of double-negative condition names.",
    recommended: false,
  },
  schema: [
    {
      type: "object",
      properties: {
        booleanOperators: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    negativeName:
      "Prefer a positive condition name instead of {{name}} to avoid double negatives.",
  },
});

export const NO_SINGLE_USE_RENAMING_ALIAS_META = defineMeta("no-single-use-renaming-alias", {
  type: "suggestion",
  docs: {
    description: "Avoid aliases that only rename another identifier or member once.",
    recommended: false,
  },
  schema: [],
  messages: {
    singleUseAlias:
      "{{name}} only renames {{target}} for one use. Use the original value or extract a more meaningful expression.",
  },
});

export const PREFER_GUARD_CLAUSES_META = defineMeta("prefer-guard-clauses", {
  type: "suggestion",
  docs: {
    description: "Prefer guard clauses over wrapping a whole function body in one branch.",
    recommended: true,
  },
  schema: [],
  messages: {
    preferGuard:
      "Prefer a guard clause before the main path instead of wrapping the function body in an if statement.",
  },
});

export const NO_UNNECESSARY_BLOCK_CALLBACK_META = defineMeta("no-unnecessary-block-callback", {
  type: "suggestion",
  docs: {
    description: "Prefer expression-bodied arrow callbacks when the block only returns.",
    recommended: true,
  },
  schema: [],
  messages: {
    unnecessaryBlock:
      "This arrow callback only returns a value. Use an expression body instead.",
  },
});

export const PREFER_FLAT_MAP_META = defineMeta("prefer-flat-map", {
  type: "suggestion",
  docs: {
    description: "Prefer flatMap over map followed by flat.",
    recommended: true,
  },
  schema: [],
  messages: {
    preferFlatMap: "Prefer .flatMap() over .map().flat() for one-pass flattening.",
  },
});

export const NO_IDENTITY_ARRAY_CALLBACK_META = defineMeta("no-identity-array-callback", {
  type: "suggestion",
  docs: {
    description: "Avoid array callbacks that keep every item unchanged.",
    recommended: true,
  },
  schema: [],
  messages: {
    identityMap: "Avoid .map() callbacks that return the item unchanged.",
    alwaysTrueFilter: "Avoid .filter() callbacks that always keep every item.",
  },
});

export const NO_REDUNDANT_NULLISH_FALLBACK_META = defineMeta("no-redundant-nullish-fallback", {
  type: "suggestion",
  docs: {
    description: "Avoid nullish fallbacks that return undefined unchanged.",
    recommended: true,
  },
  schema: [],
  messages: {
    redundantUndefined:
      "Avoid `?? undefined`; the expression already evaluates to undefined when nullish.",
  },
});

export const PREFER_OBJECT_LOOKUP_META = defineMeta("prefer-object-lookup", {
  type: "suggestion",
  docs: {
    description: "Prefer Set or object lookups over long equality OR chains.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        min: { type: "integer", minimum: 2 },
        operators: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    preferLookup:
      "Replace repeated {{name}} equality checks with a Set or lookup object.",
  },
});

export const REQUIRE_FILENAME_MATCHES_DIRNAME_META = defineMeta("require-filename-matches-dirname", {
  type: "suggestion",
  docs: {
    description: "Require files in named subdirectories to match the directory name.",
    recommended: true,
  },
  schema: [
    {
      type: "object",
      properties: {
        minDepth: { type: "integer", minimum: 1 },
        allowedQualifiers: STRING_ARRAY_SCHEMA,
        allowedFilenames: STRING_ARRAY_SCHEMA,
      },
      additionalProperties: false,
    },
  ],
  messages: {
    mismatch:
      "Filename \"{{name}}\" does not match parent directory \"{{dir}}\". Use {{dir}}.ts, {{dir}}.{qualifier}.ts, or a known filename (index, types, constants, utils).",
    unknownQualifier:
      "Qualifier \"{{qualifier}}\" in \"{{name}}\" is not in the allowed list: {{allowed}}.",
  },
});

export const NO_MIXED_FILENAME_CASING_META = defineMeta("no-mixed-filename-casing", {
  type: "suggestion",
  docs: {
    description: "Flag filenames that mix casing conventions.",
    recommended: true,
  },
  schema: [],
  messages: {
    mixedCasing:
      "Filename \"{{name}}\" mixes casing conventions. Use one: kebab-case, camelCase, PascalCase, or snake_case.",
  },
});
