import { basename, relative } from "node:path";
import {
  ARRAY_MUTATING_METHODS,
  ARG_COMMAND_FUNCTIONS,
  COMPARISON_OPERATORS,
  CONTROL_FLOW_TYPES,
  DEFAULT_AI_COMMENT_IDENTIFIERS,
  DEFAULT_COMMENT_MATCHERS,
  DEFAULT_COMMENT_PREFIX_IDENTIFIERS,
  DEFAULT_COMMENT_SUFFIX_IDENTIFIERS,
  DEFAULT_COMPUTED_VALUE_OPERATOR_COMPLEXITY,
  DEFAULT_DIRECT_BIN_ENTRY_PATTERNS,
  DEFAULT_EXECUTABLE_ENTRY_PATTERNS,
  DEFAULT_EXECUTABLE_RUNTIMES,
  DEFAULT_IF_CONDITION_OPERATOR_COMPLEXITY,
  DEFAULT_MAX_ARRAY_CHAIN_DEPTH,
  DEFAULT_MAX_COMPUTED_VALUE_OPERATORS,
  DEFAULT_MAX_CONTROL_FLOW_DEPTH,
  DEFAULT_ALLOWED_FILENAME_QUALIFIERS,
  DEFAULT_ALLOWED_STANDALONE_FILENAMES,
  DEFAULT_MAX_EXPRESSION_OPERATORS,
  DEFAULT_MIN_DIRNAME_MATCH_DEPTH,
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
  NO_AUTOMATED_COMMENT_ATTRIBUTION_META,
  NO_COMPLEX_TERNARIES_META,
  NO_COMPUTED_VALUES_META,
  NO_DIRECT_NODE_BIN_SMOKE_META,
  NO_HIDDEN_SIDE_EFFECTS_META,
  NO_IDENTITY_ARRAY_CALLBACK_META,
  NO_QUADRATIC_PATTERNS_META,
  NO_REDUNDANT_BOOLEAN_LOGIC_META,
  NO_REDUNDANT_NULLISH_FALLBACK_META,
  NO_REPEATED_COLLECTION_SEARCH_META,
  NO_MIXED_FILENAME_CASING_META,
  NO_SINGLE_USE_RENAMING_ALIAS_META,
  REQUIRE_FILENAME_MATCHES_DIRNAME_META,
  NO_STANDALONE_ARRAY_MUTATIONS_META,
  NO_TRIVIAL_WRAPPER_FUNCTIONS_META,
  NO_UNMATCHED_COMMENTS_META,
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
  REQUIRE_JSDOC_MULTILINE_COMMENTS_META,
  SEARCH_METHODS,
  SIDE_EFFECT_FREE_ITERATION_METHODS,
  SHELL_COMMAND_FUNCTIONS,
  SKIP_KEYS,
  TERMINAL_STATEMENT_TYPES,
} from "./constants.js";
import type {
  AliasCandidate,
  AliasScope,
  AliasScopeStack,
  AstNode,
  AstValue,
  FunctionDepthFrame,
  LegibilityPlugin,
  LoopStack,
  LookupPart,
  MaybeAstNode,
  NodePredicate,
  NodeScope,
  OperatorComplexity,
  RuleContext,
  RuleCreate,
  RuleLevel,
  RuleListener,
  RuleMeta,
  ScopeCallback,
  ScopeStack,
  SourceCodeLike,
  StringSet,
  TraversableEntry,
} from "./types.js";

function defineRule(meta: RuleMeta, create: RuleCreate): { meta: RuleMeta; create: RuleCreate } {
  return { meta, create };
}

function isRecord(value: unknown): value is AstNode {
  const isObjectRecord = !!value && typeof value === "object";
  return isObjectRecord;
}

function isFunctionBoundary(node: AstNode, root: AstNode): boolean {
  const isRootNode = node === root;
  if (isRootNode) return false;

  const isFunction = FUNCTION_NODE_TYPES.has(String(node.type));
  return isFunction;
}

function isFunctionNode(node: MaybeAstNode): node is AstNode {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isFunction = FUNCTION_NODE_TYPES.has(String(node.type));
  return isFunction;
}

function isJsxNode(node: MaybeAstNode): node is AstNode {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isJsx = String(node.type).startsWith("JSX");
  return isJsx;
}

function isExpressionContainer(node: MaybeAstNode): node is AstNode {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isContainer = EXPRESSION_CONTAINER_NODE_TYPES.has(String(node.type));
  return isContainer;
}

function getTraversableEntries(node: AstNode): TraversableEntry[] {
  const traversableEntries = Object.entries(node).filter(([key]) => !SKIP_KEYS.has(key));
  return traversableEntries;
}

function getNodeArray(value: AstValue): AstNode[] {
  const isArrayValue = Array.isArray(value);
  if (!isArrayValue) return [];

  const nodes = value.filter(isRecord);
  return nodes;
}

function childContainsNode(child: AstValue, predicate: NodePredicate, root: AstNode): boolean {
  const isArrayChild = Array.isArray(child);
  if (isArrayChild) return child.some((item) => childContainsNode(item, predicate, root));

  const isNode = isRecord(child);
  if (!isNode) return false;
  return containsNode(child, predicate, root);
}

function containsNode(node: AstNode, predicate: NodePredicate, root = node): boolean {
  const crossesFunctionBoundary = isFunctionBoundary(node, root);
  if (crossesFunctionBoundary) return false;

  const matchesPredicate = predicate(node);
  if (matchesPredicate) return true;

  const containsMatchingChild = getTraversableEntries(node).some(([, child]) =>
    childContainsNode(child, predicate, root),
  );
  return containsMatchingChild;
}

function isSkippedExpressionRoot(expression: AstNode): boolean {
  const shouldSkipExpression =
    isFunctionNode(expression) || isExpressionContainer(expression) || isJsxNode(expression);
  return shouldSkipExpression;
}

function getOperatorToken(node: MaybeAstNode): string | null {
  const isNode = isRecord(node);
  if (!isNode) return null;

  const isTernary = node.type === "ConditionalExpression";
  if (isTernary) return "?:";

  const operator = node.operator;
  const hasOperator = typeof operator === "string";
  if (hasOperator) return operator;

  return null;
}

function getOperatorWeight(node: AstNode, complexity: OperatorComplexity): number {
  const token = getOperatorToken(node);
  if (token === null) return 0;

  const weight = complexity[token];
  const operatorWeight = typeof weight === "number" ? weight : 0;
  return operatorWeight;
}

function countChildOperators(child: AstValue, root: AstNode, complexity: OperatorComplexity): number {
  const isArrayChild = Array.isArray(child);
  if (isArrayChild) {
    const operatorCount = child.reduce<number>(
      (sum, item) => sum + countChildOperators(item, root, complexity),
      0,
    );
    return operatorCount;
  }

  const isNode = isRecord(child);
  if (!isNode) return 0;
  return countOperatorNode(child, root, complexity);
}

function countOperatorNode(node: AstNode, root: AstNode, complexity: OperatorComplexity): number {
  const crossesFunctionBoundary = isFunctionBoundary(node, root);
  if (crossesFunctionBoundary) return 0;

  const isNestedContainer = node !== root && (isExpressionContainer(node) || isJsxNode(node));
  if (isNestedContainer) return 0;

  const childCount = getTraversableEntries(node).reduce(
    (sum, [, child]) => sum + countChildOperators(child, root, complexity),
    0,
  );
  const operatorCount = getOperatorWeight(node, complexity) + childCount;
  return operatorCount;
}

function countExpressionOperators(
  expression: AstValue,
  complexity: OperatorComplexity,
): number {
  const isExpressionNode = isRecord(expression);
  if (!isExpressionNode) return 0;

  const shouldSkipExpression = isSkippedExpressionRoot(expression);
  if (shouldSkipExpression) return 0;

  const operatorCount = countOperatorNode(expression, expression, complexity);
  return operatorCount;
}

function countIfConditionOperators(
  expression: AstValue,
  complexity: OperatorComplexity,
): number {
  const isExpressionNode = isRecord(expression);
  if (!isExpressionNode) return 0;

  const operatorCount = countOperatorNode(expression, expression, complexity);
  return operatorCount;
}

function countComputedValueOperators(
  expression: AstValue,
  complexity: OperatorComplexity,
): number {
  const isExpressionNode = isRecord(expression);
  if (!isExpressionNode) return 0;

  const isFunctionExpression = isFunctionNode(expression);
  if (isFunctionExpression) return 0;

  const isJsxExpression = isJsxNode(expression);
  if (isJsxExpression) return 0;

  const operatorCount = countOperatorNode(expression, expression, complexity);
  return operatorCount;
}

function unwrapChainExpression(node: MaybeAstNode): MaybeAstNode {
  const isNode = isRecord(node);
  if (!isNode) return node;

  const isChainExpression = node.type === "ChainExpression";
  if (!isChainExpression) return node;

  return node.expression;
}

function getCallMemberExpression(node: MaybeAstNode): AstNode | null {
  const isNode = isRecord(node);
  if (!isNode) return null;

  const call = unwrapChainExpression(node);
  const isCallNode = isRecord(call);
  if (!isCallNode) return null;

  const isCallExpression = call.type === "CallExpression";
  if (!isCallExpression) return null;

  const callee = unwrapChainExpression(call.callee);
  const isCalleeNode = isRecord(callee);
  if (!isCalleeNode) return null;

  const isMemberCallee = callee.type === "MemberExpression";
  if (!isMemberCallee) return null;

  return callee;
}

function getStaticPropertyName(member: MaybeAstNode): string | null {
  const isMemberNode = isRecord(member);
  if (!isMemberNode) return null;

  const property = unwrapChainExpression(member.property);
  const isPropertyNode = isRecord(property);
  if (!isPropertyNode) return null;

  const isComputedMember = Boolean(member.computed);
  if (isComputedMember) {
    const isLiteralProperty = property.type === "Literal";
    if (!isLiteralProperty) return null;

    const value = property.value;
    const isStaticPropertyValue = typeof value === "string" || typeof value === "number";
    if (!isStaticPropertyValue) return null;

    const propertyName = String(value);
    return propertyName;
  }

  const isIdentifierProperty = property.type === "Identifier";
  if (isIdentifierProperty) return property.name ?? null;

  return null;
}

function isMethodCall(node: MaybeAstNode, methodSet: StringSet): boolean {
  const member = getCallMemberExpression(node);
  const methodName = getStaticPropertyName(member);
  if (methodName === null) return false;

  const hasMethod = methodSet.has(methodName);
  return hasMethod;
}

function containsCallTo(node: MaybeAstNode, methodSet: StringSet): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const containsCall = containsNode(node, (child) => isMethodCall(child, methodSet));
  return containsCall;
}

function getMethodName(node: MaybeAstNode): string | null {
  const member = getCallMemberExpression(node);
  const methodName = getStaticPropertyName(member);
  return methodName;
}

