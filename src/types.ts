export type Severity = "off" | "warn" | "error" | 0 | 1 | 2;

export type OperatorComplexity = Record<string, number>;

export type StringSet = ReadonlySet<string>;

export type RuleLevel = "warn" | "error";

export type PrimitiveOptionValue = string | number | boolean | null;

export interface RuleOptionRecord {
  readonly [key: string]: RuleOptionValue;
}

export type RuleOptionValue =
  | PrimitiveOptionValue
  | RuleOptionRecord
  | readonly RuleOptionValue[];

export type RuleOptions = readonly RuleOptionValue[];

export type RuleConfig = Severity | readonly [Severity, ...RuleOptions];

export type RuleCreate = (context: RuleContext) => RuleListener;

export type RuleVisitor = (node: AstNode) => void;

export type RuleListener = Record<string, RuleVisitor>;

export interface SourceCodeLike {
  text?: string;
  getText(node?: AstNode): string;
}

export interface RuleReport {
  node: AstNode;
  messageId: string;
  data?: RuleReportData;
}

export type RuleReportData = Record<string, string | number | boolean | null | undefined>;

export interface RuleContext {
  cwd?: string;
  filename?: string;
  options?: RuleOptions;
  sourceCode?: SourceCodeLike;
  getCwd?: () => string;
  getFilename?: () => string;
  getSourceCode?: () => SourceCodeLike;
  report(report: RuleReport): void;
}

export type AstPrimitive = string | number | boolean | bigint | null | undefined;

export interface AstValueRecord {
  [key: string]: AstValue;
}

export type AstValue = AstNode | AstValueRecord | AstPrimitive | AstValue[];

export type MaybeAstNode = AstNode | null | undefined;

export interface AstNode {
  [key: string]: AstValue;
  __text?: string;
  alternate?: AstNode | null;
  argument?: AstNode | null;
  arguments?: AstNode[];
  async?: boolean;
  body?: AstNode | AstNode[];
  callee?: AstNode;
  computed?: boolean;
  consequent?: AstNode;
  elements?: Array<AstNode | null>;
  expression?: AstNode;
  expressions?: AstNode[];
  generator?: boolean;
  id?: AstNode | null;
  init?: AstNode | null;
  key?: AstNode;
  label?: AstNode | null;
  left?: AstNode;
  name?: string;
  object?: AstNode;
  operator?: string;
  parent?: AstNode;
  params?: AstNode[];
  properties?: AstNode[];
  property?: AstNode;
  quasis?: AstNode[];
  raw?: string;
  right?: AstNode;
  test?: AstNode;
  type?: string;
  update?: AstNode | null;
  value?: AstValue;
}

export interface LookupPart {
  key: string;
  node: AstNode;
}

export interface RuleMeta {
  type: "problem" | "suggestion" | "layout";
  docs?: {
    description?: string;
    recommended?: boolean;
    url?: string;
  };
  schema?: RuleSchema;
  messages: Record<string, string>;
}

export type RuleSchema = RuleOptionValue | readonly RuleOptionValue[];

export interface RuleModule {
  meta: RuleMeta;
  create: RuleCreate;
}

export interface AliasCandidate {
  name: string;
  node: AstNode;
  references: number;
  target: string;
}

export type NodePredicate = (node: AstNode) => boolean;

export type TraversableEntry = [string, AstValue];

export type LoopStack = AstNode[];

export type NodeScope = Map<string, AstNode>;

export type ScopeStack = NodeScope[];

export type AliasScope = Map<string, AliasCandidate>;

export type AliasScopeStack = AliasScope[];

export interface FunctionDepthFrame {
  depth: number;
  stackLength: number;
}

export type ScopeCallback = () => void;

export interface LegacyConfig {
  plugins: string[];
  rules: Record<string, RuleConfig>;
}

export interface FlatConfig {
  plugins: Record<string, LegibilityPlugin>;
  rules: Record<string, RuleConfig>;
}

export interface LegibilityPlugin {
  meta: {
    name: "legibility";
    version: string;
  };
  rules: Record<string, RuleModule>;
  configs: {
    recommended: LegacyConfig;
    strict: LegacyConfig;
    "flat/recommended": FlatConfig;
    "flat/strict": FlatConfig;
  };
}
