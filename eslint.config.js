const js = require("@eslint/js");
const legibility = require("./index.js");

module.exports = [
  {
    ignores: ["coverage/**", "node_modules/**", "pnpm-lock.yaml"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        module: "readonly",
        require: "readonly",
        process: "readonly",
      },
    },
    plugins: {
      legibility,
    },
    rules: {
      "legibility/no-direct-node-bin-smoke": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
];