function getCallbackBody(node: MaybeAstNode): AstNode | null {
  const call = unwrapChainExpression(node);
  const isCallNode = isRecord(call);
  if (!isCallNode) return null;

  const callback = call.arguments?.[0];
  const hasCallback = Boolean(callback);
  if (!hasCallback) return null;

  const isCallbackNode = isRecord(callback);
  if (!isCallbackNode) return null;

  const isArrow = callback.type === "ArrowFunctionExpression";
  const isFunction = callback.type === "FunctionExpression";
  const isSupportedCallback = isArrow || isFunction;
  if (!isSupportedCallback) return null;

  const callbackBody = callback.body ?? null;
  return isRecord(callbackBody) ? callbackBody : null;
}

function getNodeText(context: RuleContext, node: MaybeAstNode): string {
  const isNode = isRecord(node);
  if (!isNode) return "";

  const inlineText = node.__text;
  const hasInlineText = typeof inlineText === "string";
  if (hasInlineText) return inlineText;

  const sourceCode = getSourceCode(context);
  const getText = sourceCode?.getText;
  const canReadSourceText = typeof getText === "function";
  if (!canReadSourceText) return "";

  try {
    const nodeText = getText.call(sourceCode, node);
    return nodeText;
  } catch {
    return "";
  }
}

function getFunctionName(node: MaybeAstNode): string {
  const isNode = isRecord(node);
  if (!isNode) return "Function";

  const nodeId = node.id;
  const isNamedFunctionDeclaration = node.type === "FunctionDeclaration" && isRecord(nodeId);
  if (isNamedFunctionDeclaration) return nodeId.name ?? "Function";

  const parent = node.parent;
  const hasParentNode = isRecord(parent);
  if (!hasParentNode) return "Function";

  const parentId = parent.id;
  const isVariableFunction = parent.type === "VariableDeclarator" && isRecord(parentId);
  if (isVariableFunction) return parentId.name ?? "Function";

  const parentKey = parent.key;
  const isPropertyFunction = parent.type === "Property" && isRecord(parentKey);
  if (isPropertyFunction) {
    const isIdentifierKey = parentKey.type === "Identifier";
    if (isIdentifierKey) return parentKey.name ?? "Function";

    const isLiteralKey = parentKey.type === "Literal";
    if (isLiteralKey) return String(parentKey.value ?? "Function");
  }

  return "Function";
}

function getSingleReturnExpression(body: AstValue): AstNode | null {
  const isBodyNode = isRecord(body);
  if (!isBodyNode) return null;

  const isBlockBody = body.type === "BlockStatement";
  if (!isBlockBody) return body;

  const statements = getNodeArray(body.body);
  const hasSingleStatement = statements.length === 1;
  if (!hasSingleStatement) return null;

  const statement = statements[0];
  const isSingleReturn = isRecord(statement) && statement.type === "ReturnStatement";
  if (!isSingleReturn) return null;

  const returnExpression = statement.argument ?? null;
  return isRecord(returnExpression) ? returnExpression : null;
}

function getCallbackFunction(node: MaybeAstNode): AstNode | null {
  const call = unwrapChainExpression(node);
  const isCallNode = isRecord(call);
  if (!isCallNode) return null;

  const callback = call.arguments?.[0];
  const isCallbackFunction = isFunctionNode(callback);
  if (!isCallbackFunction) return null;

  return callback;
}

function getFunctionParamNames(node: MaybeAstNode): string[] {
  const isFunction = isFunctionNode(node);
  if (!isFunction) return [];

  const params = node.params ?? [];
  const hasArrayParams = Array.isArray(params);
  if (!hasArrayParams) return [];

  const hasOnlyIdentifierParams = params.every(
    (param) => isRecord(param) && param.type === "Identifier" && typeof param.name === "string",
  );
  if (!hasOnlyIdentifierParams) return [];

  const paramNames = params.map((param) => String(param.name));
  return paramNames;
}

function isBooleanLiteral(node: MaybeAstNode, value?: boolean): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isLiteral = node.type === "Literal";
  if (!isLiteral) return false;

  const hasExpectedValue = typeof value === "boolean";
  if (hasExpectedValue) return node.value === value;

  const isBooleanValue = typeof node.value === "boolean";
  return isBooleanValue;
}

function isUndefinedExpression(node: MaybeAstNode): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isUndefinedIdentifier = node.type === "Identifier" && node.name === "undefined";
  if (isUndefinedIdentifier) return true;

  const isUnaryExpression = node.type === "UnaryExpression";
  if (!isUnaryExpression) return false;

  const isVoidExpression = node.operator === "void" && isRecord(node.argument);
  return isVoidExpression;
}

function isLiteralLookupValue(node: MaybeAstNode): boolean {
  const isLiteralNode = isRecord(node) && node.type === "Literal";
  if (!isLiteralNode) return false;

  const value = node.value;
  const isLookupValue = typeof value === "string" || typeof value === "number";
  return isLookupValue;
}

function isSameIdentifierSequence(
  args: readonly MaybeAstNode[] | undefined,
  paramNames: readonly string[],
): boolean {
  const hasArrayArgs = Array.isArray(args);
  if (!hasArrayArgs) return false;

  const hasSameLength = args.length === paramNames.length;
  if (!hasSameLength) return false;

  const hasSameIdentifierSequence = args.every(
    (arg, index) => isRecord(arg) && arg.type === "Identifier" && arg.name === paramNames[index],
  );
  return hasSameIdentifierSequence;
}

function getConfiguredNumber(context: RuleContext, key: string, fallback: number): number {
  const options = context.options ?? [];
  const value = options[0];
  const hasOptionsObject = isRecord(value);
  if (!hasOptionsObject) return fallback;

  const configuredValue = value[key];
  const hasNumberValue = typeof configuredValue === "number";
  if (!hasNumberValue) return fallback;

  return configuredValue;
}

function getConfiguredMax(context: RuleContext, fallback: number): number {
  const configuredMax = getConfiguredNumber(context, "max", fallback);
  return configuredMax;
}

function getConfiguredStringArray(
  context: RuleContext,
  key: string,
  fallback: readonly string[],
): string[] {
  const options = context.options ?? [];
  const value = options[0];
  const hasOptionsObject = isRecord(value);
  if (!hasOptionsObject) return Array.from(fallback);

  const configured = value[key];
  const hasConfiguredArray = Array.isArray(configured);
  if (!hasConfiguredArray) return Array.from(fallback);

  const configuredStrings = configured.filter((item) => typeof item === "string");
  return configuredStrings;
}

function getConfiguredStringSet(
  context: RuleContext,
  key: string,
  fallback: StringSet,
): StringSet {
  const configuredStrings = getConfiguredStringArray(context, key, Array.from(fallback));
  const configuredSet = new Set(configuredStrings);
  return configuredSet;
}

function isNonnegativeNumber(value: AstValue): value is number {
  const isNonnegative = typeof value === "number" && Number.isFinite(value) && value >= 0;
  return isNonnegative;
}

function getConfiguredOperatorComplexity(
  context: RuleContext,
  fallback: OperatorComplexity,
): OperatorComplexity {
  const options = context.options ?? [];
  const value = options[0];
  const hasOptionsObject = isRecord(value);
  if (!hasOptionsObject) return fallback;

  const fallbackComplexity = fallback as Record<string, number>;
  const complexity = (isRecord(value.complexity) ? value.complexity : {}) as Record<
    string,
    AstValue
  >;
  const operators = value.operators;
  const hasOperatorsOption = Array.isArray(operators);
  const configuredOperators: string[] = hasOperatorsOption
    ? operators.filter((operator: AstValue): operator is string => typeof operator === "string")
    : [];
  const operatorNames = new Set<string>(
    hasOperatorsOption ? configuredOperators : Object.keys(fallbackComplexity),
  );
  if (!hasOperatorsOption) {
    Object.keys(complexity).forEach((operator) => {
      operatorNames.add(operator);
    });
  }

  const configuredComplexity = Array.from(operatorNames).reduce(
    (configured: Record<string, number>, operator) => {
      const configuredWeight = complexity[operator];
      const fallbackWeight = fallbackComplexity[operator] ?? 1;
      const weight = isNonnegativeNumber(configuredWeight) ? configuredWeight : fallbackWeight;
      if (weight > 0) configured[operator] = weight;
      return configured;
    },
    {},
  );
  return configuredComplexity;
}

function normalizePath(path: string): string {
  const normalizedPath = String(path).replace(/\\/g, "/").replace(/^\.\//, "");
  return normalizedPath;
}

function getContextFilename(context: RuleContext): string {
  const filenameValue = context.filename;
  const hasFilename = typeof filenameValue === "string";
  if (hasFilename) return filenameValue;

  const getFilename = context.getFilename;
  const canGetFilename = typeof getFilename === "function";
  if (!canGetFilename) return "";

  try {
    const filename = getFilename();
    return filename;
  } catch {
    return "";
  }
}

function getContextCwd(context: RuleContext): string {
  const cwdValue = context.cwd;
  const hasCwd = typeof cwdValue === "string";
  if (hasCwd) return cwdValue;

  const getCwd = context.getCwd;
  const canGetCwd = typeof getCwd === "function";
  if (!canGetCwd) return "";

  try {
    const cwd = getCwd();
    return cwd;
  } catch {
    return "";
  }
}

function getRelativeFilename(context: RuleContext): string {
  const filename = normalizePath(getContextFilename(context));
  const cwd = normalizePath(getContextCwd(context));
  const hasFilename = Boolean(filename);
  if (!hasFilename) return "";

  const hasCwd = Boolean(cwd);
  if (!hasCwd) return filename;

  const prefix = `${cwd}/`;
  const relativeFilename = filename.startsWith(prefix) ? filename.slice(prefix.length) : filename;
  return relativeFilename;
}

function splitPathSegments(path: string): string[] {
  const segments = path.split("/").filter(Boolean);
  return segments;
}

function matchesWildcardSegment(segment: string, pattern: string): boolean {
  const parts = pattern.split("*");
  const hasWildcard = parts.length > 1;
  if (!hasWildcard) return segment === pattern;

  const startsWithWildcard = pattern.startsWith("*");
  const endsWithWildcard = pattern.endsWith("*");
  const firstPart = parts[0] ?? "";
  const lastPart = parts.at(-1) ?? "";
  const hasValidStart = startsWithWildcard || segment.startsWith(firstPart);
  const hasValidEnd = endsWithWildcard || segment.endsWith(lastPart);
  const hasValidBounds = hasValidStart && hasValidEnd;
  const hasInvalidBounds = !hasValidBounds;
  if (hasInvalidBounds) return false;

  return matchesWildcardParts(segment, parts);
}

function matchesWildcardParts(segment: string, parts: readonly string[]): boolean {
  const positions = parts.reduce(
    (position, part) => {
      if (position < 0) return -1;
      if (!part) return position;

      const nextPosition = segment.indexOf(part, position);
      const isMissingPart = nextPosition < 0;
      if (isMissingPart) return -1;

      const afterPart = nextPosition + part.length;
      return afterPart;
    },
    0,
  );
  return positions >= 0;
}

function matchesPathSegments(pathSegments: readonly string[], patternSegments: readonly string[]): boolean {
  const [patternSegment, ...remainingPatterns] = patternSegments;
  if (patternSegment === undefined) return pathSegments.length === 0;

  if (patternSegment === "**") {
    const startIndexes = Array.from({ length: pathSegments.length + 1 }, (_, index) => index);
    return startIndexes.some((index) => matchesPathSegments(pathSegments.slice(index), remainingPatterns));
  }

  const [pathSegment, ...remainingPath] = pathSegments;
  if (pathSegment === undefined) return false;
  if (!matchesWildcardSegment(pathSegment, patternSegment)) return false;

  return matchesPathSegments(remainingPath, remainingPatterns);
}

function matchesWildcardPath(path: string, pattern: string): boolean {
  const pathSegments = splitPathSegments(path);
  const patternSegments = splitPathSegments(pattern);
  const startIndexes = Array.from({ length: pathSegments.length + 1 }, (_, index) => index);
  return startIndexes.some((index) => matchesPathSegments(pathSegments.slice(index), patternSegments));
}

function matchesPathPattern(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);
  const hasWildcard = normalizedPattern.includes("*");
  if (hasWildcard) return matchesWildcardPath(normalizedPath, normalizedPattern);

  const isExactMatch = normalizedPath === normalizedPattern;
  const isNestedMatch = normalizedPath.endsWith(`/${normalizedPattern}`);
  const matchesPattern = isExactMatch || isNestedMatch;
  return matchesPattern;
}

