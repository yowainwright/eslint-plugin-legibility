import { defineConfig } from "oxlint";

import legibility from "eslint-plugin-legibility";

const preset = legibility.configs["oxlint/strict"];
const optInRules = {
  "legibility/no-unmatched-comments": "error",
  "legibility/require-filename-matches-dirname": [
    "error",
    { schema: "index", minDepth: 1 },
  ],
};

export default defineConfig({
  ignorePatterns: ["oxlint.config.ts"],
  jsPlugins: preset.jsPlugins,
  rules: Object.assign({}, preset.rules, optInRules),
});
