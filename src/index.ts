import {
  ARRAY_MUTATING_METHODS,
  ARG_COMMAND_FUNCTIONS,
  COMPARISON_OPERATORS,
  CONTROL_FLOW_TYPES,
  DEFAULT_COMPUTED_VALUE_OPERATOR_COMPLEXITY,
  DEFAULT_DIRECT_BIN_ENTRY_PATTERNS,
  DEFAULT_EXECUTABLE_ENTRY_PATTERNS,
  DEFAULT_EXECUTABLE_RUNTIMES,
  DEFAULT_IF_CONDITION_OPERATOR_COMPLEXITY,
  DEFAULT_MAX_ARRAY_CHAIN_DEPTH,
  DEFAULT_MAX_COMPUTED_VALUE_OPERATORS,
  DEFAULT_MAX_CONTROL_FLOW_DEPTH,
  DEFAULT_MAX_EXPRESSION_OPERATORS,
  DEFAULT_MAX_IF_OPERATORS,
  DEFAULT_MAX_TERNARY_OPERATORS,
  DEFAULT_MIN_OBJECT_LOOKUP_CHAIN_LENGTH,
  DEFAULT_READABILITY_OPERATOR_COMPLEXITY,
  EQUALITY_OPERATORS,
  EXPRESSION_CONTAINER_NODE_TYPES,
  FLAT_METHODS,
  FUNCTION_NODE_TYPES,
  HOIST_IF_OPERATORS_META,
  ITERATION_METHODS,
  LOOP_TYPES,
  MAP_METHODS,
  MAX_ARRAY_CHAIN_DEPTH_META,
  MAX_CONTROL_FLOW_DEPTH_META,
  MAX_EXPRESSION_OPERATORS_META,
  MUTATING_METHODS,
  NEGATIVE_CONDITION_NAME_PATTERN,
  NO_COMPLEX_TERNARIES_META,
  NO_COMPUTED_VALUES_META,
  NO_DIRECT_NODE_BIN_SMOKE_META,
  NO_HIDDEN_SIDE_EFFECTS_META,
  NO_IDENTITY_ARRAY_CALLBACK_META,
  NO_QUADRATIC_PATTERNS_META,
  NO_REDUNDANT_BOOLEAN_LOGIC_META,
  NO_REDUNDANT_NULLISH_FALLBACK_META,
  NO_REPEATED_COLLECTION_SEARCH_META,
  NO_SINGLE_USE_RENAMING_ALIAS_META,
  NO_STANDALONE_ARRAY_MUTATIONS_META,
  NO_TRIVIAL_WRAPPER_FUNCTIONS_META,
  NO_UNNECESSARY_BLOCK_CALLBACK_META,
  OBJECT_LOOKUP_OPERATORS,
  PACKAGE_VERSION,
  PLUGIN_NAME,
  PREFER_CONCAT_OBJECT_ASSIGN_META,
  PREFER_EARLY_RETURN_META,
  PREFER_FLAT_MAP_META,
  PREFER_GUARD_CLAUSES_META,
  PREFER_OBJECT_LOOKUP_META,
  PREFER_POSITIVE_CONDITION_NAMES_META,
  RECOMMENDED_RULE_NAMES,
  REQUIRE_EXECUTABLE_SHEBANG_META,
  SEARCH_METHODS,
  SIDE_EFFECT_FREE_ITERATION_METHODS,
  SHELL_COMMAND_FUNCTIONS,
  SKIP_KEYS,
  TERMINAL_STATEMENT_TYPES,
} from "./constants";
import type { LegibilityPlugin } from "./types";

function defineRule(meta, create) {
  return { meta, create };
}

function isRecord(value) {
  return !!value && typeof value === "object";
}

function isFunctionBoundary(node, root) {
  if (node === root) return false;
  return FUNCTION_NODE_TYPES.has(String(node.type));
}

function isFunctionNode(node) {
  if (!isRecord(node)) return false;
  return FUNCTION_NODE_TYPES.has(String(node.type));
}

function isJsxNode(node) {
  if (!isRecord(node)) return false;
  return String(node.type).startsWith("JSX");
}

function isExpressionContainer(node) {
  if (!isRecord(node)) return false;
  return EXPRESSION_CONTAINER_NODE_TYPES.has(String(node.type));
}

function isSkippedExpressionRoot(expression) {
  return isFunctionNode(expression) || isExpressionContainer(expression) || isJsxNode(expression);
}

function getOperatorToken(node) {
  if (!isRecord(node)) return null;
  if (node.type === "ConditionalExpression") return "?:";
  if (typeof node.operator === "string") return node.operator;
  return null;
}

function getOperatorWeight(node, complexity) {
  const token = getOperatorToken(node);
  if (!token) return 0;
  const weight = complexity[token];
  return typeof weight === "number" ? weight : 0;
}

function countChildOperators(child, root, complexity) {
  if (Array.isArray(child)) {
    return child.reduce((sum, item) => sum + countChildOperators(item, root, complexity), 0);
  }
  if (!isRecord(child)) return 0;
  return countOperatorNode(child, root, complexity);
}

function countOperatorNode(node, root, complexity) {
  if (isFunctionBoundary(node, root)) return 0;
  const isNestedContainer = node !== root && (isExpressionContainer(node) || isJsxNode(node));
  if (isNestedContainer) return 0;
  const childCount = Object.entries(node).reduce((sum, [key, child]) => {
    if (SKIP_KEYS.has(key)) return sum;
    return sum + countChildOperators(child, root, complexity);
  }, 0);
  return getOperatorWeight(node, complexity) + childCount;
}

function countExpressionOperators(expression, complexity) {
  if (!isRecord(expression)) return 0;
  if (isSkippedExpressionRoot(expression)) return 0;
  return countOperatorNode(expression, expression, complexity);
}

function countIfConditionOperators(expression, complexity) {
  if (!isRecord(expression)) return 0;
  return countOperatorNode(expression, expression, complexity);
}

function countComputedValueOperators(expression, complexity) {
  if (!isRecord(expression)) return 0;
  if (isFunctionNode(expression)) return 0;
  if (isJsxNode(expression)) return 0;
  return countOperatorNode(expression, expression, complexity);
}

function unwrapChainExpression(node) {
  if (!isRecord(node)) return node;
  if (node.type !== "ChainExpression") return node;
  return node.expression;
}

function getCallMemberExpression(node) {
  if (!isRecord(node)) return null;
  const call = unwrapChainExpression(node);
  if (!isRecord(call)) return null;
  if (call.type !== "CallExpression") return null;
  const callee = unwrapChainExpression(call.callee);
  if (!isRecord(callee)) return null;
  if (callee.type !== "MemberExpression") return null;
  return callee;
}

function getStaticPropertyName(member) {
  if (!isRecord(member)) return null;
  const property = unwrapChainExpression(member.property);
  if (!isRecord(property)) return null;
  if (member.computed === true) {
    if (property.type !== "Literal") return null;
    const value = property.value;
    if (typeof value !== "string" && typeof value !== "number") return null;
    return String(value);
  }
  if (property.type === "Identifier") return property.name ?? null;
  return null;
}