function matchesAnyPathPattern(path: string, patterns: readonly string[]): boolean {
  const matchesPattern = patterns.some((pattern) => matchesPathPattern(path, pattern));
  return matchesPattern;
}

function getLegacySourceCode(context: RuleContext): SourceCodeLike | null {
  const getContextSourceCode = context.getSourceCode;
  const canGetSourceCode = typeof getContextSourceCode === "function";
  if (!canGetSourceCode) return null;

  try {
    return getContextSourceCode();
  } catch {
    return null;
  }
}

function canReadSourceCode(
  sourceCode: SourceCodeLike | null | undefined,
): sourceCode is SourceCodeLike {
  const hasText = typeof sourceCode?.text === "string";
  const hasGetText = typeof sourceCode?.getText === "function";
  return hasText || hasGetText;
}

function canReadComments(
  sourceCode: SourceCodeLike | null | undefined,
): sourceCode is SourceCodeLike {
  const canGetComments = typeof sourceCode?.getAllComments === "function";
  return canGetComments;
}

function getCommentSourceCode(context: RuleContext): SourceCodeLike | null {
  const directSourceCode = context.sourceCode;
  if (canReadComments(directSourceCode)) return directSourceCode;

  const legacySourceCode = getLegacySourceCode(context);
  if (!canReadComments(legacySourceCode)) return null;
  return legacySourceCode;
}

function getSourceCode(context: RuleContext): SourceCodeLike | null {
  const directSourceCode = context.sourceCode;
  if (canReadSourceCode(directSourceCode)) return directSourceCode;

  const legacySourceCode = getLegacySourceCode(context);
  if (!canReadSourceCode(legacySourceCode)) return null;
  return legacySourceCode;
}

function getSourceText(context: RuleContext): string {
  const sourceCode = getSourceCode(context);
  if (sourceCode === null) return "";

  const sourceText = sourceCode.text;
  const hasText = typeof sourceText === "string";
  if (hasText) return sourceText;

  const getText = sourceCode.getText;
  const canGetText = typeof getText === "function";
  if (!canGetText) return "";

  try {
    return getText.call(sourceCode);
  } catch {
    return "";
  }
}

function isSourceComment(value: unknown): value is AstNode {
  const isNode = isRecord(value);
  if (!isNode) return false;

  const isLineComment = value.type === "Line";
  const isBlockComment = value.type === "Block";
  return isLineComment || isBlockComment;
}

function getAllComments(context: RuleContext): AstNode[] {
  const sourceCode = getCommentSourceCode(context);
  if (sourceCode === null) return [];

  const getAllComments = sourceCode.getAllComments;
  const canGetComments = typeof getAllComments === "function";
  if (!canGetComments) return [];

  try {
    return getAllComments.call(sourceCode).filter(isSourceComment);
  } catch {
    return [];
  }
}

function getCommentValue(comment: AstNode): string {
  const value = comment.value;
  const hasStringValue = typeof value === "string";
  if (!hasStringValue) return "";
  return value;
}

function getCommentAuthorValues(comment: AstNode): string[] {
  const lines = getCommentValue(comment).split(/\r?\n/);
  const normalizedLines = lines.map((line) => line.replace(/^\s*\*\s?/, ""));
  const authorValues = normalizedLines
    .map((line) => line.match(/(?:^|\s)@author\b\s*:?\s*(\S.*?)\s*$/i)?.[1] ?? "")
    .filter(Boolean);
  return authorValues;
}

function normalizeAttributionText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsWholePhrase(value: string, phrase: string): boolean {
  const paddedValue = ` ${value} `;
  const paddedPhrase = ` ${phrase} `;
  return paddedValue.includes(paddedPhrase);
}

function findIdentifier(value: string, identifiers: readonly string[]): string | null {
  const normalizedValue = normalizeAttributionText(value);
  const identifier = identifiers.find((candidate) => {
    const normalizedCandidate = normalizeAttributionText(candidate);
    if (!normalizedCandidate) return false;
    return containsWholePhrase(normalizedValue, normalizedCandidate);
  });
  return identifier ?? null;
}

function hasGenerationSignature(value: string, identifier: string): boolean {
  const normalizedValue = normalizeAttributionText(value);
  const normalizedIdentifier = normalizeAttributionText(identifier);
  if (!normalizedIdentifier) return false;

  const verbs = ["authored", "created", "generated", "produced", "written"];
  const hasSignature = verbs.some((verb) =>
    hasGenerationVerbSignature(normalizedValue, normalizedIdentifier, verb),
  );
  return hasSignature;
}

function hasGenerationVerbSignature(value: string, identifier: string, verb: string): boolean {
  const phrases = [
    `${identifier} ${verb}`,
    `${verb} by ${identifier}`,
    `${verb} by a ${identifier}`,
    `${verb} by an ${identifier}`,
  ];
  return phrases.some((phrase) => containsWholePhrase(value, phrase));
}

function findProhibitedAttribution(
  comment: AstNode,
  identifiers: readonly string[],
): string | null {
  const authorValues = getCommentAuthorValues(comment);
  const authorIdentifier = authorValues
    .map((value) => findIdentifier(value, identifiers))
    .find(Boolean);
  if (authorIdentifier) return authorIdentifier;

  const commentValue = getCommentValue(comment);
  const generatedIdentifier = identifiers.find((identifier) =>
    hasGenerationSignature(commentValue, identifier),
  );
  return generatedIdentifier ?? null;
}

function createNoAutomatedCommentAttribution(context: RuleContext): RuleListener {
  const identifiers = getConfiguredStringArray(
    context,
    "identifiers",
    DEFAULT_AI_COMMENT_IDENTIFIERS,
  );
  return {
    Program() {
      getAllComments(context).forEach((comment) => {
        const identifier = findProhibitedAttribution(comment, identifiers);
        if (!identifier) return;
        context.report({
          node: comment,
          messageId: "prohibitedAttribution",
          data: { identifier },
        });
      });
    },
  };
}

function compileCommentMatcher(source: string): RegExp | null {
  try {
    return new RegExp(source, "iu");
  } catch {
    return null;
  }
}

function matchesCommentMatcher(value: string, matchers: readonly RegExp[]): boolean {
  return matchers.some((matcher) => matcher.test(value));
}

function normalizeCommentValue(value: string): string {
  const lines = value.split(/\r?\n/);
  const normalizedLines = lines.map((line) => line.replace(/^\s*\*\s?/, ""));
  return normalizedLines.join("\n").trim();
}

function isIdentifierBoundary(value: string, index: number): boolean {
  const character = value[index];
  if (character === undefined) return true;
  return !/[a-z0-9_]/i.test(character);
}

function matchesPrefixIdentifier(value: string, identifiers: readonly string[]): boolean {
  return identifiers.some((identifier) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (!normalizedIdentifier) return false;

    const hasPrefix = value.startsWith(normalizedIdentifier);
    if (!hasPrefix) return false;
    return isIdentifierBoundary(value, normalizedIdentifier.length);
  });
}

function matchesSuffixIdentifier(value: string, identifiers: readonly string[]): boolean {
  return identifiers.some((identifier) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    if (!normalizedIdentifier) return false;

    const hasSuffix = value.endsWith(normalizedIdentifier);
    if (!hasSuffix) return false;
    const identifierStart = value.length - normalizedIdentifier.length;
    return isIdentifierBoundary(value, identifierStart - 1);
  });
}

function isAllowedComment(
  value: string,
  matchers: readonly RegExp[],
  prefixIdentifiers: readonly string[],
  suffixIdentifiers: readonly string[],
): boolean {
  const normalizedValue = normalizeCommentValue(value);
  const matchesPattern = matchesCommentMatcher(normalizedValue, matchers);
  if (matchesPattern) return true;

  const normalizedBoundary = normalizedValue.toLowerCase();
  const matchesPrefix = matchesPrefixIdentifier(normalizedBoundary, prefixIdentifiers);
  if (matchesPrefix) return true;
  return matchesSuffixIdentifier(normalizedBoundary, suffixIdentifiers);
}

function createNoUnmatchedComments(context: RuleContext): RuleListener {
  const matcherSources = getConfiguredStringArray(context, "matchers", DEFAULT_COMMENT_MATCHERS);
  const matchers = matcherSources.map(compileCommentMatcher).filter((matcher) => matcher !== null);
  const prefixIdentifiers = getConfiguredStringArray(
    context,
    "prefixIdentifiers",
    DEFAULT_COMMENT_PREFIX_IDENTIFIERS,
  );
  const suffixIdentifiers = getConfiguredStringArray(
    context,
    "suffixIdentifiers",
    DEFAULT_COMMENT_SUFFIX_IDENTIFIERS,
  );
  return {
    Program() {
      getAllComments(context).forEach((comment) => {
        const commentValue = getCommentValue(comment);
        const isAllowed = isAllowedComment(
          commentValue,
          matchers,
          prefixIdentifiers,
          suffixIdentifiers,
        );
        if (isAllowed) return;
        context.report({ node: comment, messageId: "unmatched" });
      });
    },
  };
}

