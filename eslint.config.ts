import js from "@eslint/js";
import legibility from "./dist/index.js";
import tseslint from "typescript-eslint";

const strictLegibilityConfig = legibility.configs["flat/strict"];

export default [
  {
    ignores: [
      ".build/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "pnpm-lock.yaml",
      "tests/fixtures/oxlint/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["bin/**/*.js", "scripts/**/*.ts", "src/**/*.ts"],
    languageOptions: {
      globals: { process: "readonly" },
    },
    plugins: strictLegibilityConfig.plugins,
    rules: Object.assign({}, strictLegibilityConfig.rules, {
      "legibility/require-executable-shebang": [
        "error",
        { files: ["bin/lint-changed.js", "scripts/lint-changed.node.ts"] },
      ],
    }),
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      legibility,
    },
    rules: {
      "legibility/no-direct-node-bin-smoke": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
];
