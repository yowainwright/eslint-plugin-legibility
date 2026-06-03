export type Severity = "off" | "warn" | "error" | 0 | 1 | 2;

export interface RuleMeta {
  type: "problem" | "suggestion" | "layout";
  docs?: {
    description?: string;
    recommended?: boolean;
    url?: string;
  };
  schema?: unknown;
  messages: Record<string, string>;
}

export interface RuleModule {
  meta: RuleMeta;
  create(context: unknown): Record<string, unknown>;
}

export interface LegacyConfig {
  plugins: string[];
  rules: Record<string, Severity | [Severity, unknown]>;
}

export interface FlatConfig {
  plugins: Record<string, LegibilityPlugin>;
  rules: Record<string, Severity | [Severity, unknown]>;
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
