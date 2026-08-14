import legibility from "eslint-plugin-legibility";
import tseslint from "typescript-eslint";

const preset = legibility.configs["flat/strict"];
const optInRules = {
  "legibility/no-unmatched-comments": "error",
  "legibility/prefer-concat-object-assign": "error",
  "legibility/require-executable-shebang": [
    "error",
    { files: ["**/button.ts"] },
  ],
  "legibility/require-filename-matches-dirname": [
    "error",
    { schema: "index", minDepth: 1 },
  ],
};

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: preset.plugins,
    rules: Object.assign({}, preset.rules, optInRules),
  },
];
