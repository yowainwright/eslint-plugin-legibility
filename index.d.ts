declare namespace Legibility {
  type Severity = "off" | "warn" | "error" | 0 | 1 | 2;

  interface RuleMeta {
    type: "problem" | "suggestion" | "layout";
    docs?: {
      description?: string;
      recommended?: boolean;
      url?: string;
    };
    schema?: unknown;
    messages: Record<string, string>;
  }

  interface RuleModule {
    meta: RuleMeta;
    create(context: unknown): Record<string, unknown>;
  }

  interface LegacyConfig {
    plugins: string[];
    rules: Record<string, Severity | [Severity, unknown]>;
  }

  interface FlatConfig {
    plugins: Record<string, LegibilityPlugin>;
    rules: Record<string, Severity | [Severity, unknown]>;
  }

  interface LegibilityPlugin {
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
}

declare const plugin: Legibility.LegibilityPlugin;

export = plugin;
