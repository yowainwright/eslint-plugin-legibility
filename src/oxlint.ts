import { eslintCompatPlugin } from "@oxlint/plugins";
import type { Plugin as OxlintRuntimePlugin } from "@oxlint/plugins";

import plugin from "./index.js";
import type { OxlintConfig, OxlintLegibilityPlugin, RuleModule } from "./types.js";

const OXLINT_EXPORT_SPECIFIER = "eslint-plugin-legibility/oxlint";

function withOxlintSpecifier(config: OxlintConfig): OxlintConfig {
  const jsPlugin = { name: plugin.meta.namespace, specifier: OXLINT_EXPORT_SPECIFIER };
  const rules = Object.assign({}, config.rules);
  return { jsPlugins: [jsPlugin], rules };
}

function createOxlintRules(): Record<string, RuleModule> {
  const entries = Object.entries(plugin.rules).map(([name, rule]) => {
    const oxlintRule = { meta: rule.meta, createOnce: rule.createOnce };
    return [name, oxlintRule] as const;
  });
  return Object.fromEntries(entries);
}

const oxlintPluginBase: OxlintLegibilityPlugin = {
  meta: plugin.meta,
  rules: createOxlintRules(),
  configs: {
    recommended: withOxlintSpecifier(plugin.configs["oxlint/recommended"]),
    strict: withOxlintSpecifier(plugin.configs["oxlint/strict"]),
    agentRecommended: withOxlintSpecifier(plugin.configs["oxlint/agent-recommended"]),
    agentStrict: withOxlintSpecifier(plugin.configs["oxlint/agent-strict"]),
  },
};
const oxlintPlugin = eslintCompatPlugin(
  oxlintPluginBase as unknown as OxlintRuntimePlugin,
) as unknown as OxlintLegibilityPlugin;

export default oxlintPlugin;
export { oxlintPlugin as "module.exports" };