function isMultilineBlockComment(comment: AstNode): boolean {
  const isBlockComment = comment.type === "Block";
  const spansLines = /\r?\n/.test(getCommentValue(comment));
  return isBlockComment && spansLines;
}

function isJsdocComment(context: RuleContext, comment: AstNode): boolean {
  const commentText = getNodeText(context, comment).trimStart();
  if (commentText) return commentText.startsWith("/**");

  return getCommentValue(comment).startsWith("*");
}

function createRequireJsdocMultilineComments(context: RuleContext): RuleListener {
  return {
    Program() {
      getAllComments(context).forEach((comment) => {
        const needsJsdoc = isMultilineBlockComment(comment);
        if (!needsJsdoc) return;

        const hasJsdocSyntax = isJsdocComment(context, comment);
        if (hasJsdocSyntax) return;
        context.report({ node: comment, messageId: "useJsdoc" });
      });
    },
  };
}

function getFirstLine(text: string): string {
  return text.split(/\r?\n/, 1)[0] ?? "";
}

function isRuntimeShebang(line: string, runtime: string): boolean {
  const hasShebang = line.startsWith("#!");
  if (!hasShebang) return false;

  const command = line.slice(2).trim();
  const isDirectRuntime = command === runtime;
  if (isDirectRuntime) return true;

  const isDirectRuntimeWithArgs = command.startsWith(`${runtime} `);
  if (isDirectRuntimeWithArgs) return true;

  const isEnvRuntime = command === `/usr/bin/env ${runtime}`;
  if (isEnvRuntime) return true;

  const isEnvRuntimeWithArgs = command.startsWith(`/usr/bin/env ${runtime} `);
  if (isEnvRuntimeWithArgs) return true;

  const isEnvSplitRuntime = command === `/usr/bin/env -S ${runtime}`;
  if (isEnvSplitRuntime) return true;

  return command.startsWith(`/usr/bin/env -S ${runtime} `);
}

function hasAllowedShebang(text: string, runtimes: readonly string[]): boolean {
  const firstLine = getFirstLine(text);
  return runtimes.some((runtime) => isRuntimeShebang(firstLine, runtime));
}

function createRequireExecutableShebang(context: RuleContext): RuleListener {
  const files = getConfiguredStringArray(context, "files", DEFAULT_EXECUTABLE_ENTRY_PATTERNS);
  const runtimes = getConfiguredStringArray(context, "runtimes", DEFAULT_EXECUTABLE_RUNTIMES);
  return {
    Program(node) {
      checkExecutableShebang(context, node, files, runtimes);
    },
  };
}

function checkExecutableShebang(
  context: RuleContext,
  node: AstNode,
  files: readonly string[],
  runtimes: readonly string[],
): void {
  const filename = getRelativeFilename(context);
  const hasFilename = Boolean(filename);
  if (!hasFilename) return;

  const isConfiguredExecutable = matchesAnyPathPattern(filename, files);
  if (!isConfiguredExecutable) return;

  const hasShebang = hasAllowedShebang(getSourceText(context), runtimes);
  if (hasShebang) return;

  context.report({
    node,
    messageId: "missingShebang",
    data: { file: filename },
  });
}

function getTemplateQuasiValue(quasi: MaybeAstNode): string {
  const isQuasiNode = isRecord(quasi);
  if (!isQuasiNode) return "";

  const value = quasi.value;
  const hasValue = isRecord(value);
  if (!hasValue) return "";

  const cooked = value.cooked;
  const hasCookedValue = typeof cooked === "string";
  if (hasCookedValue) return cooked;

  const raw = value.raw;
  const hasRawValue = typeof raw === "string";
  if (hasRawValue) return raw;

  return "";
}

function getStringValue(node: MaybeAstNode): string | null {
  const isNode = isRecord(node);
  if (!isNode) return null;

  const isLiteral = node.type === "Literal";
  if (isLiteral) {
    const literalValue = node.value;
    const isStringLiteral = typeof literalValue === "string";
    if (!isStringLiteral) return null;

    return literalValue;
  }

  const isTemplateLiteral = node.type === "TemplateLiteral";
  if (!isTemplateLiteral) return null;

  const expressions = node.expressions ?? [];
  const hasExpressions = Boolean(expressions.length);
  if (hasExpressions) return null;

  const quasis = node.quasis ?? [];
  return quasis.map(getTemplateQuasiValue).join("");
}

function getCalleeName(node: MaybeAstNode): string | null {
  const call = unwrapChainExpression(node);
  const isCallNode = isRecord(call);
  if (!isCallNode) return null;

  const callee = unwrapChainExpression(call.callee);
  const isCalleeNode = isRecord(callee);
  if (!isCalleeNode) return null;

  const isIdentifierCallee = callee.type === "Identifier";
  if (isIdentifierCallee) return callee.name ?? null;

  const isMemberCallee = callee.type === "MemberExpression";
  if (!isMemberCallee) return null;

  return getStaticPropertyName(callee);
}

function stripCommandQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function isNodeCommand(value: string): boolean {
  const isBareNode = value === "node";
  const isPathNode = value.endsWith("/node");
  return isBareNode || isPathNode;
}

function isDirectBinEntry(value: string, patterns: readonly string[]): boolean {
  const unquoted = normalizePath(stripCommandQuotes(value));
  const withoutPrefix = unquoted.replace(/^\.\//, "");
  return matchesAnyPathPattern(withoutPrefix, patterns);
}

function findDirectBinEntry(args: readonly string[], patterns: readonly string[]): string | null {
  const unquotedArgs = args.map(stripCommandQuotes);
  const directBinEntry = unquotedArgs.find((arg) => {
    const isFlag = arg.startsWith("-");
    if (isFlag) return false;

    return isDirectBinEntry(arg, patterns);
  });
  return directBinEntry ?? null;
}

function getArrayStringValues(node: MaybeAstNode): string[] {
  const isNode = isRecord(node);
  if (!isNode) return [];

  const isArrayExpression = node.type === "ArrayExpression";
  if (!isArrayExpression) return [];

  const elements = node.elements ?? [];
  return elements.map(getStringValue).filter((value) => typeof value === "string");
}

function getDirectNodeEntryFromCommand(
  command: string,
  patterns: readonly string[],
): string | null {
  const parts = command.trim().split(/\s+/).map(stripCommandQuotes);
  const commandName = parts[0] ?? "";
  const usesNode = isNodeCommand(commandName);
  if (!usesNode) return null;

  return findDirectBinEntry(parts.slice(1), patterns) ?? null;
}

function getDirectNodeEntryFromCall(node: AstNode, patterns: readonly string[]): string | null {
  const calleeName = getCalleeName(node);
  const commandFunctionName = calleeName ?? "";
  const args = node.arguments ?? [];
  const firstArg = getStringValue(args[0]);
  if (firstArg === null) return null;

  const isShellCommandFunction = SHELL_COMMAND_FUNCTIONS.has(commandFunctionName);
  if (isShellCommandFunction) {
    return getDirectNodeEntryFromCommand(firstArg, patterns);
  }

  const isArgCommandFunction = ARG_COMMAND_FUNCTIONS.has(commandFunctionName);
  if (!isArgCommandFunction) return null;

  const usesNode = isNodeCommand(firstArg);
  if (!usesNode) return null;

  return findDirectBinEntry(getArrayStringValues(args[1]), patterns) ?? null;
}

function createNoDirectNodeBinSmoke(context: RuleContext): RuleListener {
  const patterns = getConfiguredStringArray(
    context,
    "entryPatterns",
    DEFAULT_DIRECT_BIN_ENTRY_PATTERNS,
  );
  return {
    CallExpression(node) {
      checkDirectNodeBinSmoke(context, node, patterns);
    },
  };
}

function checkDirectNodeBinSmoke(
  context: RuleContext,
  node: AstNode,
  patterns: readonly string[],
): void {
  const entry = getDirectNodeEntryFromCall(node, patterns);
  const hasDirectEntry = Boolean(entry);
  if (!hasDirectEntry) return;

  context.report({
    node,
    messageId: "directNodeBin",
    data: { entry },
  });
}

function createExpressionCheck(context: RuleContext): (expression: AstValue) => void {
  const max = getConfiguredMax(context, DEFAULT_MAX_EXPRESSION_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_READABILITY_OPERATOR_COMPLEXITY,
  );
  const checked = new WeakSet<object>();
  return (expression) => {
    const isExpressionNode = isRecord(expression);
    if (!isExpressionNode) return;

    const shouldSkipExpression = isSkippedExpressionRoot(expression);
    if (shouldSkipExpression) return;

    const hasCheckedExpression = checked.has(expression);
    if (hasCheckedExpression) return;

    checked.add(expression);
    const count = countExpressionOperators(expression, complexity);
    const isWithinLimit = count <= max;
    if (isWithinLimit) return;

    context.report({
      node: expression,
      messageId: "tooMany",
      data: { count, max },
    });
  };
}

function createMaxExpressionOperators(context: RuleContext): RuleListener {
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

function createHoistIfOperators(context: RuleContext): RuleListener {
  const max = getConfiguredMax(context, DEFAULT_MAX_IF_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_IF_CONDITION_OPERATOR_COMPLEXITY,
  );
  return {
    IfStatement(node) {
      const testNode = node.test;
      const count = countIfConditionOperators(testNode, complexity);
      const isWithinLimit = count <= max;
      if (isWithinLimit) return;
      if (!isRecord(testNode)) return;

      context.report({
        node: testNode,
        messageId: "tooMany",
        data: { count, max },
      });
    },
  };
}

function isExpressionStatement(node: MaybeAstNode): boolean {
  const isExpression = isRecord(node) && node.type === "ExpressionStatement";
  return isExpression;
}

function isForUpdateExpression(node: MaybeAstNode): boolean {
  const isForUpdate = isRecord(node) && node.type === "ForStatement" && isRecord(node.update);
  return isForUpdate;
}

function getSideEffectParent(node: AstNode): MaybeAstNode {
  const parent = node.parent;
  const isParentNode = isRecord(parent);
  if (!isParentNode) return parent;

  const isChainParent = parent.type === "ChainExpression";
  if (!isChainParent) return parent;

  return parent.parent;
}

function isStandaloneSideEffect(node: AstNode): boolean {
  const parent = getSideEffectParent(node);
  const isStandaloneExpression = isExpressionStatement(parent);
  if (isStandaloneExpression) return true;

  const isForUpdateParent = isRecord(parent) && isForUpdateExpression(parent);
  if (!isForUpdateParent) return false;

  const isForUpdateSideEffect = parent.update === node;
  return isForUpdateSideEffect;
}

function isAssignmentSideEffect(node: AstNode): boolean {
  const isAssignment = node.type === "AssignmentExpression";
  const isUpdate = node.type === "UpdateExpression";
  return isAssignment || isUpdate;
}

function getMemberObject(node: MaybeAstNode): MaybeAstNode {
  const member = getCallMemberExpression(node);
  if (member === null) return null;

  return unwrapChainExpression(member.object) ?? null;
}

function isFreshMutationTarget(target: MaybeAstNode): boolean {
  const isTargetNode = isRecord(target);
  if (!isTargetNode) return false;

  const isArrayTarget = target.type === "ArrayExpression";
  if (isArrayTarget) return true;

  const isObjectTarget = target.type === "ObjectExpression";
  if (isObjectTarget) return true;

  return target.type === "CallExpression";
}

function isFreshMutatingMethodCall(node: MaybeAstNode, mutatingMethods: StringSet): boolean {
  const isMutation = isMethodCall(node, mutatingMethods);
  if (!isMutation) return false;

  return isFreshMutationTarget(getMemberObject(node));
}

function isSideEffectNode(node: MaybeAstNode, mutatingMethods: StringSet): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isAssignment = isAssignmentSideEffect(node);
  if (isAssignment) return true;

  const isFreshMutation = isFreshMutatingMethodCall(node, mutatingMethods);
  if (isFreshMutation) return false;

  return isMethodCall(node, mutatingMethods);
}

function containsSideEffect(
  node: AstNode,
  root = node,
  mutatingMethods: StringSet = MUTATING_METHODS,
): boolean {
  return containsNode(node, (child) => isSideEffectNode(child, mutatingMethods), root);
}

function reportHiddenSideEffect(context: RuleContext, node: AstNode): void {
  const isStandalone = isStandaloneSideEffect(node);
  if (isStandalone) return;

  context.report({ node, messageId: "hiddenSideEffect" });
}

function checkCallbackSideEffects(
  context: RuleContext,
  node: AstNode,
  sideEffectFreeIterationMethods: StringSet,
  mutatingMethods: StringSet,
): boolean {
  const isSideEffectFreeCallback = isMethodCall(node, sideEffectFreeIterationMethods);
  if (!isSideEffectFreeCallback) return false;

  const body = getCallbackBody(node);
  const hasBodyNode = isRecord(body);
  if (!hasBodyNode) return false;

  const hasSideEffect = containsSideEffect(body, body, mutatingMethods);
  if (!hasSideEffect) return false;

  context.report({
    node,
    messageId: "callbackSideEffect",
    data: { method: getMethodName(node) ?? "unknown" },
  });
  return true;
}

function createNoHiddenSideEffects(context: RuleContext): RuleListener {
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
      checkCallExpressionSideEffects(context, node, sideEffectFreeIterationMethods, mutatingMethods);
    },
    UpdateExpression(node) {
      reportHiddenSideEffect(context, node);
    },
  };
}

