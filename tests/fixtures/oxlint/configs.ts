import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const oxlintConfigFilename = "oxlint.config.mjs";
export const oxlintFixtureRoot = "tests/fixtures/oxlint";

export interface OxlintFixtureConfig {
  content: string;
  directory: string;
}

export function getOxlintFixtureConfigs(): OxlintFixtureConfig[] {
  return [
    { directory: "default", content: createDefaultOxlintConfig() },
    { directory: "recommended", content: createPresetOxlintConfig("recommended") },
    { directory: "strict", content: createPresetOxlintConfig("strict") },
    { directory: "opt-in", content: createOptInOxlintConfig() },
  ];
}

export function writeOxlintFixtureConfigs(root = oxlintFixtureRoot): void {
  const writeConfig = (config: OxlintFixtureConfig): void =>
    writeOxlintFixtureConfig(root, config);

  getOxlintFixtureConfigs().forEach(writeConfig);
}

function writeOxlintFixtureConfig(root: string, config: OxlintFixtureConfig): void {
  const directory = join(root, config.directory);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, oxlintConfigFilename), config.content);
}

function isDirectRun(argvPath = process.argv[1]): boolean {
  if (!argvPath) return false;
  return import.meta.url === pathToFileURL(resolve(argvPath)).href;
}

function createOxlintConfigHeader(): string {
  return [
    'import { defineConfig } from "oxlint";',
    "",
    'import legibility from "eslint-plugin-legibility/oxlint";',
    "",
  ].join("\n");
}

function createPresetOxlintConfig(name: string): string {
  return `${createOxlintConfigHeader()}export default defineConfig(legibility.configs.${name});\n`;
}

function createDefaultOxlintConfig(): string {
  const rules = [
    '"legibility/max-function-parameters": "error"',
    '"legibility/no-complex-ternaries": "error"',
    '"legibility/prefer-early-return": "error"',
    '"legibility/prefer-flat-map": "error"',
    '"legibility/prefer-object-lookup": "error"',
  ];
  return createObjectOxlintConfig(rules);
}

function createObjectOxlintConfig(rules: string[]): string {
  const ruleLines = rules.map((rule) => `    ${rule},`).join("\n");
  return `${createOxlintConfigHeader()}export default defineConfig({
  jsPlugins: legibility.configs.strict.jsPlugins,
  rules: {
${ruleLines}
  },
});
`;
}

function createOptInOxlintConfig(): string {
  return `${createOxlintConfigHeader()}const preset = legibility.configs.strict;
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

export default defineConfig({
  ignorePatterns: ["oxlint.config.mjs"],
  jsPlugins: preset.jsPlugins,
  rules: Object.assign({}, preset.rules, optInRules),
});
`;
}

if (isDirectRun()) {
  writeOxlintFixtureConfigs();
}
