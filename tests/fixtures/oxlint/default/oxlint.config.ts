import { defineConfig } from "oxlint";

const jsPlugin = {
  name: "legibility",
  specifier: "eslint-plugin-legibility",
};

export default defineConfig({
  jsPlugins: [jsPlugin],
  rules: {
    "legibility/max-function-parameters": "error",
    "legibility/no-complex-ternaries": "error",
    "legibility/prefer-early-return": "error",
    "legibility/prefer-flat-map": "error",
    "legibility/prefer-object-lookup": "error",
  },
});