function checkCallExpressionSideEffects(
  context: RuleContext,
  node: AstNode,
  sideEffectFreeIterationMethods: StringSet,
  mutatingMethods: StringSet,
): void {
  checkCallbackSideEffects(context, node, sideEffectFreeIterationMethods, mutatingMethods);
  const isMutation = isMethodCall(node, mutatingMethods);
  if (!isMutation) return;

  const isFreshMutation = isFreshMutatingMethodCall(node, mutatingMethods);
  if (isFreshMutation) return;

  reportHiddenSideEffect(context, node);
}

function createNoStandaloneArrayMutations(context: RuleContext): RuleListener {
  const arrayMutatingMethods = getConfiguredStringSet(
    context,
    "arrayMutatingMethods",
    ARRAY_MUTATING_METHODS,
  );
  const mutatingMethods = getConfiguredStringSet(context, "mutatingMethods", MUTATING_METHODS);
  return {
    CallExpression(node) {
      checkStandaloneArrayMutation(context, node, arrayMutatingMethods, mutatingMethods);
    },
  };
}

function checkStandaloneArrayMutation(
  context: RuleContext,
  node: AstNode,
  arrayMutatingMethods: StringSet,
  mutatingMethods: StringSet,
): void {
  const isArrayMutation = isMethodCall(node, arrayMutatingMethods);
  if (!isArrayMutation) return;

  const isFreshMutation = isFreshMutatingMethodCall(node, mutatingMethods);
  if (isFreshMutation) return;

  const isStandalone = isStandaloneSideEffect(node);
  if (!isStandalone) return;

  context.report({
    node,
    messageId: "standaloneArrayMutation",
    data: { method: getMethodName(node) ?? "unknown" },
  });
}

function reportComputedValue(
  context: RuleContext,
  node: MaybeAstNode,
  messageId: string,
  max: number,
  complexity: OperatorComplexity,
): void {
  const isNode = isRecord(node);
  if (!isNode) return;

  const count = countComputedValueOperators(node, complexity);
  const isWithinLimit = count <= max;
  if (isWithinLimit) return;

  context.report({ node, messageId, data: { count, max } });
}

function isComputedReturnSkipped(argument: MaybeAstNode): boolean {
  const isArgumentNode = isRecord(argument);
  if (!isArgumentNode) return true;

  const isObjectReturn = argument.type === "ObjectExpression";
  if (isObjectReturn) return true;

  const isFunctionReturn = isFunctionNode(argument);
  if (isFunctionReturn) return true;

  return isJsxNode(argument);
}

function createNoComputedValues(context: RuleContext): RuleListener {
  const max = getConfiguredMax(context, DEFAULT_MAX_COMPUTED_VALUE_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_COMPUTED_VALUE_OPERATOR_COMPLEXITY,
  );
  return {
    Property(node) {
      const value = node.value;
      const isValueNode = isRecord(value);
      if (!isValueNode) return;

      const isFunctionValue = isFunctionNode(value);
      if (isFunctionValue) return;

      const isJsxValue = isJsxNode(value);
      if (isJsxValue) return;

      reportComputedValue(context, value, "computedObjectValue", max, complexity);
    },
    ReturnStatement(node) {
      const argument = node.argument;
      const shouldSkipReturn = isComputedReturnSkipped(argument);
      if (shouldSkipReturn) return;

      reportComputedValue(context, argument, "computedReturn", max, complexity);
    },
  };
}

function reportSpreadElements(
  context: RuleContext,
  nodes: readonly MaybeAstNode[],
  messageId: string,
): void {
  nodes
    .filter((node): node is AstNode => isRecord(node) && node.type === "SpreadElement")
    .forEach((node) => {
      context.report({ node, messageId });
    });
}

function createPreferConcatObjectAssign(context: RuleContext): RuleListener {
  return {
    ArrayExpression(node) {
      reportSpreadElements(context, node.elements ?? [], "arraySpread");
    },
    ObjectExpression(node) {
      reportSpreadElements(context, node.properties ?? [], "objectSpread");
    },
  };
}

function containsTernary(node: MaybeAstNode): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  return containsNode(node, (child) => child.type === "ConditionalExpression");
}

function hasNestedTernary(node: AstNode): boolean {
  return [node.test, node.consequent, node.alternate].some(containsTernary);
}

function createNoComplexTernaries(context: RuleContext): RuleListener {
  const max = getConfiguredMax(context, DEFAULT_MAX_TERNARY_OPERATORS);
  const complexity = getConfiguredOperatorComplexity(
    context,
    DEFAULT_READABILITY_OPERATOR_COMPLEXITY,
  );
  return {
    ConditionalExpression(node) {
      const hasNestedExpression = hasNestedTernary(node);
      if (hasNestedExpression) {
        context.report({ node, messageId: "nested" });
        return;
      }

      const count = countExpressionOperators(node, complexity);
      const isWithinLimit = count <= max;
      if (isWithinLimit) return;

      context.report({
        node,
        messageId: "tooMany",
        data: { count, max },
      });
    },
  };
}

function enterLoop(loopStack: LoopStack, context: RuleContext, node: AstNode): LoopStack {
  const isNestedLoop = loopStack.some((loop) => isNodeInsideLoopBody(node, loop));
  if (isNestedLoop) {
    context.report({ node, messageId: "nestedLoop" });
  }

  return loopStack.concat(node);
}

function isAncestorOrSelf(ancestor: AstNode, node: MaybeAstNode): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isAncestor = node === ancestor;
  if (isAncestor) return true;

  return isAncestorOrSelf(ancestor, node.parent);
}

function getLoopBody(loopNode: MaybeAstNode): AstNode | null {
  const isLoopNode = isRecord(loopNode);
  if (!isLoopNode) return null;

  return isRecord(loopNode.body) ? loopNode.body : null;
}

function isNodeInsideLoopBody(node: AstNode, loopNode: AstNode): boolean {
  const body = getLoopBody(loopNode);
  return Boolean(body && isAncestorOrSelf(body, node));
}

function checkSearchInLoop(
  loopStack: LoopStack,
  context: RuleContext,
  node: AstNode,
  searchMethods: StringSet,
): void {
  const isInsideLoopBody = loopStack.some((loop) => isNodeInsideLoopBody(node, loop));
  if (!isInsideLoopBody) return;

  const isSearchCall = isMethodCall(node, searchMethods);
  if (!isSearchCall) return;

  context.report({
    node,
    messageId: "searchInLoop",
    data: { method: getMethodName(node) ?? "unknown" },
  });
}

function checkNestedIteration(
  context: RuleContext,
  node: AstNode,
  iterationMethods: StringSet,
): boolean {
  const isIterationCall = isMethodCall(node, iterationMethods);
  if (!isIterationCall) return false;

  const body = getCallbackBody(node);
  const hasCallbackBody = Boolean(body);
  if (!hasCallbackBody) return false;

  const containsIteration = containsCallTo(body, iterationMethods);
  if (!containsIteration) return false;

  const innerMatch = Array.from(iterationMethods).find((method) =>
    containsCallTo(body, new Set([method])),
  );
  const hasInnerMatch = Boolean(innerMatch);
  if (!hasInnerMatch) return false;

  context.report({
    node,
    messageId: "nestedIteration",
    data: { outer: getMethodName(node) ?? "unknown", inner: innerMatch },
  });
  return true;
}

