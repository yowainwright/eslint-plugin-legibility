import { defineConfig } from "oxlint";

import legibility from "eslint-plugin-legibility";

export default defineConfig(legibility.configs["oxlint/recommended"]);
