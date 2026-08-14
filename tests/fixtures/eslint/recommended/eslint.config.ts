import legibility from "eslint-plugin-legibility";
import tseslint from "typescript-eslint";

const preset = legibility.configs["flat/recommended"];

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: preset.plugins,
    rules: preset.rules,
  },
];