function isMethodCall(node, methodSet) {
  const member = getCallMemberExpression(node);
  const methodName = getStaticPropertyName(member);
  if (!methodName) return false;
  return methodSet.has(methodName);
}

function containsCallWithin(node, methodSet, root) {
  if (isFunctionBoundary(node, root)) return false;
  if (isMethodCall(node, methodSet)) return true;
  return Object.entries(node).some(([key, child]) => {
    if (SKIP_KEYS.has(key)) return false;
    return childContainsCall(child, methodSet, root);
  });
}

function childContainsCall(child, methodSet, root) {
  if (Array.isArray(child)) {
    const childNodes = child.filter(isRecord);
    return childNodes.some((item) => containsCallWithin(item, methodSet, root));
  }
  if (!isRecord(child)) return false;
  return containsCallWithin(child, methodSet, root);
}

function containsCallTo(node, methodSet) {
  if (!isRecord(node)) return false;
  return containsCallWithin(node, methodSet, node);
}

function getMethodName(node) {
  const member = getCallMemberExpression(node);
  return getStaticPropertyName(member);
}

function getCallbackBody(node) {
  const call = unwrapChainExpression(node);
  const callback = call.arguments?.[0];
  if (!callback) return null;
  const isArrow = callback.type === "ArrowFunctionExpression";
  const isFunction = callback.type === "FunctionExpression";
  const isSupportedCallback = isArrow || isFunction;
  if (!isSupportedCallback) return null;
  return callback.body ?? null;
}

function getNodeText(context, node) {
  if (!isRecord(node)) return "";
  if (typeof node.__text === "string") return node.__text;
  const sourceCode = getSourceCode(context);
  if (!sourceCode || typeof sourceCode.getText !== "function") return "";
  try {
    return sourceCode.getText(node);
  } catch {
    return "";
  }
}

function getFunctionName(node) {
  if (!isRecord(node)) return "Function";
  if (node.type === "FunctionDeclaration" && isRecord(node.id)) return node.id.name ?? "Function";
  const parent = node.parent;
  if (!isRecord(parent)) return "Function";
  if (parent.type === "VariableDeclarator" && isRecord(parent.id)) return parent.id.name ?? "Function";
  if (parent.type === "Property" && isRecord(parent.key)) {
    if (parent.key.type === "Identifier") return parent.key.name ?? "Function";
    if (parent.key.type === "Literal") return String(parent.key.value ?? "Function");
  }
  return "Function";
}

function getSingleReturnExpression(body) {
  if (!isRecord(body)) return null;
  if (body.type !== "BlockStatement") return body;
  const statements = body.body ?? [];
  if (statements.length !== 1) return null;
  const statement = statements[0];
  if (!isRecord(statement) || statement.type !== "ReturnStatement") return null;
  return statement.argument ?? null;
}

function getCallbackFunction(node) {
  const call = unwrapChainExpression(node);
  const callback = call.arguments?.[0];
  if (!isFunctionNode(callback)) return null;
  return callback;
}

function getFunctionParamNames(node) {
  if (!isFunctionNode(node)) return [];
  const params = node.params ?? [];
  if (!Array.isArray(params)) return [];
  if (!params.every((param) => isRecord(param) && param.type === "Identifier")) return [];
  return params.map((param) => param.name);
}

function isBooleanLiteral(node, value = undefined) {
  if (!isRecord(node)) return false;
  if (node.type !== "Literal") return false;
  if (typeof value === "boolean") return node.value === value;
  return typeof node.value === "boolean";
}

function isUndefinedExpression(node) {
  if (!isRecord(node)) return false;
  if (node.type === "Identifier" && node.name === "undefined") return true;
  if (node.type !== "UnaryExpression") return false;
  return node.operator === "void" && isRecord(node.argument);
}

function isLiteralLookupValue(node) {
  if (!isRecord(node) || node.type !== "Literal") return false;
  const value = node.value;
  return typeof value === "string" || typeof value === "number";
}

function isSameIdentifierSequence(args, paramNames) {
  if (!Array.isArray(args)) return false;
  if (args.length !== paramNames.length) return false;
  return args.every(
    (arg, index) => isRecord(arg) && arg.type === "Identifier" && arg.name === paramNames[index],
  );
}

function getConfiguredNumber(context, key, fallback) {
  const options = context.options ?? [];
  const value = options[0];
  if (!isRecord(value)) return fallback;
  if (typeof value[key] !== "number") return fallback;
  return value[key];
}

function getConfiguredMax(context, fallback) {
  return getConfiguredNumber(context, "max", fallback);
}

function getConfiguredStringArray(context, key, fallback) {
  const options = context.options ?? [];
  const value = options[0];
  if (!isRecord(value)) return fallback;
  const configured = value[key];
  if (!Array.isArray(configured)) return fallback;
  return configured.filter((item) => typeof item === "string");
}

function getConfiguredStringSet(context, key, fallback) {
  return new Set(getConfiguredStringArray(context, key, Array.from(fallback)));
}

function isNonnegativeNumber(value): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function getConfiguredOperatorComplexity(context, fallback) {
  const options = context.options ?? [];
  const value = options[0];
  if (!isRecord(value)) return fallback;

  const fallbackComplexity = fallback as Record<string, number>;
  const complexity = (isRecord(value.complexity) ? value.complexity : {}) as Record<
    string,
    unknown
  >;
  const hasOperatorsOption = Array.isArray(value.operators);
  const configuredOperators: string[] = hasOperatorsOption
    ? value.operators.filter((operator): operator is string => typeof operator === "string")
    : [];
  const operatorNames = new Set<string>(
    hasOperatorsOption ? configuredOperators : Object.keys(fallbackComplexity),
  );
  if (!hasOperatorsOption) {
    Object.keys(complexity).forEach((operator) => {
      operatorNames.add(operator);
    });
  }

  const configured: Record<string, number> = {};
  for (const operator of operatorNames) {
    const configuredWeight = complexity[operator];
    const fallbackWeight = fallbackComplexity[operator] ?? 1;
    const weight = isNonnegativeNumber(configuredWeight) ? configuredWeight : fallbackWeight;
    if (weight > 0) configured[operator] = weight;
  }
  return configured;
}

