import legibility from "eslint-plugin-legibility";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { legibility },
    rules: {
      "legibility/max-function-parameters": "error",
      "legibility/no-complex-ternaries": "error",
      "legibility/prefer-early-return": "error",
      "legibility/prefer-flat-map": "error",
      "legibility/prefer-object-lookup": "error",
    },
  },
];