function createLoopVisitors(
  context: RuleContext,
  getLoopStack: () => LoopStack,
  setLoopStack: (loopStack: LoopStack) => void,
): RuleListener {
  return Object.fromEntries(
    Array.from(LOOP_TYPES).flatMap((type) => [
      [
        type,
        (node: AstNode) => {
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

function createNoQuadraticPatterns(context: RuleContext): RuleListener {
  const iterationMethods = getConfiguredStringSet(context, "iterationMethods", ITERATION_METHODS);
  const searchMethods = getConfiguredStringSet(context, "searchMethods", SEARCH_METHODS);
  let loopStack: LoopStack = [];
  const loopVisitors = createLoopVisitors(
    context,
    () => loopStack,
    (nextLoopStack) => {
      loopStack = nextLoopStack;
    },
  );

  return Object.assign({}, loopVisitors, {
    CallExpression(node: AstNode) {
      const reportedNestedIteration = checkNestedIteration(context, node, iterationMethods);
      if (reportedNestedIteration) return;

      checkSearchInLoop(loopStack, context, node, searchMethods);
    },
  });
}

function isElseIf(node: AstNode): boolean {
  const parent = node.parent;
  const isElseIfStatement =
    isRecord(parent) && parent.type === "IfStatement" && parent.alternate === node;
  return isElseIfStatement;
}

function createControlFlowVisitors(context: RuleContext): RuleListener {
  const max = getConfiguredMax(context, DEFAULT_MAX_CONTROL_FLOW_DEPTH);
  let depth = 0;
  let stack: number[] = [];
  let functionStack: FunctionDepthFrame[] = [];

  const controlVisitors = Object.fromEntries(
    Array.from(CONTROL_FLOW_TYPES).flatMap((type) => [
      [
        type,
        (node: AstNode) => {
          stack = stack.concat(depth);
          depth = getNextControlFlowDepth(type, node, depth);
          const isWithinLimit = depth <= max;
          if (isWithinLimit) return;

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
          depth = getLastStackNumber(stack);
          stack = dropLastStackItem(stack);
        },
      ],
    ]),
  );
  const functionVisitors = Object.fromEntries(
    Array.from(FUNCTION_NODE_TYPES).flatMap((type) => [
      [
        type,
        () => {
          functionStack = functionStack.concat({ depth, stackLength: stack.length });
          depth = 0;
        },
      ],
      [
        `${type}:exit`,
        () => {
          const previous = getLastStackItem(functionStack);
          functionStack = dropLastStackItem(functionStack);
          depth = previous?.depth ?? 0;
          stack = stack.slice(0, previous?.stackLength ?? 0);
        },
      ],
    ]),
  );
  return Object.assign({}, controlVisitors, functionVisitors);
}

function getNextControlFlowDepth(type: string, node: AstNode, currentDepth: number): number {
  const isIfStatement = type === "IfStatement";
  const isElseIfBranch = isIfStatement && isElseIf(node);
  if (isElseIfBranch) return currentDepth;

  const nextDepth = currentDepth + 1;
  return nextDepth;
}

function getLastStackNumber(stack: readonly number[]): number {
  const lastItem = stack[stack.length - 1];
  if (lastItem === undefined) return 0;

  return lastItem;
}

function getLastStackItem<T>(stack: readonly T[]): T | undefined {
  const lastItem = stack[stack.length - 1];
  return lastItem;
}

function dropLastStackItem<T>(stack: readonly T[]): T[] {
  const nextStack = stack.slice(0, -1);
  return nextStack;
}

function getLastStatement(block: MaybeAstNode): AstNode | null {
  const isBlockNode = isRecord(block);
  if (!isBlockNode) return null;

  const isBlockStatement = block.type === "BlockStatement";
  if (!isBlockStatement) return block;

  const body = getNodeArray(block.body);
  const lastStatement = body.length ? body[body.length - 1] : null;
  return isRecord(lastStatement) ? lastStatement : null;
}

function alwaysExits(node: MaybeAstNode): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const lastStatement = getLastStatement(node);
  const hasLastStatement = isRecord(lastStatement);
  if (!hasLastStatement) return false;

  const isTerminalStatement = TERMINAL_STATEMENT_TYPES.has(String(lastStatement.type));
  if (isTerminalStatement) return true;

  const isIfStatement = lastStatement.type === "IfStatement";
  if (!isIfStatement) return false;

  const hasAlternate = Boolean(lastStatement.alternate);
  if (!hasAlternate) return false;

  return alwaysExits(lastStatement.consequent) && alwaysExits(lastStatement.alternate);
}

function createPreferEarlyReturn(context: RuleContext): RuleListener {
  return {
    IfStatement(node) {
      const alternate = node.alternate;
      if (!isRecord(alternate)) return;

      const consequentExits = alwaysExits(node.consequent);
      if (!consequentExits) return;

      context.report({
        node: alternate,
        messageId: "avoidElse",
      });
    },
  };
}

function isParentArrayChainCall(node: AstNode, iterationMethods: StringSet): boolean {
  const parent = node.parent;
  const isParentMember = isRecord(parent) && parent.type === "MemberExpression";
  if (!isParentMember) return false;

  const isMemberObject = unwrapChainExpression(parent.object) === node;
  if (!isMemberObject) return false;

  const grandparent = parent.parent;
  const hasGrandparent = isRecord(grandparent);
  if (!hasGrandparent) return false;

  return isMethodCall(grandparent, iterationMethods);
}

function getChainedArrayMethods(node: AstNode, iterationMethods: StringSet): string[] {
  return collectChainedArrayMethods(unwrapChainExpression(node), iterationMethods);
}

function collectChainedArrayMethods(node: MaybeAstNode, iterationMethods: StringSet): string[] {
  const isNode = isRecord(node);
  if (!isNode) return [];

  const isIterationCall = isMethodCall(node, iterationMethods);
  if (!isIterationCall) return [];

  const method = getMethodName(node);
  if (method === null) return [];

  return collectChainedArrayMethods(getMemberObject(node), iterationMethods).concat(method);
}

function createMaxArrayChainDepth(context: RuleContext): RuleListener {
  const max = getConfiguredMax(context, DEFAULT_MAX_ARRAY_CHAIN_DEPTH);
  const iterationMethods = getConfiguredStringSet(context, "iterationMethods", ITERATION_METHODS);
  return {
    CallExpression(node) {
      checkArrayChainDepth(context, node, iterationMethods, max);
    },
  };
}

function checkArrayChainDepth(
  context: RuleContext,
  node: AstNode,
  iterationMethods: StringSet,
  max: number,
): void {
  const isParentChainCall = isParentArrayChainCall(node, iterationMethods);
  if (isParentChainCall) return;

  const methods = getChainedArrayMethods(node, iterationMethods);
  const isWithinLimit = methods.length <= max;
  if (isWithinLimit) return;

  context.report({
    node,
    messageId: "tooMany",
    data: { count: methods.length, max, chain: methods.join(".") },
  });
}

function getStableObjectKey(node: MaybeAstNode): string | null {
  const value = unwrapChainExpression(node);
  const isValueNode = isRecord(value);
  if (!isValueNode) return null;

  const isIdentifier = value.type === "Identifier";
  if (isIdentifier) return value.name ?? null;

  const isThis = value.type === "ThisExpression";
  if (isThis) return "this";

  const isMember = value.type === "MemberExpression";
  if (!isMember) return null;

  const objectKey = getStableObjectKey(value.object);
  const propertyName = getStaticPropertyName(value);
  const hasStableMemberKey = objectKey && propertyName;
  if (!hasStableMemberKey) return null;

  return `${objectKey}.${propertyName}`;
}

function createScopeVisitors(onEnter: ScopeCallback, onExit: ScopeCallback): RuleListener {
  const scopeTypes = ["Program"].concat(Array.from(FUNCTION_NODE_TYPES));
  return Object.fromEntries(
    scopeTypes.flatMap((type) => [
      [type, onEnter],
      [`${type}:exit`, onExit],
    ]),
  );
}

function createFunctionNodeVisitors(checkNode: (node: AstNode) => void): RuleListener {
  return Object.fromEntries(Array.from(FUNCTION_NODE_TYPES).map((type) => [type, checkNode]));
}

function createNoRepeatedCollectionSearch(context: RuleContext): RuleListener {
  const searchMethods = getConfiguredStringSet(context, "searchMethods", SEARCH_METHODS);
  let scopes: ScopeStack = [];
  const enterScope = () => {
    scopes = scopes.concat(new Map());
  };
  const exitScope = () => {
    scopes = dropLastStackItem(scopes);
  };

  return Object.assign({}, createScopeVisitors(enterScope, exitScope), {
    CallExpression(node: AstNode) {
      checkRepeatedCollectionSearch(context, scopes, node, searchMethods);
    },
  });
}

function getCurrentScope(scopes: ScopeStack): NodeScope | null {
  const currentScope = scopes[scopes.length - 1] ?? null;
  return currentScope;
}

function checkRepeatedCollectionSearch(
  context: RuleContext,
  scopes: ScopeStack,
  node: AstNode,
  searchMethods: StringSet,
): void {
  const isSearchCall = isMethodCall(node, searchMethods);
  if (!isSearchCall) return;

  const collection = getStableObjectKey(getMemberObject(node));
  const method = getMethodName(node);
  const hasSearchKey = collection && method;
  if (!hasSearchKey) return;

  const scope = getCurrentScope(scopes);
  if (scope === null) return;

  const key = `${collection}.${method}`;
  const hasSeenSearch = scope.has(key);
  if (!hasSeenSearch) {
    scope.set(key, node);
    return;
  }
  context.report({
    node,
    messageId: "repeatedSearch",
    data: { collection, method },
  });
}

function createNoRedundantBooleanLogic(context: RuleContext): RuleListener {
  const equalityOperators = getConfiguredStringSet(context, "equalityOperators", EQUALITY_OPERATORS);
  return {
    BinaryExpression(node) {
      const isConfiguredEquality = equalityOperators.has(String(node.operator));
      if (!isConfiguredEquality) return;

      const leftBoolean = isBooleanLiteral(node.left);
      const rightBoolean = isBooleanLiteral(node.right);
      const hasBooleanOperand = leftBoolean || rightBoolean;
      if (!hasBooleanOperand) return;

      const booleanNode = leftBoolean ? node.left : node.right;
      if (!isRecord(booleanNode)) return;

      context.report({
        node,
        messageId: "booleanComparison",
        data: { value: String(booleanNode.value) },
      });
    },
    ConditionalExpression(node) {
      const consequent = node.consequent;
      const alternate = node.alternate;
      const consequentIsBoolean = isBooleanLiteral(consequent);
      const alternateIsBoolean = isBooleanLiteral(alternate);
      const hasBooleanBranches = consequentIsBoolean && alternateIsBoolean;
      if (!hasBooleanBranches) return;

      const hasComparableBranches = isRecord(consequent) && isRecord(alternate);
      if (!hasComparableBranches) return;

      const hasSameBooleanBranch = consequent.value === alternate.value;
      if (hasSameBooleanBranch) return;

      context.report({ node, messageId: "booleanTernary" });
    },
  };
}

function isCallbackArgument(node: AstNode): boolean {
  const parent = node.parent;
  const isCallParent = isRecord(parent) && parent.type === "CallExpression";
  if (!isCallParent) return false;

  const args = parent.arguments ?? [];
  return Array.isArray(args) && args.includes(node);
}

function getCalleeDisplayName(context: RuleContext, node: MaybeAstNode): string {
  const call = unwrapChainExpression(node);
  const isCallNode = isRecord(call) && call.type === "CallExpression";
  if (!isCallNode) return "the target";

  const callee = unwrapChainExpression(call.callee);
  const isCalleeNode = isRecord(callee);
  if (!isCalleeNode) return "the target";

  const isIdentifierCallee = callee.type === "Identifier";
  if (isIdentifierCallee) return callee.name ?? "the target";

  const text = getNodeText(context, callee);
  const hasText = Boolean(text);
  if (hasText) return text;

  return getMethodName(call) ?? "the target";
}

function checkTrivialWrapperFunction(context: RuleContext, node: AstNode): void {
  const isCallback = isCallbackArgument(node);
  if (isCallback) return;

  const hasSpecialFunctionSemantics = node.async || node.generator;
  if (hasSpecialFunctionSemantics) return;

  const paramNames = getFunctionParamNames(node);
  const hasUnsupportedParams = !paramNames.length && (node.params ?? []).length;
  if (hasUnsupportedParams) return;

  const returned = getSingleReturnExpression(node.body);
  const returnsCall = isRecord(returned) && returned.type === "CallExpression";
  if (!returnsCall) return;

  const args = returned.arguments ?? [];
  const forwardsParams = isSameIdentifierSequence(args, paramNames);
  if (!forwardsParams) return;

  const name = getFunctionName(node);
  const target = getCalleeDisplayName(context, returned);
  const wrapsItself = name === target;
  if (wrapsItself) return;

  context.report({
    node,
    messageId: "trivialWrapper",
    data: { name, target },
  });
}

function createNoTrivialWrapperFunctions(context: RuleContext): RuleListener {
  return createFunctionNodeVisitors((node) => {
    checkTrivialWrapperFunction(context, node);
  });
}

function isNegativeConditionName(name: AstValue): boolean {
  const isStringName = typeof name === "string";
  if (!isStringName) return false;

  const matchesNegativePattern = NEGATIVE_CONDITION_NAME_PATTERN.test(name);
  if (matchesNegativePattern) return true;

  return /^no[A-Z]/.test(name);
}

function reportNegativeConditionNames(context: RuleContext, root: MaybeAstNode): void {
  const isRootNode = isRecord(root);
  if (!isRootNode) return;

  const reported = new Set<string>();
  containsNode(root, (node) => {
    const isIdentifier = node.type === "Identifier";
    if (!isIdentifier) return false;

    const isNegativeName = isNegativeConditionName(node.name);
    if (!isNegativeName) return false;

    const identifierName = node.name;
    if (typeof identifierName !== "string") return false;

    const alreadyReported = reported.has(identifierName);
    if (alreadyReported) return false;

    reported.add(identifierName);
    context.report({
      node,
      messageId: "negativeName",
      data: { name: identifierName },
    });
    return false;
  });
}

function isBooleanishInit(node: MaybeAstNode, booleanOperators: StringSet): boolean {
  const isNode = isRecord(node);
  if (!isNode) return false;

  const isBooleanValue = isBooleanLiteral(node);
  if (isBooleanValue) return true;

  const isNegatedExpression = node.type === "UnaryExpression" && node.operator === "!";
  if (isNegatedExpression) return true;

  const isLogicalExpression = node.type === "LogicalExpression";
  if (isLogicalExpression) return true;

  const isConfiguredBooleanComparison =
    node.type === "BinaryExpression" && booleanOperators.has(String(node.operator));
  if (isConfiguredBooleanComparison) return true;

  const isCallExpression = node.type === "CallExpression";
  if (isCallExpression) return true;

  return node.type === "ConditionalExpression";
}

function createPreferPositiveConditionNames(context: RuleContext): RuleListener {
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
      const isIdentifierDeclaration = isRecord(idNode) && idNode.type === "Identifier";
      if (!isIdentifierDeclaration) return;

      const hasNegativeName = isNegativeConditionName(idNode.name);
      if (!hasNegativeName) return;

      const hasBooleanishInit = isBooleanishInit(node.init, booleanOperators);
      if (!hasBooleanishInit) return;

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

function isSimpleAliasExpression(node: MaybeAstNode): boolean {
  const value = unwrapChainExpression(node);
  const isValueNode = isRecord(value);
  if (!isValueNode) return false;

  const isIdentifier = value.type === "Identifier";
  if (isIdentifier) return true;

  const hasStableObjectKey = Boolean(getStableObjectKey(value));
  return hasStableObjectKey;
}

function isDeclarationIdentifier(node: AstNode, parent: MaybeAstNode): boolean {
  const isParentNode = isRecord(parent);
  if (!isParentNode) return false;

  const isVariableDeclarationId = parent.type === "VariableDeclarator" && parent.id === node;
  if (isVariableDeclarationId) return true;

  const isFunctionId = FUNCTION_NODE_TYPES.has(String(parent.type)) && parent.id === node;
  if (isFunctionId) return true;

  const params = parent.params ?? [];
  const isFunctionParam = Array.isArray(params) && params.includes(node);
  if (isFunctionParam) return true;

  return false;
}

function isReferenceIdentifier(node: AstNode): boolean {
  const parent = node.parent;
  const isDeclaration = isDeclarationIdentifier(node, parent);
  if (isDeclaration) return false;

  const hasParentNode = isRecord(parent);
  if (!hasParentNode) return true;

  const isMemberExpression = parent.type === "MemberExpression";
  const isMemberProperty = parent.property === node;
  const isComputedMember = Boolean(parent.computed);
  const isStaticMemberProperty = isMemberExpression && isMemberProperty && !isComputedMember;
  if (isStaticMemberProperty) {
    return false;
  }

  const isProperty = parent.type === "Property";
  const isPropertyKey = parent.key === node;
  const isPropertyValue = parent.value === node;
  const isComputedProperty = Boolean(parent.computed);
  const isKeyOnlyProperty = isPropertyKey && !isPropertyValue;
  const isStaticPropertyKey = isProperty && isKeyOnlyProperty && !isComputedProperty;
  if (isStaticPropertyKey) {
    return false;
  }

  const isMethodDefinition = parent.type === "MethodDefinition";
  const isMethodKey = parent.key === node;
  const isComputedMethod = Boolean(parent.computed);
  const isMethodName = isMethodDefinition && isMethodKey && !isComputedMethod;
  if (isMethodName) return false;

  const isLabelName = parent.type === "LabeledStatement" && parent.label === node;
  if (isLabelName) return false;

  const isBreakLabel = parent.type === "BreakStatement" && parent.label === node;
  if (isBreakLabel) return false;

  const isContinueLabel = parent.type === "ContinueStatement" && parent.label === node;
  if (isContinueLabel) return false;

  return true;
}

function createNoSingleUseRenamingAlias(context: RuleContext): RuleListener {
  let scopes: AliasScopeStack = [];
  const enterScope = () => {
    scopes = scopes.concat(new Map());
  };
  const exitScope = () => {
    const currentScope = getLastStackItem(scopes);
    scopes = dropLastStackItem(scopes);
    reportSingleUseAliases(context, currentScope);
  };

  return Object.assign({}, createScopeVisitors(enterScope, exitScope), {
    Identifier(node: AstNode) {
      trackAliasReference(scopes, node);
    },
    VariableDeclarator(node: AstNode) {
      trackRenamingAlias(context, scopes, node);
    },
  });
}

function reportSingleUseAliases(context: RuleContext, scope: AliasScope | undefined): void {
  if (scope === undefined) return;

  const candidates = Array.from(scope.values());
  candidates
    .filter((candidate) => candidate.references === 1)
    .forEach((candidate) => {
      context.report({
        node: candidate.node,
        messageId: "singleUseAlias",
        data: { name: candidate.name, target: candidate.target },
      });
    });
}

function findAliasCandidate(scopes: AliasScopeStack, name: string): AliasCandidate | undefined {
  const candidate = scopes
    .slice()
    .reverse()
    .map((scope) => scope.get(name))
    .find(Boolean);
  return candidate;
}

function trackAliasReference(scopes: AliasScopeStack, node: AstNode): void {
  const isReference = isReferenceIdentifier(node);
  if (!isReference) return;

  const name = node.name;
  const hasName = typeof name === "string";
  if (!hasName) return;

  const candidate = findAliasCandidate(scopes, name);
  if (candidate === undefined) return;

  candidate.references += 1;
}

function trackRenamingAlias(context: RuleContext, scopes: AliasScopeStack, node: AstNode): void {
  const idNode = node.id;
  const isIdentifierDeclaration = isRecord(idNode) && idNode.type === "Identifier";
  if (!isIdentifierDeclaration) return;

  const isSimpleAlias = isSimpleAliasExpression(node.init);
  if (!isSimpleAlias) return;

  const scope = scopes[scopes.length - 1];
  if (scope === undefined) return;

  const target = getNodeText(context, node.init) || getStableObjectKey(node.init) || "value";
  const aliasName = idNode.name;
  if (typeof aliasName !== "string") return;

  const aliasesItself = target === aliasName;
  if (aliasesItself) return;

  scope.set(aliasName, {
    name: aliasName,
    node,
    references: 0,
    target,
  });
}

function checkFunctionForGuardClause(context: RuleContext, node: AstNode): void {
  const body = node.body;
  const isBlockBody = isRecord(body) && body.type === "BlockStatement";
  if (!isBlockBody) return;

  const statements = getNodeArray(body.body);
  const hasSingleStatement = statements.length === 1;
  if (!hasSingleStatement) return;

  const onlyStatement = statements[0];
  const isOnlyStatementIf = isRecord(onlyStatement) && onlyStatement.type === "IfStatement";
  if (!isOnlyStatementIf) return;

  const hasAlternate = Boolean(onlyStatement.alternate);
  if (hasAlternate) return;

  const consequent = onlyStatement.consequent;
  const hasBlockConsequent = isRecord(consequent) && consequent.type === "BlockStatement";
  if (!hasBlockConsequent) return;

  const hasMainPathStatements = getNodeArray(consequent.body).length >= 2;
  if (!hasMainPathStatements) return;

  const exitsAlready = alwaysExits(consequent);
  if (exitsAlready) return;

  context.report({ node: onlyStatement, messageId: "preferGuard" });
}

function createPreferGuardClauses(context: RuleContext): RuleListener {
  return createFunctionNodeVisitors((node) => {
    checkFunctionForGuardClause(context, node);
  });
}

function createNoUnnecessaryBlockCallback(context: RuleContext): RuleListener {
  return {
    ArrowFunctionExpression(node) {
      checkUnnecessaryBlockCallback(context, node);
    },
  };
}

function checkUnnecessaryBlockCallback(context: RuleContext, node: AstNode): void {
  const isCallback = isCallbackArgument(node);
  if (!isCallback) return;

  const body = node.body;
  const hasBlockBody = isRecord(body) && body.type === "BlockStatement";
  if (!hasBlockBody) return;

  const statements = getNodeArray(body.body);
  const hasSingleStatement = statements.length === 1;
  if (!hasSingleStatement) return;

  const statement = statements[0];
  const isReturnStatement = isRecord(statement) && statement.type === "ReturnStatement";
  if (!isReturnStatement) return;

  context.report({ node: body, messageId: "unnecessaryBlock" });
}

function isFlatOneCall(node: AstNode): boolean {
  const isFlatCall = isMethodCall(node, FLAT_METHODS);
  if (!isFlatCall) return false;

  const args = node.arguments ?? [];
  const hasDepthArg = Boolean(args.length);
  if (!hasDepthArg) return true;

  const [depth] = args;
  const isFlatOneDepth = isRecord(depth) && depth.type === "Literal" && depth.value === 1;
  return isFlatOneDepth;
}

function createPreferFlatMap(context: RuleContext): RuleListener {
  return {
    CallExpression(node) {
      checkFlatMapPreference(context, node);
    },
  };
}

function checkFlatMapPreference(context: RuleContext, node: AstNode): void {
  const isFlatOne = isFlatOneCall(node);
  if (!isFlatOne) return;

  const receiver = getMemberObject(node);
  const followsMap = isMethodCall(receiver, MAP_METHODS);
  if (!followsMap) return;

  context.report({ node, messageId: "preferFlatMap" });
}

function createNoIdentityArrayCallback(context: RuleContext): RuleListener {
  return {
    CallExpression(node) {
      checkIdentityArrayCallback(context, node);
    },
  };
}

function checkIdentityArrayCallback(context: RuleContext, node: AstNode): void {
  const method = getMethodName(node);
  const isSupportedMethod = method === "map" || method === "filter";
  if (!isSupportedMethod) return;

  const callback = getCallbackFunction(node);
  if (callback === null) return;

  const returned = getSingleReturnExpression(callback.body);
  const hasReturnedNode = isRecord(returned);
  if (!hasReturnedNode) return;

  const isAlwaysTrueFilter = method === "filter" && isBooleanLiteral(returned, true);
  if (isAlwaysTrueFilter) {
    context.report({ node, messageId: "alwaysTrueFilter" });
    return;
  }

  const [firstParam] = getFunctionParamNames(callback);
  const hasFirstParam = Boolean(firstParam);
  if (!hasFirstParam) return;

  const isMap = method === "map";
  if (!isMap) return;

  const returnsSameIdentifier = returned.type === "Identifier" && returned.name === firstParam;
  if (!returnsSameIdentifier) return;

  context.report({ node, messageId: "identityMap" });
}

function createNoRedundantNullishFallback(context: RuleContext): RuleListener {
  return {
    LogicalExpression(node) {
      const isNullishFallback = node.operator === "??";
      if (!isNullishFallback) return;

      const fallsBackToUndefined = isUndefinedExpression(node.right);
      if (!fallsBackToUndefined) return;

      context.report({ node, messageId: "redundantUndefined" });
    },
  };
}

function getEqualityLookupPart(node: MaybeAstNode, operators: StringSet): LookupPart | null {
  const isBinaryExpression = isRecord(node) && node.type === "BinaryExpression";
  if (!isBinaryExpression) return null;

  const isConfiguredOperator = operators.has(String(node.operator));
  if (!isConfiguredOperator) return null;

  const leftKey = getStableObjectKey(node.left);
  const rightKey = getStableObjectKey(node.right);
  const hasLeftLookup = leftKey && isLiteralLookupValue(node.right);
  if (hasLeftLookup) {
    return { key: leftKey, node };
  }

  const hasRightLookup = rightKey && isLiteralLookupValue(node.left);
  if (hasRightLookup) {
    return { key: rightKey, node };
  }

  return null;
}

function collectEqualityLookupParts(node: MaybeAstNode, operators: StringSet): LookupPart[] {
  const isNode = isRecord(node);
  if (!isNode) return [];

  const isOrChain = node.type === "LogicalExpression" && node.operator === "||";
  if (isOrChain) {
    return collectEqualityLookupParts(node.left, operators).concat(
      collectEqualityLookupParts(node.right, operators),
    );
  }

  const part = getEqualityLookupPart(node, operators);
  return part ? [part] : [];
}

function createPreferObjectLookup(context: RuleContext): RuleListener {
  const min = getConfiguredNumber(context, "min", DEFAULT_MIN_OBJECT_LOOKUP_CHAIN_LENGTH);
  const operators = getConfiguredStringSet(context, "operators", OBJECT_LOOKUP_OPERATORS);
  return {
    LogicalExpression(node) {
      checkObjectLookupPreference(context, node, operators, min);
    },
  };
}

function isNestedLogicalOr(node: AstNode): boolean {
  const parent = node.parent;
  const isNestedOr =
    isRecord(parent) && parent.type === "LogicalExpression" && parent.operator === "||";
  return isNestedOr;
}

function checkObjectLookupPreference(
  context: RuleContext,
  node: AstNode,
  operators: StringSet,
  min: number,
): void {
  const isOrExpression = node.operator === "||";
  if (!isOrExpression) return;

  const isNestedOrExpression = isNestedLogicalOr(node);
  if (isNestedOrExpression) return;

  const parts = collectEqualityLookupParts(node, operators);
  const hasEnoughParts = parts.length >= min;
  if (!hasEnoughParts) return;

  const [firstPart] = parts;
  if (!firstPart) return;

  const checksSameKey = parts.every((part) => part.key === firstPart.key);
  if (!checksSameKey) return;

  context.report({
    node,
    messageId: "preferLookup",
    data: { name: firstPart.key },
  });
}

function createRequireFilenameMatchesDirname(context: RuleContext): RuleListener {
  return {
    Program(node: AstNode) {
      const minDepth = getConfiguredNumber(context, "minDepth", DEFAULT_MIN_DIRNAME_MATCH_DEPTH);
      const allowedQualifiers = getConfiguredStringSet(context, "allowedQualifiers", DEFAULT_ALLOWED_FILENAME_QUALIFIERS);
      const allowedFilenames = getConfiguredStringSet(context, "allowedFilenames", DEFAULT_ALLOWED_STANDALONE_FILENAMES);

      const cwd = context.cwd;
      const filename = context.filename;
      if (!cwd) return;
      if (!filename) return;

      const relativePath = relative(cwd, filename);
      const parts = relativePath.split(/[/\\]/);
      const parentDepth = parts.length - 1;

      const isTooShallow = parentDepth < minDepth;
      if (isTooShallow) return;

      const parentDirName = parts[parentDepth - 1];
      if (!parentDirName) return;

      const rawBasename = basename(filename);
      const withoutLeadingDot = rawBasename.startsWith(".") ? rawBasename.slice(1) : rawBasename;
      const lastDot = withoutLeadingDot.lastIndexOf(".");
      const withoutLastExt = lastDot >= 0 ? withoutLeadingDot.slice(0, lastDot) : withoutLeadingDot;
      const nameParts = withoutLastExt.split(".");
      const baseName = nameParts[0];
      if (!baseName) return;
      const qualifiers = nameParts.slice(1);

      const isAllowedFilename = allowedFilenames.has(baseName);
      if (isAllowedFilename) return;

      const matchesDirName = baseName === parentDirName;
      if (!matchesDirName) {
        context.report({ node, messageId: "mismatch", data: { name: withoutLastExt, dir: parentDirName } });
        return;
      }

      const unknownQualifier = qualifiers.find((q) => !allowedQualifiers.has(q));
      if (!unknownQualifier) return;

      const allowed = Array.from(allowedQualifiers).join(", ");
      context.report({ node, messageId: "unknownQualifier", data: { qualifier: unknownQualifier, name: withoutLastExt, allowed } });
    },
  };
}

function createNoMixedFilenameCasing(context: RuleContext): RuleListener {
  return {
    Program(node: AstNode) {
      const filename = context.filename;
      if (!filename) return;
      const raw = basename(filename);
      const stripped = raw.startsWith(".") ? raw.slice(1) : raw;
      const name = stripped.includes(".") ? stripped.slice(0, stripped.indexOf(".")) : stripped;
      const characterLookup = new Set(name);

      const hasHyphens = characterLookup.has("-");
      const hasUnderscores = characterLookup.has("_");
      const hasUppercase = /[A-Z]/.test(name);
      const hasLowercase = /[a-z]/.test(name);

      const mixesHyphenWithUpper = hasHyphens && hasUppercase;
      const mixesUnderscoreWithMixedCase = hasUnderscores && hasUppercase && hasLowercase;
      const mixesSeparators = hasHyphens && hasUnderscores;
      const isMixed = mixesHyphenWithUpper || mixesUnderscoreWithMixedCase || mixesSeparators;

      if (!isMixed) return;
      context.report({ node, messageId: "mixedCasing", data: { name } });
    },
  };
}

const rules = {
  "hoist-if-operators": defineRule(HOIST_IF_OPERATORS_META, createHoistIfOperators),
  "max-array-chain-depth": defineRule(MAX_ARRAY_CHAIN_DEPTH_META, createMaxArrayChainDepth),
  "max-control-flow-depth": defineRule(MAX_CONTROL_FLOW_DEPTH_META, createControlFlowVisitors),
  "max-expression-operators": defineRule(
    MAX_EXPRESSION_OPERATORS_META,
    createMaxExpressionOperators,
  ),
  "no-automated-comment-attribution": defineRule(
    NO_AUTOMATED_COMMENT_ATTRIBUTION_META,
    createNoAutomatedCommentAttribution,
  ),
  "no-complex-ternaries": defineRule(NO_COMPLEX_TERNARIES_META, createNoComplexTernaries),
  "no-computed-values": defineRule(NO_COMPUTED_VALUES_META, createNoComputedValues),
  "no-direct-node-bin-smoke": defineRule(NO_DIRECT_NODE_BIN_SMOKE_META, createNoDirectNodeBinSmoke),
  "no-hidden-side-effects": defineRule(NO_HIDDEN_SIDE_EFFECTS_META, createNoHiddenSideEffects),
  "no-mixed-filename-casing": defineRule(NO_MIXED_FILENAME_CASING_META, createNoMixedFilenameCasing),
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
  "no-unmatched-comments": defineRule(
    NO_UNMATCHED_COMMENTS_META,
    createNoUnmatchedComments,
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
  "require-filename-matches-dirname": defineRule(
    REQUIRE_FILENAME_MATCHES_DIRNAME_META,
    createRequireFilenameMatchesDirname,
  ),
  "require-jsdoc-multiline-comments": defineRule(
    REQUIRE_JSDOC_MULTILINE_COMMENTS_META,
    createRequireJsdocMultilineComments,
  ),
};

function buildRuleConfig(
  ruleNames: readonly string[],
  level: RuleLevel,
): Record<string, RuleLevel> {
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

export default plugin;
export { plugin as "module.exports" };