function normalizePath(path) {
  return String(path).replace(/\\/g, "/").replace(/^\.\//, "");
}

function getContextFilename(context) {
  if (typeof context.filename === "string") return context.filename;
  if (typeof context.getFilename !== "function") return "";
  try {
    return context.getFilename();
  } catch {
    return "";
  }
}

function getContextCwd(context) {
  if (typeof context.cwd === "string") return context.cwd;
  if (typeof context.getCwd !== "function") return "";
  try {
    return context.getCwd();
  } catch {
    return "";
  }
}

function getRelativeFilename(context) {
  const filename = normalizePath(getContextFilename(context));
  const cwd = normalizePath(getContextCwd(context));
  if (!filename) return "";
  if (!cwd) return filename;
  const prefix = `${cwd}/`;
  return filename.startsWith(prefix) ? filename.slice(prefix.length) : filename;
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function patternToRegex(pattern) {
  const normalized = normalizePath(pattern);
  const source = escapeRegex(normalized)
    .replace(/\\\*\\\*/g, ".*")
    .replace(/\\\*/g, "[^/]*");
  return new RegExp(`(^|/)${source}$`);
}

function matchesPathPattern(path, pattern) {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);
  if (normalizedPattern.includes("*")) return patternToRegex(normalizedPattern).test(normalizedPath);
  const isExactMatch = normalizedPath === normalizedPattern;
  const isNestedMatch = normalizedPath.endsWith(`/${normalizedPattern}`);
  return isExactMatch || isNestedMatch;
}

function matchesAnyPathPattern(path, patterns) {
  return patterns.some((pattern) => matchesPathPattern(path, pattern));
}

function getSourceCode(context) {
  if (isRecord(context.sourceCode)) return context.sourceCode;
  if (typeof context.getSourceCode !== "function") return null;
  try {
    return context.getSourceCode();
  } catch {
    return null;
  }
}

function getSourceText(context) {
  const sourceCode = getSourceCode(context);
  if (!sourceCode) return "";
  if (typeof sourceCode.text === "string") return sourceCode.text;
  if (typeof sourceCode.getText !== "function") return "";
  try {
    return sourceCode.getText();
  } catch {
    return "";
  }
}

function getFirstLine(text) {
  return text.split(/\r?\n/, 1)[0] ?? "";
}

function isRuntimeShebang(line, runtime) {
  if (!line.startsWith("#!")) return false;
  const command = line.slice(2).trim();
  if (command === runtime) return true;
  if (command.startsWith(`${runtime} `)) return true;
  if (command === `/usr/bin/env ${runtime}`) return true;
  if (command.startsWith(`/usr/bin/env ${runtime} `)) return true;
  if (command === `/usr/bin/env -S ${runtime}`) return true;
  return command.startsWith(`/usr/bin/env -S ${runtime} `);
}

function hasAllowedShebang(text, runtimes) {
  const firstLine = getFirstLine(text);
  return runtimes.some((runtime) => isRuntimeShebang(firstLine, runtime));
}

function createRequireExecutableShebang(context) {
  const files = getConfiguredStringArray(context, "files", DEFAULT_EXECUTABLE_ENTRY_PATTERNS);
  const runtimes = getConfiguredStringArray(context, "runtimes", DEFAULT_EXECUTABLE_RUNTIMES);
  return {
    Program(node) {
      const filename = getRelativeFilename(context);
      if (!filename) return;
      if (!matchesAnyPathPattern(filename, files)) return;
      if (hasAllowedShebang(getSourceText(context), runtimes)) return;
      context.report({
        node,
        messageId: "missingShebang",
        data: { file: filename },
      });
    },
  };
}

function getTemplateQuasiValue(quasi) {
  const value = quasi.value;
  if (!isRecord(value)) return "";
  if (typeof value.cooked === "string") return value.cooked;
  if (typeof value.raw === "string") return value.raw;
  return "";
}

function getStringValue(node) {
  if (!isRecord(node)) return null;
  if (node.type === "Literal") {
    if (typeof node.value !== "string") return null;
    return node.value;
  }
  if (node.type !== "TemplateLiteral") return null;
  const expressions = node.expressions ?? [];
  if (expressions.length) return null;
  const quasis = node.quasis ?? [];
  return quasis.map(getTemplateQuasiValue).join("");
}

function getCalleeName(node) {
  const call = unwrapChainExpression(node);
  const callee = unwrapChainExpression(call.callee);
  if (!isRecord(callee)) return null;
  if (callee.type === "Identifier") return callee.name ?? null;
  if (callee.type !== "MemberExpression") return null;
  return getStaticPropertyName(callee);
}

function stripCommandQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function isNodeCommand(value) {
  const isBareNode = value === "node";
  const isPathNode = value.endsWith("/node");
  return isBareNode || isPathNode;
}

function isDirectBinEntry(value, patterns) {
  const unquoted = normalizePath(stripCommandQuotes(value));
  const withoutPrefix = unquoted.replace(/^\.\//, "");
  return matchesAnyPathPattern(withoutPrefix, patterns);
}

function findDirectBinEntry(args, patterns) {
  const unquotedArgs = args.map(stripCommandQuotes);
  return unquotedArgs.find((arg) => {
    if (arg.startsWith("-")) return false;
    return isDirectBinEntry(arg, patterns);
  });
}

function getArrayStringValues(node) {
  if (!isRecord(node)) return [];
  if (node.type !== "ArrayExpression") return [];
  const elements = node.elements ?? [];
  return elements.map(getStringValue).filter((value) => typeof value === "string");
}

function getDirectNodeEntryFromCommand(command, patterns) {
  const parts = command.trim().split(/\s+/).map(stripCommandQuotes);
  const commandName = parts[0] ?? "";
  if (!isNodeCommand(commandName)) return null;
  return findDirectBinEntry(parts.slice(1), patterns) ?? null;
}

function getDirectNodeEntryFromCall(node, patterns) {
  const calleeName = getCalleeName(node);
  const commandFunctionName = calleeName ?? "";
  const args = node.arguments ?? [];
  const firstArg = getStringValue(args[0]);
  if (!firstArg) return null;
  if (SHELL_COMMAND_FUNCTIONS.has(commandFunctionName)) {
    return getDirectNodeEntryFromCommand(firstArg, patterns);
  }
  if (!ARG_COMMAND_FUNCTIONS.has(commandFunctionName)) return null;
  if (!isNodeCommand(firstArg)) return null;
  return findDirectBinEntry(getArrayStringValues(args[1]), patterns) ?? null;
}

function createNoDirectNodeBinSmoke(context) {
  const patterns = getConfiguredStringArray(
    context,
    "entryPatterns",
    DEFAULT_DIRECT_BIN_ENTRY_PATTERNS,
  );
  return {
    CallExpression(node) {
      const entry = getDirectNodeEntryFromCall(node, patterns);
      if (!entry) return;
      context.report({
        node,
        messageId: "directNodeBin",
        data: { entry },
      });
    },
  };
}

function createExpressionCheck(context) {
  const max = getConfiguredMax(context, DEFAULT_MAX_EXPRESSION_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_READABILITY_OPERATOR_COMPLEXITY,
  );
  const checked = new WeakSet();
  return (expression) => {
    if (!isRecord(expression)) return;
    if (isSkippedExpressionRoot(expression)) return;
    if (checked.has(expression)) return;
    checked.add(expression);
    const count = countExpressionOperators(expression, complexity);
    if (count <= max) return;
    context.report({
      node: expression,
      messageId: "tooMany",
      data: { count, max },
    });
  };
}

function createMaxExpressionOperators(context) {
  const checkExpression = createExpressionCheck(context);
  return {
    ArrowFunctionExpression(node) {
      const body = node.body;
      const hasBlockBody = isRecord(body) && body.type === "BlockStatement";
      if (hasBlockBody) return;
      checkExpression(body);
    },
    AssignmentExpression(node) {
      checkExpression(node.right);
    },
    CallExpression(node) {
      const args = node.arguments ?? [];
      args.filter((arg) => !isFunctionNode(arg)).forEach(checkExpression);
    },
    ConditionalExpression(node) {
      checkExpression(node);
    },
    DoWhileStatement(node) {
      checkExpression(node.test);
    },
    ForStatement(node) {
      checkExpression(node.test);
    },
    IfStatement(node) {
      checkExpression(node.test);
    },
    ReturnStatement(node) {
      checkExpression(node.argument);
    },
    VariableDeclarator(node) {
      checkExpression(node.init);
    },
    WhileStatement(node) {
      checkExpression(node.test);
    },
  };
}

function createHoistIfOperators(context) {
  const max = getConfiguredMax(context, DEFAULT_MAX_IF_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_IF_CONDITION_OPERATOR_COMPLEXITY,
  );
  return {
    IfStatement(node) {
      const count = countIfConditionOperators(node.test, complexity);
      if (count <= max) return;
      context.report({
        node: node.test,
        messageId: "tooMany",
        data: { count, max },
      });
    },
  };
}

function isExpressionStatement(node) {
  return isRecord(node) && node.type === "ExpressionStatement";
}

function isForUpdateExpression(node) {
  return isRecord(node) && node.type === "ForStatement" && isRecord(node.update);
}

function getSideEffectParent(node) {
  const parent = node.parent;
  if (!isRecord(parent)) return parent;
  if (parent.type !== "ChainExpression") return parent;
  return parent.parent;
}

function isStandaloneSideEffect(node) {
  const parent = getSideEffectParent(node);
  if (isExpressionStatement(parent)) return true;
  const isForUpdateSideEffect = isForUpdateExpression(parent) && parent.update === node;
  return isForUpdateSideEffect;
}

function isAssignmentSideEffect(node) {
  const isAssignment = node.type === "AssignmentExpression";
  const isUpdate = node.type === "UpdateExpression";
  return isAssignment || isUpdate;
}

function isMutatingMethodCall(node, mutatingMethods) {
  return isMethodCall(node, mutatingMethods);
}

function isArrayMutatingMethodCall(node, arrayMutatingMethods) {
  return isMethodCall(node, arrayMutatingMethods);
}

function getMemberObject(node) {
  const member = getCallMemberExpression(node);
  if (!member) return null;
  return unwrapChainExpression(member.object) ?? null;
}

function isFreshMutationTarget(target) {
  if (!isRecord(target)) return false;
  if (target.type === "ArrayExpression") return true;
  if (target.type === "ObjectExpression") return true;
  return target.type === "CallExpression";
}

function isFreshMutatingMethodCall(node, mutatingMethods) {
  if (!isMutatingMethodCall(node, mutatingMethods)) return false;
  return isFreshMutationTarget(getMemberObject(node));
}

function isSideEffectNode(node, mutatingMethods) {
  if (!isRecord(node)) return false;
  if (isAssignmentSideEffect(node)) return true;
  if (isFreshMutatingMethodCall(node, mutatingMethods)) return false;
  return isMutatingMethodCall(node, mutatingMethods);
}

function childContainsSideEffect(child, root, mutatingMethods) {
  if (Array.isArray(child)) {
    const childNodes = child.filter(isRecord);
    return childNodes.some((item) => containsSideEffect(item, root, mutatingMethods));
  }
  if (!isRecord(child)) return false;
  return containsSideEffect(child, root, mutatingMethods);
}

function containsSideEffect(node, root = node, mutatingMethods = MUTATING_METHODS) {
  if (isFunctionBoundary(node, root)) return false;
  if (isSideEffectNode(node, mutatingMethods)) return true;
  return Object.entries(node).some(([key, child]) => {
    if (SKIP_KEYS.has(key)) return false;
    return childContainsSideEffect(child, root, mutatingMethods);
  });
}

function reportHiddenSideEffect(context, node) {
  if (isStandaloneSideEffect(node)) return;
  context.report({ node, messageId: "hiddenSideEffect" });
}

function checkCallbackSideEffects(context, node, sideEffectFreeIterationMethods, mutatingMethods) {
  if (!isMethodCall(node, sideEffectFreeIterationMethods)) return false;
  const body = getCallbackBody(node);
  if (!isRecord(body)) return false;
  if (!containsSideEffect(body, body, mutatingMethods)) return false;
  context.report({
    node,
    messageId: "callbackSideEffect",
    data: { method: getMethodName(node) ?? "unknown" },
  });
  return true;
}

function createNoHiddenSideEffects(context) {
  const mutatingMethods = getConfiguredStringSet(context, "mutatingMethods", MUTATING_METHODS);
  const sideEffectFreeIterationMethods = getConfiguredStringSet(
    context,
    "sideEffectFreeIterationMethods",
    SIDE_EFFECT_FREE_ITERATION_METHODS,
  );
  return {
    AssignmentExpression(node) {
      reportHiddenSideEffect(context, node);
    },
    CallExpression(node) {
      checkCallbackSideEffects(context, node, sideEffectFreeIterationMethods, mutatingMethods);
      if (!isMutatingMethodCall(node, mutatingMethods)) return;
      if (isFreshMutatingMethodCall(node, mutatingMethods)) return;
      reportHiddenSideEffect(context, node);
    },
    UpdateExpression(node) {
      reportHiddenSideEffect(context, node);
    },
  };
}

function createNoStandaloneArrayMutations(context) {
  const arrayMutatingMethods = getConfiguredStringSet(
    context,
    "arrayMutatingMethods",
    ARRAY_MUTATING_METHODS,
  );
  const mutatingMethods = getConfiguredStringSet(context, "mutatingMethods", MUTATING_METHODS);
  return {
    CallExpression(node) {
      if (!isArrayMutatingMethodCall(node, arrayMutatingMethods)) return;
      if (isFreshMutatingMethodCall(node, mutatingMethods)) return;
      if (!isStandaloneSideEffect(node)) return;
      context.report({
        node,
        messageId: "standaloneArrayMutation",
        data: { method: getMethodName(node) ?? "unknown" },
      });
    },
  };
}

function reportComputedValue(context, node, messageId, max, complexity) {
  if (!isRecord(node)) return;
  const count = countComputedValueOperators(node, complexity);
  if (count <= max) return;
  context.report({ node, messageId, data: { count, max } });
}

function isComputedReturnSkipped(argument) {
  if (!isRecord(argument)) return true;
  if (argument.type === "ObjectExpression") return true;
  if (isFunctionNode(argument)) return true;
  return isJsxNode(argument);
}

function createNoComputedValues(context) {
  const max = getConfiguredMax(context, DEFAULT_MAX_COMPUTED_VALUE_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_COMPUTED_VALUE_OPERATOR_COMPLEXITY,
  );
  return {
    Property(node) {
      const value = node.value;
      if (!isRecord(value)) return;
      if (isFunctionNode(value)) return;
      if (isJsxNode(value)) return;
      reportComputedValue(context, value, "computedObjectValue", max, complexity);
    },
    ReturnStatement(node) {
      const argument = node.argument;
      if (isComputedReturnSkipped(argument)) return;
      reportComputedValue(context, argument, "computedReturn", max, complexity);
    },
  };
}

function reportSpreadElements(context, nodes, messageId) {
  nodes
    .filter((node) => isRecord(node) && node.type === "SpreadElement")
    .forEach((node) => {
      context.report({ node, messageId });
    });
}

function createPreferConcatObjectAssign(context) {
  return {
    ArrayExpression(node) {
      reportSpreadElements(context, node.elements ?? [], "arraySpread");
    },
    ObjectExpression(node) {
      reportSpreadElements(context, node.properties ?? [], "objectSpread");
    },
  };
}

function childContainsTernary(child) {
  if (Array.isArray(child)) {
    const childNodes = child.filter(isRecord);
    return childNodes.some(containsTernary);
  }
  if (!isRecord(child)) return false;
  return containsTernary(child);
}

function containsTernary(node) {
  if (node.type === "ConditionalExpression") return true;
  return Object.entries(node).some(([key, child]) => {
    if (SKIP_KEYS.has(key)) return false;
    return childContainsTernary(child);
  });
}

function hasNestedTernary(node) {
  return [node.test, node.consequent, node.alternate].some(childContainsTernary);
}

function createNoComplexTernaries(context) {
  const max = getConfiguredMax(context, DEFAULT_MAX_TERNARY_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_READABILITY_OPERATOR_COMPLEXITY,
  );
  return {
    ConditionalExpression(node) {
      if (hasNestedTernary(node)) {
        context.report({ node, messageId: "nested" });
        return;
      }

      const count = countExpressionOperators(node, complexity);
      if (count <= max) return;
      context.report({
        node,
        messageId: "tooMany",
        data: { count, max },
      });
    },
  };
}

function enterLoop(loopStack, context, node) {
  if (loopStack.some((loop) => isNodeInsideLoopBody(node, loop))) {
    context.report({ node, messageId: "nestedLoop" });
  }
  return loopStack.concat(node);
}

function isAncestorOrSelf(ancestor, node) {
  let current = node;
  while (isRecord(current)) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function getLoopBody(loopNode) {
  if (!isRecord(loopNode)) return null;
  return isRecord(loopNode.body) ? loopNode.body : null;
}

function isNodeInsideLoopBody(node, loopNode) {
  const body = getLoopBody(loopNode);
  return Boolean(body && isAncestorOrSelf(body, node));
}

function checkSearchInLoop(loopStack, context, node, searchMethods) {
  if (!loopStack.some((loop) => isNodeInsideLoopBody(node, loop))) return;
  if (!isMethodCall(node, searchMethods)) return;
  context.report({
    node,
    messageId: "searchInLoop",
    data: { method: getMethodName(node) ?? "unknown" },
  });
}

function checkNestedIteration(context, node, iterationMethods) {
  if (!isMethodCall(node, iterationMethods)) return false;
  const body = getCallbackBody(node);
  if (!body) return false;
  if (!containsCallTo(body, iterationMethods)) return false;

  const innerMatch = Array.from(iterationMethods).find((method) =>
    containsCallTo(body, new Set([method])),
  );
  if (!innerMatch) return false;
  context.report({
    node,
    messageId: "nestedIteration",
    data: { outer: getMethodName(node) ?? "unknown", inner: innerMatch },
  });
  return true;
}

function createLoopVisitors(context, getLoopStack, setLoopStack) {
  return Object.fromEntries(
    Array.from(LOOP_TYPES).flatMap((type) => [
      [
        type,
        (node) => {
          setLoopStack(enterLoop(getLoopStack(), context, node));
        },
      ],
      [
        `${type}:exit`,
        () => {
          setLoopStack(getLoopStack().slice(0, -1));
        },
      ],
    ]),
  );
}

function createNoQuadraticPatterns(context) {
  const iterationMethods = getConfiguredStringSet(context, "iterationMethods", ITERATION_METHODS);
  const searchMethods = getConfiguredStringSet(context, "searchMethods", SEARCH_METHODS);
  let loopStack = [];
  const loopVisitors = createLoopVisitors(
    context,
    () => loopStack,
    (nextLoopStack) => {
      loopStack = nextLoopStack;
    },
  );

  return Object.assign({}, loopVisitors, {
    CallExpression(node) {
      if (checkNestedIteration(context, node, iterationMethods)) return;
      checkSearchInLoop(loopStack, context, node, searchMethods);
    },
  });
}

function isElseIf(node) {
  const parent = node.parent;
  return isRecord(parent) && parent.type === "IfStatement" && parent.alternate === node;
}

function createControlFlowVisitors(context) {
  const max = getConfiguredMax(context, DEFAULT_MAX_CONTROL_FLOW_DEPTH);
  let depth = 0;
  const stack = [];
  const functionStack = [];

  const controlVisitors = Object.fromEntries(
    Array.from(CONTROL_FLOW_TYPES).flatMap((type) => [
      [
        type,
        (node) => {
          stack.push(depth);
          const nextDepth = type === "IfStatement" && isElseIf(node) ? depth : depth + 1;
          depth = nextDepth;
          if (depth <= max) return;
          context.report({
            node,
            messageId: "tooDeep",
            data: { depth, max },
          });
        },
      ],
      [
        `${type}:exit`,
        () => {
          depth = stack.pop() ?? 0;
        },
      ],
    ]),
  );
  const functionVisitors = Object.fromEntries(
    Array.from(FUNCTION_NODE_TYPES).flatMap((type) => [
      [
        type,
        () => {
          functionStack.push({ depth, stackLength: stack.length });
          depth = 0;
        },
      ],
      [
        `${type}:exit`,
        () => {
          const previous = functionStack.pop();
          depth = previous?.depth ?? 0;
          stack.length = previous?.stackLength ?? 0;
        },
      ],
    ]),
  );
  return Object.assign({}, controlVisitors, functionVisitors);
}

function createMaxControlFlowDepth(context) {
  return createControlFlowVisitors(context);
}

function getLastStatement(block) {
  if (!isRecord(block)) return null;
  if (block.type !== "BlockStatement") return block;
  const body = block.body ?? [];
  return body.length ? body[body.length - 1] : null;
}

function alwaysExits(node) {
  if (!isRecord(node)) return false;
  const lastStatement = getLastStatement(node);
  if (!isRecord(lastStatement)) return false;
  if (TERMINAL_STATEMENT_TYPES.has(String(lastStatement.type))) return true;
  if (lastStatement.type !== "IfStatement") return false;
  if (!lastStatement.alternate) return false;
  return alwaysExits(lastStatement.consequent) && alwaysExits(lastStatement.alternate);
}

function createPreferEarlyReturn(context) {
  return {
    IfStatement(node) {
      if (!node.alternate) return;
      if (!alwaysExits(node.consequent)) return;
      context.report({
        node: node.alternate,
        messageId: "avoidElse",
      });
    },
  };
}

function isParentArrayChainCall(node, iterationMethods) {
  const parent = node.parent;
  if (!isRecord(parent) || parent.type !== "MemberExpression") return false;
  if (unwrapChainExpression(parent.object) !== node) return false;
  const grandparent = parent.parent;
  if (!isRecord(grandparent)) return false;
  return isMethodCall(grandparent, iterationMethods);
}

function getChainedArrayMethods(node, iterationMethods) {
  const methods = [];
  let current = unwrapChainExpression(node);

  while (isRecord(current) && isMethodCall(current, iterationMethods)) {
    const method = getMethodName(current);
    if (!method) break;
    methods.unshift(method);
    current = getMemberObject(current);
  }

  return methods;
}

function createMaxArrayChainDepth(context) {
  const max = getConfiguredMax(context, DEFAULT_MAX_ARRAY_CHAIN_DEPTH);
  const iterationMethods = getConfiguredStringSet(context, "iterationMethods", ITERATION_METHODS);
  return {
    CallExpression(node) {
      if (isParentArrayChainCall(node, iterationMethods)) return;
      const methods = getChainedArrayMethods(node, iterationMethods);
      if (methods.length <= max) return;
      context.report({
        node,
        messageId: "tooMany",
        data: { count: methods.length, max, chain: methods.join(".") },
      });
    },
  };
}

function getStableObjectKey(node) {
  const value = unwrapChainExpression(node);
  if (!isRecord(value)) return null;
  if (value.type === "Identifier") return value.name ?? null;
  if (value.type === "ThisExpression") return "this";
  if (value.type !== "MemberExpression") return null;

  const objectKey = getStableObjectKey(value.object);
  const propertyName = getStaticPropertyName(value);
  if (!objectKey || !propertyName) return null;
  return `${objectKey}.${propertyName}`;
}

function createScopeVisitors(onEnter, onExit) {
  const scopeTypes = ["Program"].concat(Array.from(FUNCTION_NODE_TYPES));
  return Object.fromEntries(
    scopeTypes.flatMap((type) => [
      [type, onEnter],
      [`${type}:exit`, onExit],
    ]),
  );
}

function createNoRepeatedCollectionSearch(context) {
  const searchMethods = getConfiguredStringSet(context, "searchMethods", SEARCH_METHODS);
  const scopes = [];
  const enterScope = () => {
    scopes.push(new Map());
  };
  const exitScope = () => {
    scopes.pop();
  };

  return Object.assign({}, createScopeVisitors(enterScope, exitScope), {
    CallExpression(node) {
      if (!isMethodCall(node, searchMethods)) return;
      const collection = getStableObjectKey(getMemberObject(node));
      const method = getMethodName(node);
      if (!collection || !method) return;
      const scope = scopes[scopes.length - 1];
      if (!scope) return;
      const key = `${collection}.${method}`;
      if (!scope.has(key)) {
        scope.set(key, node);
        return;
      }
      context.report({
        node,
        messageId: "repeatedSearch",
        data: { collection, method },
      });
    },
  });
}

function createNoRedundantBooleanLogic(context) {
  const equalityOperators = getConfiguredStringSet(context, "equalityOperators", EQUALITY_OPERATORS);
  return {
    BinaryExpression(node) {
      if (!equalityOperators.has(String(node.operator))) return;
      const leftBoolean = isBooleanLiteral(node.left);
      const rightBoolean = isBooleanLiteral(node.right);
      if (!leftBoolean && !rightBoolean) return;
      const booleanNode = leftBoolean ? node.left : node.right;
      context.report({
        node,
        messageId: "booleanComparison",
        data: { value: String(booleanNode.value) },
      });
    },
    ConditionalExpression(node) {
      const consequentIsBoolean = isBooleanLiteral(node.consequent);
      const alternateIsBoolean = isBooleanLiteral(node.alternate);
      if (!consequentIsBoolean || !alternateIsBoolean) return;
      if (node.consequent.value === node.alternate.value) return;
      context.report({ node, messageId: "booleanTernary" });
    },
  };
}

function isCallbackArgument(node) {
  const parent = node.parent;
  if (!isRecord(parent) || parent.type !== "CallExpression") return false;
  const args = parent.arguments ?? [];
  return Array.isArray(args) && args.includes(node);
}

function getCalleeDisplayName(context, node) {
  const call = unwrapChainExpression(node);
  if (!isRecord(call) || call.type !== "CallExpression") return "the target";
  const callee = unwrapChainExpression(call.callee);
  if (!isRecord(callee)) return "the target";
  if (callee.type === "Identifier") return callee.name ?? "the target";
  const text = getNodeText(context, callee);
  if (text) return text;
  return getMethodName(call) ?? "the target";
}

function checkTrivialWrapperFunction(context, node) {
  if (isCallbackArgument(node)) return;
  if (node.async || node.generator) return;
  const paramNames = getFunctionParamNames(node);
  if (!paramNames.length && (node.params ?? []).length) return;
  const returned = getSingleReturnExpression(node.body);
  if (!isRecord(returned) || returned.type !== "CallExpression") return;
  const args = returned.arguments ?? [];
  if (!isSameIdentifierSequence(args, paramNames)) return;
  const name = getFunctionName(node);
  const target = getCalleeDisplayName(context, returned);
  if (name === target) return;
  context.report({
    node,
    messageId: "trivialWrapper",
    data: { name, target },
  });
}

function createNoTrivialWrapperFunctions(context) {
  return {
    ArrowFunctionExpression(node) {
      checkTrivialWrapperFunction(context, node);
    },
    FunctionDeclaration(node) {
      checkTrivialWrapperFunction(context, node);
    },
    FunctionExpression(node) {
      checkTrivialWrapperFunction(context, node);
    },
  };
}

function isNegativeConditionName(name) {
  if (typeof name !== "string") return false;
  if (NEGATIVE_CONDITION_NAME_PATTERN.test(name)) return true;
  return /^no[A-Z]/.test(name);
}

function childContainsNode(child, predicate, root) {
  if (Array.isArray(child)) return child.some((item) => childContainsNode(item, predicate, root));
  if (!isRecord(child)) return false;
  return containsNode(child, predicate, root);
}

function containsNode(node, predicate, root = node) {
  if (isFunctionBoundary(node, root)) return false;
  if (predicate(node)) return true;
  return Object.entries(node).some(([key, child]) => {
    if (SKIP_KEYS.has(key)) return false;
    return childContainsNode(child, predicate, root);
  });
}

function reportNegativeConditionNames(context, root) {
  const reported = new Set();
  containsNode(root, (node) => {
    if (node.type !== "Identifier") return false;
    if (!isNegativeConditionName(node.name)) return false;
    if (reported.has(node.name)) return false;
    reported.add(node.name);
    context.report({
      node,
      messageId: "negativeName",
      data: { name: node.name },
    });
    return false;
  });
}

function isBooleanishInit(node, booleanOperators) {
  if (!isRecord(node)) return false;
  if (isBooleanLiteral(node)) return true;
  if (node.type === "UnaryExpression" && node.operator === "!") return true;
  if (node.type === "LogicalExpression") return true;
  if (node.type === "BinaryExpression") return booleanOperators.has(String(node.operator));
  if (node.type === "CallExpression") return true;
  return node.type === "ConditionalExpression";
}

function createPreferPositiveConditionNames(context) {
  const booleanOperators = getConfiguredStringSet(context, "booleanOperators", COMPARISON_OPERATORS);
  return {
    DoWhileStatement(node) {
      reportNegativeConditionNames(context, node.test);
    },
    IfStatement(node) {
      reportNegativeConditionNames(context, node.test);
    },
    VariableDeclarator(node) {
      const idNode = node.id;
      if (!isRecord(idNode) || idNode.type !== "Identifier") return;
      if (!isNegativeConditionName(idNode.name)) return;
      if (!isBooleanishInit(node.init, booleanOperators)) return;
      context.report({
        node: idNode,
        messageId: "negativeName",
        data: { name: idNode.name },
      });
    },
    WhileStatement(node) {
      reportNegativeConditionNames(context, node.test);
    },
  };
}

function isSimpleAliasExpression(node) {
  const value = unwrapChainExpression(node);
  if (!isRecord(value)) return false;
  if (value.type === "Identifier") return true;
  return !!getStableObjectKey(value);
}

function isDeclarationIdentifier(node, parent) {
  if (!isRecord(parent)) return false;
  if (parent.type === "VariableDeclarator" && parent.id === node) return true;
  if (FUNCTION_NODE_TYPES.has(String(parent.type)) && parent.id === node) return true;
  const params = parent.params ?? [];
  if (Array.isArray(params) && params.includes(node)) return true;
  return false;
}

function isReferenceIdentifier(node) {
  const parent = node.parent;
  if (isDeclarationIdentifier(node, parent)) return false;
  if (!isRecord(parent)) return true;
  if (parent.type === "MemberExpression" && parent.property === node && !parent.computed) {
    return false;
  }
  if (parent.type === "Property" && parent.key === node && parent.value !== node && !parent.computed) {
    return false;
  }
  if (parent.type === "MethodDefinition" && parent.key === node && !parent.computed) return false;
  if (parent.type === "LabeledStatement" && parent.label === node) return false;
  if (parent.type === "BreakStatement" && parent.label === node) return false;
  if (parent.type === "ContinueStatement" && parent.label === node) return false;
  return true;
}

function createNoSingleUseRenamingAlias(context) {
  const scopes = [];
  const enterScope = () => {
    scopes.push(new Map());
  };
  const exitScope = () => {
    const scope = scopes.pop();
    if (!scope) return;
    for (const candidate of scope.values()) {
      if (candidate.references !== 1) continue;
      context.report({
        node: candidate.node,
        messageId: "singleUseAlias",
        data: { name: candidate.name, target: candidate.target },
      });
    }
  };

  return Object.assign({}, createScopeVisitors(enterScope, exitScope), {
    Identifier(node) {
      if (!isReferenceIdentifier(node)) return;
      for (let index = scopes.length - 1; index >= 0; index -= 1) {
        const candidate = scopes[index].get(node.name);
        if (!candidate) continue;
        candidate.references += 1;
        return;
      }
    },
    VariableDeclarator(node) {
      const idNode = node.id;
      if (!isRecord(idNode) || idNode.type !== "Identifier") return;
      if (!isSimpleAliasExpression(node.init)) return;
      const scope = scopes[scopes.length - 1];
      if (!scope) return;
      const target = getNodeText(context, node.init) || getStableObjectKey(node.init) || "value";
      if (target === idNode.name) return;
      scope.set(idNode.name, {
        name: idNode.name,
        node,
        references: 0,
        target,
      });
    },
  });
}

function checkFunctionForGuardClause(context, node) {
  const body = node.body;
  if (!isRecord(body) || body.type !== "BlockStatement") return;
  const statements = body.body ?? [];
  if (statements.length !== 1) return;
  const onlyStatement = statements[0];
  if (!isRecord(onlyStatement) || onlyStatement.type !== "IfStatement") return;
  if (onlyStatement.alternate) return;
  const consequent = onlyStatement.consequent;
  if (!isRecord(consequent) || consequent.type !== "BlockStatement") return;
  if ((consequent.body ?? []).length < 2) return;
  if (alwaysExits(consequent)) return;
  context.report({ node: onlyStatement, messageId: "preferGuard" });
}

function createPreferGuardClauses(context) {
  return {
    ArrowFunctionExpression(node) {
      checkFunctionForGuardClause(context, node);
    },
    FunctionDeclaration(node) {
      checkFunctionForGuardClause(context, node);
    },
    FunctionExpression(node) {
      checkFunctionForGuardClause(context, node);
    },
  };
}

function createNoUnnecessaryBlockCallback(context) {
  return {
    ArrowFunctionExpression(node) {
      if (!isCallbackArgument(node)) return;
      if (!isRecord(node.body) || node.body.type !== "BlockStatement") return;
      const statements = node.body.body ?? [];
      if (statements.length !== 1) return;
      const statement = statements[0];
      if (!isRecord(statement) || statement.type !== "ReturnStatement") return;
      context.report({ node: node.body, messageId: "unnecessaryBlock" });
    },
  };
}

function isFlatOneCall(node) {
  if (!isMethodCall(node, FLAT_METHODS)) return false;
  const args = node.arguments ?? [];
  if (!args.length) return true;
  const [depth] = args;
  return isRecord(depth) && depth.type === "Literal" && depth.value === 1;
}

function createPreferFlatMap(context) {
  return {
    CallExpression(node) {
      if (!isFlatOneCall(node)) return;
      const receiver = getMemberObject(node);
      if (!isMethodCall(receiver, MAP_METHODS)) return;
      context.report({ node, messageId: "preferFlatMap" });
    },
  };
}

function createNoIdentityArrayCallback(context) {
  return {
    CallExpression(node) {
      const method = getMethodName(node);
      if (method !== "map" && method !== "filter") return;
      const callback = getCallbackFunction(node);
      if (!callback) return;
      const returned = getSingleReturnExpression(callback.body);
      if (!isRecord(returned)) return;
      if (method === "filter" && isBooleanLiteral(returned, true)) {
        context.report({ node, messageId: "alwaysTrueFilter" });
        return;
      }
      const [firstParam] = getFunctionParamNames(callback);
      if (!firstParam) return;
      if (method !== "map") return;
      if (returned.type !== "Identifier" || returned.name !== firstParam) return;
      context.report({ node, messageId: "identityMap" });
    },
  };
}

function createNoRedundantNullishFallback(context) {
  return {
    LogicalExpression(node) {
      if (node.operator !== "??") return;
      if (!isUndefinedExpression(node.right)) return;
      context.report({ node, messageId: "redundantUndefined" });
    },
  };
}

function getEqualityLookupPart(node, operators) {
  if (!isRecord(node) || node.type !== "BinaryExpression") return null;
  if (!operators.has(String(node.operator))) return null;

  const leftKey = getStableObjectKey(node.left);
  const rightKey = getStableObjectKey(node.right);
  if (leftKey && isLiteralLookupValue(node.right)) {
    return { key: leftKey, node };
  }
  if (rightKey && isLiteralLookupValue(node.left)) {
    return { key: rightKey, node };
  }
  return null;
}

function collectEqualityLookupParts(node, operators) {
  if (!isRecord(node)) return [];
  if (node.type === "LogicalExpression" && node.operator === "||") {
    return collectEqualityLookupParts(node.left, operators).concat(
      collectEqualityLookupParts(node.right, operators),
    );
  }
  const part = getEqualityLookupPart(node, operators);
  return part ? [part] : [];
}

function createPreferObjectLookup(context) {
  const min = getConfiguredNumber(context, "min", DEFAULT_MIN_OBJECT_LOOKUP_CHAIN_LENGTH);
  const operators = getConfiguredStringSet(context, "operators", OBJECT_LOOKUP_OPERATORS);
  return {
    LogicalExpression(node) {
      if (node.operator !== "||") return;
      const parent = node.parent;
      if (isRecord(parent) && parent.type === "LogicalExpression" && parent.operator === "||") {
        return;
      }
      const parts = collectEqualityLookupParts(node, operators);
      if (parts.length < min) return;
      const [firstPart] = parts;
      if (!parts.every((part) => part.key === firstPart.key)) return;
      context.report({
        node,
        messageId: "preferLookup",
        data: { name: firstPart.key },
      });
    },
  };
}

const rules = {
  "hoist-if-operators": defineRule(HOIST_IF_OPERATORS_META, createHoistIfOperators),
  "max-array-chain-depth": defineRule(MAX_ARRAY_CHAIN_DEPTH_META, createMaxArrayChainDepth),
  "max-control-flow-depth": defineRule(MAX_CONTROL_FLOW_DEPTH_META, createMaxControlFlowDepth),
  "max-expression-operators": defineRule(
    MAX_EXPRESSION_OPERATORS_META,
    createMaxExpressionOperators,
  ),
  "no-complex-ternaries": defineRule(NO_COMPLEX_TERNARIES_META, createNoComplexTernaries),
  "no-computed-values": defineRule(NO_COMPUTED_VALUES_META, createNoComputedValues),
  "no-direct-node-bin-smoke": defineRule(NO_DIRECT_NODE_BIN_SMOKE_META, createNoDirectNodeBinSmoke),
  "no-hidden-side-effects": defineRule(NO_HIDDEN_SIDE_EFFECTS_META, createNoHiddenSideEffects),
  "no-identity-array-callback": defineRule(
    NO_IDENTITY_ARRAY_CALLBACK_META,
    createNoIdentityArrayCallback,
  ),
  "no-quadratic-patterns": defineRule(NO_QUADRATIC_PATTERNS_META, createNoQuadraticPatterns),
  "no-redundant-boolean-logic": defineRule(
    NO_REDUNDANT_BOOLEAN_LOGIC_META,
    createNoRedundantBooleanLogic,
  ),
  "no-redundant-nullish-fallback": defineRule(
    NO_REDUNDANT_NULLISH_FALLBACK_META,
    createNoRedundantNullishFallback,
  ),
  "no-repeated-collection-search": defineRule(
    NO_REPEATED_COLLECTION_SEARCH_META,
    createNoRepeatedCollectionSearch,
  ),
  "no-trivial-wrapper-functions": defineRule(
    NO_TRIVIAL_WRAPPER_FUNCTIONS_META,
    createNoTrivialWrapperFunctions,
  ),
  "no-unnecessary-block-callback": defineRule(
    NO_UNNECESSARY_BLOCK_CALLBACK_META,
    createNoUnnecessaryBlockCallback,
  ),
  "no-single-use-renaming-alias": defineRule(
    NO_SINGLE_USE_RENAMING_ALIAS_META,
    createNoSingleUseRenamingAlias,
  ),
  "no-standalone-array-mutations": defineRule(
    NO_STANDALONE_ARRAY_MUTATIONS_META,
    createNoStandaloneArrayMutations,
  ),
  "prefer-concat-object-assign": defineRule(
    PREFER_CONCAT_OBJECT_ASSIGN_META,
    createPreferConcatObjectAssign,
  ),
  "prefer-early-return": defineRule(PREFER_EARLY_RETURN_META, createPreferEarlyReturn),
  "prefer-flat-map": defineRule(PREFER_FLAT_MAP_META, createPreferFlatMap),
  "prefer-guard-clauses": defineRule(PREFER_GUARD_CLAUSES_META, createPreferGuardClauses),
  "prefer-object-lookup": defineRule(PREFER_OBJECT_LOOKUP_META, createPreferObjectLookup),
  "prefer-positive-condition-names": defineRule(
    PREFER_POSITIVE_CONDITION_NAMES_META,
    createPreferPositiveConditionNames,
  ),
  "require-executable-shebang": defineRule(
    REQUIRE_EXECUTABLE_SHEBANG_META,
    createRequireExecutableShebang,
  ),
};

function buildRuleConfig(ruleNames, level) {
  return Object.fromEntries(ruleNames.map((ruleName) => [`${PLUGIN_NAME}/${ruleName}`, level]));
}

const recommendedRules = buildRuleConfig(RECOMMENDED_RULE_NAMES, "warn");
const strictRules = buildRuleConfig(Object.keys(rules), "error");

const plugin: LegibilityPlugin = {
  meta: {
    name: PLUGIN_NAME,
    version: PACKAGE_VERSION,
  },
  rules,
  configs: {} as LegibilityPlugin["configs"],
};

plugin.configs.recommended = {
  plugins: [PLUGIN_NAME],
  rules: recommendedRules,
};

plugin.configs.strict = {
  plugins: [PLUGIN_NAME],
  rules: strictRules,
};

plugin.configs["flat/recommended"] = {
  plugins: {
    [PLUGIN_NAME]: plugin,
  },
  rules: recommendedRules,
};

plugin.configs["flat/strict"] = {
  plugins: {
    [PLUGIN_NAME]: plugin,
  },
  rules: strictRules,
};

export = plugin;
