# eslint plugin legibility

<!-- package badges from package.json and GitHub workflows -->
[![npm version](https://img.shields.io/npm/v/eslint-plugin-legibility.svg)](https://www.npmjs.com/package/eslint-plugin-legibility)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-legibility.svg)](https://www.npmjs.com/package/eslint-plugin-legibility)
![CI](https://github.com/yowainwright/eslint-plugin-legibility/actions/workflows/ci.yml/badge.svg)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/yowainwright/eslint-plugin-legibility/badge)](https://scorecard.dev/viewer/?uri=github.com/yowainwright/eslint-plugin-legibility)
[![codecov](https://codecov.io/gh/yowainwright/eslint-plugin-legibility/branch/main/graph/badge.svg)](https://codecov.io/gh/yowainwright/eslint-plugin-legibility)
[![GitHub stars](https://img.shields.io/github/stars/yowainwright/eslint-plugin-legibility?style=social)](https://github.com/yowainwright/eslint-plugin-legibility)

## Why was this written?

> Working with LLM's for the majority of my work, I find the way that I code and read code has changed. This project contains rules I find useful for keeping Typescript and/or JavaScript more readable when written mainly by LLMs's. 

## TLDR;

The goal of rules in this package are to make code readable for reviewing lots of code and avoiding things that have a high probability of complexity or confusion. 

---

## Install

This project provides ESLint and Oxlint-compatible rules for readable, explicit, performance-conscious JavaScript and TypeScript.

The package exports an ESLint-compatible plugin object. ESLint can load it as a normal plugin, and Oxlint can load the same package through JavaScript plugin support. 

```sh
# npm, pnpm, bun
npm add -D eslint-plugin-legibility
```

---

## Configs

Choose one flat config preset.

### `flat/recommended`

Enables the bundled rules and core complexity limits as warnings.

```ts
import legibility from "eslint-plugin-legibility";

export default [legibility.configs["flat/recommended"]];
```

### `flat/strict`

Enables the same rules and core complexity limits as errors.

```ts
import legibility from "eslint-plugin-legibility";

export default [legibility.configs["flat/strict"]];
```

Both presets configure these ESLint core rules:

- `complexity`: `max: 20`, using the `classic` variant.
- `max-lines-per-function`: `max: 40`, excluding blank lines and comments and including IIFEs.

---

## Development

The repository uses Mise for Node 26 and Nub for pnpm 11. Nub keeps `pnpm-lock.yaml` as the package-manager source of truth.

```sh
nub install --frozen-lockfile
nub run validate
```

---

## Rules

Both presets enable the same rules. `flat/recommended` uses warnings; `flat/strict` uses errors. `no-unmatched-comments` is opt-in because it is intended for temporary no-comment sessions and repositories that define an explicit comment allow list.

<!-- rule section links grouped by preset membership from src/constants.ts -->
<details>
<summary>Rule table of contents</summary>

**Recommended and strict**

- [`legibility/hoist-if-operators`](#hoist-if-operators)
- [`legibility/max-array-chain-depth`](#max-array-chain-depth)
- [`legibility/max-control-flow-depth`](#max-control-flow-depth)
- [`legibility/max-expression-operators`](#max-expression-operators)
- [`legibility/max-function-parameters`](#max-function-parameters)
- [`legibility/no-complex-ternaries`](#no-complex-ternaries)
- [`legibility/no-computed-values`](#no-computed-values)
- [`legibility/no-direct-node-bin-smoke`](#no-direct-node-bin-smoke)
- [`legibility/no-hidden-side-effects`](#no-hidden-side-effects)
- [`legibility/no-identity-array-callback`](#no-identity-array-callback)
- [`legibility/no-mixed-filename-casing`](#no-mixed-filename-casing)
- [`legibility/no-automated-comment-attribution`](#no-automated-comment-attribution)
- [`legibility/no-quadratic-patterns`](#no-quadratic-patterns)
- [`legibility/no-redundant-boolean-logic`](#no-redundant-boolean-logic)
- [`legibility/no-redundant-nullish-fallback`](#no-redundant-nullish-fallback)
- [`legibility/no-small-collection-conversion`](#no-small-collection-conversion)
- [`legibility/no-standalone-array-mutations`](#no-standalone-array-mutations)
- [`legibility/no-stacked-comments`](#no-stacked-comments)
- [`legibility/no-trivial-wrapper-functions`](#no-trivial-wrapper-functions)
- [`legibility/no-unnecessary-async`](#no-unnecessary-async)
- [`legibility/no-unnecessary-block-callback`](#no-unnecessary-block-callback)
- [`legibility/prefer-concat-object-assign`](#prefer-concat-object-assign)
- [`legibility/prefer-early-return`](#prefer-early-return)
- [`legibility/prefer-flat-map`](#prefer-flat-map)
- [`legibility/prefer-guard-clauses`](#prefer-guard-clauses)
- [`legibility/prefer-object-lookup`](#prefer-object-lookup)
- [`legibility/require-executable-shebang`](#require-executable-shebang)
- [`legibility/require-filename-matches-dirname`](#require-filename-matches-dirname)
- [`legibility/require-jsdoc-multiline-comments`](#require-jsdoc-multiline-comments)

**Strict only**

- [`legibility/no-repeated-collection-search`](#no-repeated-collection-search)
- [`legibility/no-single-use-renaming-alias`](#no-single-use-renaming-alias)
- [`legibility/prefer-positive-condition-names`](#prefer-positive-condition-names)

**Opt-in comment policy**

- [`legibility/no-unmatched-comments`](#no-unmatched-comments)

</details>

---

<a id="hoist-if-operators"></a>

### `legibility/hoist-if-operators({options})`

Prefer a named boolean before an operator-heavy `if` condition.

#### options

- `{max: number}`: allowed weighted operators in the condition. Default: `0`.
- `{operators: string[]}`: operators to count. Default: `["&&", "||", "??", "?:"]`.
- `{complexity: Record<string, number>}`: per-operator weights.

#### do / don't

```diff
- if (user && user.isActive && !user.isLocked) {
-   sendInvite(user);
- }
+ const canInviteUser = user && user.isActive && !user.isLocked;
+
+ if (canInviteUser) {
+   sendInvite(user);
+ }
```

---

<a id="max-array-chain-depth"></a>

### `legibility/max-array-chain-depth({options})`

Limit chained array methods like `items.filter().map().some()`.

#### options

- `{max: number}`: allowed chained items. Default: `2`.
- `{iterationMethods: string[]}`: method names that count as chain items.

#### do / don't

```diff
- const hasLargeActiveItem = items
-   .filter((item) => item.active)
-   .map((item) => item.size)
-   .some((size) => size > 100);
+ const activeItems = items.filter((item) => item.active);
+ const itemSizes = activeItems.map((item) => item.size);
+ const hasLargeActiveItem = itemSizes.some((size) => size > 100);
```

---

<a id="max-control-flow-depth"></a>

### `legibility/max-control-flow-depth({options})`

Limit nested branches and loops.

#### options

- `{max: number}`: allowed nested control-flow depth. Default: `3`.

#### do / don't

```diff
- if (user) {
-   if (user.active) {
-     if (user.email) {
-       sendInvite(user);
-     }
-   }
- }
+ if (!user) return;
+ if (!user.active) return;
+ if (!user.email) return;
+
+ sendInvite(user);
```

---

<a id="max-expression-operators"></a>

### `legibility/max-expression-operators({options})`

Limit operators inside one expression.

#### options

- `{max: number}`: allowed weighted operators. Default: `4`.
- `{operators: string[]}`: operators to count.
- `{complexity: Record<string, number>}`: per-operator weights.

#### do / don't

```diff
- return user && user.active && (user.role === "admin" || user.role === "owner");
+ const isAdmin = user.role === "admin";
+ const isOwner = user.role === "owner";
+ const hasPrivilegedRole = isAdmin || isOwner;
+
+ return user && user.active && hasPrivilegedRole;
```

---

<a id="max-function-parameters"></a>

### `legibility/max-function-parameters({options})`

Limit the inputs a function exposes. The rule checks both top-level parameters and the properties listed by each destructured object parameter.

TypeScript ambient declarations and function types are checked. A leading TypeScript `this` parameter is ignored because callers do not supply it.

#### options

- `{max: number}`: allowed top-level parameters. Default: `4`.
- `{maxObjectProperties: number}`: allowed properties in one destructured object parameter. Default: `8`.

#### do / don't

```diff
- function schedule(user, plan, timezone, locale, notify) {}
+ function schedule(request, deliveryOptions) {}

- function publish({ article, author, channel, locale, schedule, tags, theme, tracking, visibility }) {}
+ function publish(article, publicationOptions) {}
```

---

<a id="no-complex-ternaries"></a>

### `legibility/no-complex-ternaries({options})`

Reject nested ternaries and operator-heavy ternaries.

#### options

- `{max: number}`: allowed weighted operators inside one ternary. Default: `2`.
- `{operators: string[]}`: operators to count.
- `{complexity: Record<string, number>}`: per-operator weights.

#### do / don't

```diff
- const label = isLoading ? "Loading" : hasError ? "Error" : "Ready";
+ const label = getStatusLabel({ hasError, isLoading });
```

---

<a id="no-computed-values"></a>

### `legibility/no-computed-values({options})`

Prefer named values before computed returns and object values.

#### options

- `{max: number}`: allowed weighted operators in a computed value. Default: `1`.
- `{operators: string[]}`: operators to count.
- `{complexity: Record<string, number>}`: per-operator weights.

#### do / don't

```diff
- return subtotal + tax - discount;
+ const total = subtotal + tax - discount;
+
+ return total;
```

---

<a id="no-direct-node-bin-smoke"></a>

### `legibility/no-direct-node-bin-smoke({options})`

Smoke-test installed package bins instead of direct `node src/index.js` execution.

#### options

- `{entryPatterns: string[]}`: entry files that should be tested through the installed bin shim.

#### do / don't

```diff
- execSync("node src/index.js --help");
+ execSync("my-cli --help");
```

---

<a id="no-hidden-side-effects"></a>

### `legibility/no-hidden-side-effects({options})`

Keep mutations out of nested expressions and side-effect-free callbacks.

#### options

- `{mutatingMethods: string[]}`: method calls treated as mutations.
- `{sideEffectFreeIterationMethods: string[]}`: callback methods expected to stay side-effect-free.

#### do / don't

```diff
- return (count += 1);
+ count += 1;
+
+ return count;
```

---

<a id="no-identity-array-callback"></a>

### `legibility/no-identity-array-callback()`

Reject `map` and `filter` callbacks that keep every item unchanged.

#### do / don't

```diff
- const nextItems = items.map((item) => item);
+ const nextItems = items;
```

---

<a id="no-mixed-filename-casing"></a>

### `legibility/no-mixed-filename-casing()`

<!-- no-mixed-filename-casing behavior from src/constants.ts and src/index.ts -->
Use one filename convention: kebab-case, camelCase, PascalCase, or snake_case. Leading dots and file extensions are ignored.

---

<a id="no-quadratic-patterns"></a>

### `legibility/no-quadratic-patterns({options})`

Flag nested loops, nested array iteration, and collection searches inside loop bodies.

#### options

- `{iterationMethods: string[]}`: methods checked for nested iteration.
- `{searchMethods: string[]}`: methods treated as collection searches.

#### do / don't

```diff
- const enrichedOrders = orders.map((order) => ({
-   ...order,
-   user: users.find((user) => user.id === order.userId),
- }));
+ const usersById = new Map(users.map((user) => [user.id, user]));
+ const enrichedOrders = orders.map((order) => ({
+   ...order,
+   user: usersById.get(order.userId),
+ }));
```

---

<a id="no-redundant-boolean-logic"></a>

### `legibility/no-redundant-boolean-logic({options})`

Avoid boolean comparisons and boolean-only ternaries.

#### options

- `{equalityOperators: string[]}`: operators checked for comparisons against `true` or `false`. Default: `["==", "===", "!=", "!=="]`.

#### do / don't

```diff
- return isReady === true ? true : false;
+ return isReady;
```

---

<a id="no-redundant-nullish-fallback"></a>

### `legibility/no-redundant-nullish-fallback()`

Avoid `?? undefined` fallbacks.

#### do / don't

```diff
- const value = maybeValue ?? undefined;
+ const value = maybeValue;
```

---

<a id="no-repeated-collection-search"></a>

### `legibility/no-repeated-collection-search({options})`

Flag repeated searches over the same collection in one scope.

#### options

- `{searchMethods: string[]}`: methods treated as collection searches.

#### do / don't

```diff
- const owner = users.find((user) => user.id === ownerId);
- const reviewer = users.find((user) => user.id === reviewerId);
+ const usersById = new Map(users.map((user) => [user.id, user]));
+ const owner = usersById.get(ownerId);
+ const reviewer = usersById.get(reviewerId);
```

---

<a id="no-small-collection-conversion"></a>

### `legibility/no-small-collection-conversion({options})`

Avoid converting a statically small array or string into a `Map` or `Set` for one immediate lookup. Named collections, dynamic inputs, and literal inputs at the threshold are unchanged.

#### options

- `{min: number}`: minimum known input size before a lookup collection is useful. Default: `3`.

#### do / don't

```diff
- const isTerminal = new Set(["done", "failed"]).has(status);
+ const isTerminal = ["done", "failed"].includes(status);
```

---

<a id="no-single-use-renaming-alias"></a>

### `legibility/no-single-use-renaming-alias()`

Avoid aliases that only rename another value for one use.

#### do / don't

```diff
- const userData = user;
-
- return userData.name;
+ return user.name;
```

---

<a id="no-standalone-array-mutations"></a>

### `legibility/no-standalone-array-mutations({options})`

Prefer explicit returned array composition over standalone array mutation statements.

#### options

- `{arrayMutatingMethods: string[]}`: array methods reported when used as standalone mutations.
- `{mutatingMethods: string[]}`: mutation methods used to identify fresh mutation targets.

#### do / don't

```diff
- items.push(nextItem);
-
- return items;
+ return items.concat(nextItem);
```

---

<a id="no-trivial-wrapper-functions"></a>

### `legibility/no-trivial-wrapper-functions()`

Avoid wrappers that only forward their parameters to another call.

#### do / don't

```diff
- const getUser = (userId) => fetchUser(userId);
+ const getActiveUser = (userId) => fetchUser(userId).then(requireActiveUser);
```

---

<a id="no-unmatched-comments"></a>

### `legibility/no-unmatched-comments({options})`

<!-- no-unmatched-comments defaults and matching behavior from src/constants.ts and src/index.ts -->

Allow only comments that match an explicit pattern, prefix, or suffix. With no options, the rule rejects every line and block comment. Executable shebangs are ignored.

#### options

- `matchers`: case-insensitive regular expressions matched against the comment body.
- `prefixIdentifiers`: case-insensitive identifiers allowed at the start of a comment.
- `suffixIdentifiers`: case-insensitive identifiers allowed at the end of a comment.

All options accept string arrays and default to empty arrays.

The three options are independent allow paths. Matching ignores comment delimiters, surrounding whitespace, and leading JSDoc stars. Invalid regular expressions and empty identifiers never match. The rule has no autofix.

#### do / don't

With the `WHY:` prefix configured:

```diff
- // Retry after the provider resets its rate limit.
+ // WHY: The provider resets its rate limit every 30 seconds.
```

---

<a id="no-stacked-comments"></a>

### `legibility/no-stacked-comments()`

<!-- no-stacked-comments behavior from src/constants.ts and src/index.ts -->

Reject comments on consecutive lines. A blank line between comments is allowed.

#### do / don't

```diff
- // Retry every failed request.
- // Retry requests that fail during regional failover.
+ // Retry only requests that fail during regional failover.
```

The rule has no options and no autofix.

---

<a id="no-automated-comment-attribution"></a>

### `legibility/no-automated-comment-attribution({options})`

<!-- no-automated-comment-attribution defaults and signatures from src/constants.ts and src/index.ts -->

Reject comments that explicitly attribute authorship to an automated tool. The rule detects configured identifiers in attribution tags, `generated by <identifier>`, and `<identifier>-generated`. It does not classify unmarked prose.

#### options

- `{identifiers: string[]}`: case-insensitive names treated as automated sources. Default: `ai`, `chatgpt`, `claude`, `codex`, `copilot`, `gemini`, `gpt`, `llm`, and `openai`.

#### do / don't

```diff
- // Generated by Codex. Normalize provider errors before retrying.
+ // Normalize provider errors before retrying.
```

---

<a id="require-jsdoc-multiline-comments"></a>

### `legibility/require-jsdoc-multiline-comments()`

<!-- require-jsdoc-multiline-comments behavior from src/constants.ts and src/index.ts -->

Require block comments spanning multiple lines to use `/** ... */` JSDoc syntax. Line comments and single-line block comments are unchanged.

#### do / don't

```diff
- /*
-  * The provider can return a stale token during regional failover.
-  * Preserve the retry order.
-  */
+ /**
+  * The provider can return a stale token during regional failover.
+  * Preserve the retry order.
+  */
```

This rule has no options and no autofix.

---

<a id="no-unnecessary-async"></a>

### `legibility/no-unnecessary-async()`

Flag async functions that have no await, only return one awaited value, or only await Node filesystem operations with synchronous equivalents. Filesystem detection covers named and namespace imports from `node:fs/promises`, `fs/promises`, `node:fs`, and `fs`.

Use the filesystem diagnostic for local tooling and scripts. Non-blocking filesystem I/O remains appropriate in request-serving code.

#### do / don't

```diff
- import { readFile } from "node:fs/promises";
+ import { readFileSync } from "node:fs";

- async function readConfig() {
-   return await readFile("config.json", "utf8");
+ function readConfig() {
+   return readFileSync("config.json", "utf8");
  }
```

---

<a id="no-unnecessary-block-callback"></a>

### `legibility/no-unnecessary-block-callback()`

Prefer expression-bodied arrow callbacks when the callback block only returns.

#### do / don't

```diff
- const ids = users.map((user) => {
-   return user.id;
- });
+ const ids = users.map((user) => user.id);
```

---

<a id="prefer-concat-object-assign"></a>

### `legibility/prefer-concat-object-assign()`

Prefer `concat` and `Object.assign` over spread composition.

#### do / don't

```diff
- const nextItems = [...items, nextItem];
- const options = { ...defaults, ...overrides };
+ const nextItems = items.concat(nextItem);
+ const options = Object.assign({}, defaults, overrides);
```

---

<a id="prefer-early-return"></a>

### `legibility/prefer-early-return()`

Avoid `else` branches after an `if` branch already exits.

#### do / don't

```diff
- if (!user) {
-   return null;
- } else {
-   return user.name;
- }
+ if (!user) {
+   return null;
+ }
+
+ return user.name;
```

---

<a id="prefer-flat-map"></a>

### `legibility/prefer-flat-map()`

Prefer `flatMap` over `map(...).flat()`.

#### do / don't

```diff
- const permissions = users.map((user) => user.permissions).flat();
+ const permissions = users.flatMap((user) => user.permissions);
```

---

<a id="prefer-guard-clauses"></a>

### `legibility/prefer-guard-clauses()`

Prefer guard clauses over wrapping a whole function body in one branch.

#### do / don't

```diff
- function sendInvite(user) {
-   if (user) {
-     const email = buildEmail(user);
-     deliver(email);
-   }
- }
+ function sendInvite(user) {
+   if (!user) return;
+
+   const email = buildEmail(user);
+   deliver(email);
+ }
```

---

<a id="prefer-object-lookup"></a>

### `legibility/prefer-object-lookup({options})`

Prefer `Set`, `Map`, or object lookups over long equality `||` chains.

#### options

- `{min: number}`: equality checks required before reporting. Default: `3`.
- `{operators: string[]}`: equality operators that count. Default: `["==", "==="]`.

#### do / don't

```diff
- const isSupported = type === "page" || type === "post" || type === "asset";
+ const supportedTypes = new Set(["page", "post", "asset"]);
+ const isSupported = supportedTypes.has(type);
```

---

<a id="prefer-positive-condition-names"></a>

### `legibility/prefer-positive-condition-names({options})`

Prefer positive boolean names over names like `isNotReady`.

#### options

- `{booleanOperators: string[]}`: binary operators that mark an initializer as boolean-like.

#### do / don't

```diff
- const isNotReady = status !== "ready";
-
- if (!isNotReady) {
-   run();
- }
+ const isReady = status === "ready";
+
+ if (isReady) {
+   run();
+ }
```

---

<a id="require-executable-shebang"></a>

### `legibility/require-executable-shebang({options})`

<!-- require-executable-shebang runtime defaults from src/constants.ts -->
Require configured CLI entry source files to include a Node, Bun, or Deno shebang.

#### options

- `{files: string[]}`: source files expected to be executable entries.
- `{runtimes: string[]}`: accepted shebang runtimes. Default: `["bun", "deno", "node"]`.

#### do / don't

```diff
- console.log("hello");
+#!/usr/bin/env node
+
+ console.log("hello");
```

---

<a id="require-filename-matches-dirname"></a>

### `legibility/require-filename-matches-dirname({options})`

<!-- require-filename-matches-dirname defaults and behavior from src/constants.ts and src/index.ts -->
Require files in named subdirectories to match their parent directory. Known standalone filenames and approved qualifiers remain available.

#### options

- `{minDepth: number}`: minimum parent depth to check. Default: `3`.
- `{allowedQualifiers: string[]}`: suffixes allowed after the directory name.
- `{allowedFilenames: string[]}`: standalone filenames that do not need to match the directory.

The default qualifiers are `constants`, `helpers`, `spec`, `styles`, `test`, `types`, and `utils`. The default standalone filenames are `constants`, `index`, `types`, and `utils`.

---

### Operator Options

The operator-counting rules accept the same option shape:

- `legibility/hoist-if-operators`
- `legibility/max-expression-operators`
- `legibility/no-complex-ternaries`
- `legibility/no-computed-values`

```js
{
  rules: {
    "legibility/max-expression-operators": [
      "warn",
      {
        max: 4,
        operators: ["&&", "||", "??", "?:", "!", "===", "!=="],
        complexity: { "?:": 2 }
      }
    ]
  }
}
```

---

### Chain And Count Options

Use `max` and `min` to tune rule sensitivity.

```js
{
  rules: {
    "legibility/max-array-chain-depth": ["warn", { max: 3 }],
    "legibility/max-control-flow-depth": ["warn", { max: 2 }],
    "legibility/prefer-object-lookup": ["warn", { min: 4 }]
  }
}
```

---

<a id="comment-policy-recipes"></a>

## Recipes

The bundled presets check comment quality. They do not ban every comment. Use a session flag or configure `no-unmatched-comments` when comments need an explicit allow policy.

### Block comments during an agent session

Pass `--comments=forbid` to the changed-file lint command:

```sh
npx lint-changed --comments=forbid
```

The flag enables `legibility/no-unmatched-comments` as an error for that invocation. It does not change the project config. New and modified files fail when the linter reports a comment.

Pass the base branch before or after the flag:

```sh
npx lint-changed origin/develop --comments=forbid
```

### Keep normal comment checks

Run changed-file linting without the flag:

```sh
npx lint-changed
```

This uses the project config. The bundled presets still reject automated attribution, stacked comments, and non-JSDoc multiline blocks.

### Allow only marked comments

Configure `no-unmatched-comments` directly when a repository permits a small set of durable comments:

```diff
 import legibility from "eslint-plugin-legibility";

+const approvedPrefixes = ["WHY:"];
+const commentOptions = { prefixIdentifiers: approvedPrefixes };
+const approvedCommentRule = ["error", commentOptions];
+const commentRules = {
+  "legibility/no-unmatched-comments": approvedCommentRule,
+};
+const commentConfig = { rules: commentRules };
+
 export default [
   legibility.configs["flat/recommended"],
+  commentConfig,
 ];
```

```diff
- // Wait before retrying.
+ // WHY: The provider resets its rate-limit window every 30 seconds.
  const retryDelayMs = 30_000;
```

### Enforce the session policy in CI

Use the same flag in a commit or pull-request gate:

```sh
npx lint-changed origin/main --comments=forbid
```

The flag forces comment violations to error severity even when the project uses `flat/recommended`.

---

## Usage

### Using With ESLint

Flat config:

```ts
import legibility from "eslint-plugin-legibility";

export default [legibility.configs["flat/recommended"]];
```

Configure rules directly:

```ts
import legibility from "eslint-plugin-legibility";

export default [
  {
    plugins: { legibility },
    rules: {
      "legibility/max-array-chain-depth": ["warn", { max: 2 }],
      "legibility/max-expression-operators": ["warn", { max: 4 }],
      "legibility/no-quadratic-patterns": "warn",
    },
  },
];
```

CommonJS compatibility:

```js
const legibility = require("eslint-plugin-legibility");
```

### Usage With Oxlint

Oxlint JavaScript plugins use the same ESLint-compatible rule API.

```json
{
  "jsPlugins": [
    {
      "name": "legibility",
      "specifier": "eslint-plugin-legibility"
    }
  ],
  "rules": {
    "legibility/max-array-chain-depth": ["warn", { "max": 2 }],
    "legibility/max-expression-operators": ["warn", { "max": 4 }],
    "legibility/no-quadratic-patterns": "warn",
    "complexity": ["warn", { "max": 20, "variant": "classic" }],
    "max-lines-per-function": [
      "warn",
      {
        "max": 40,
        "skipBlankLines": true,
        "skipComments": true,
        "IIFEs": true
      }
    ]
  }
}
```

### Agent Skill

<!-- agent skill install command from package.json bin and scripts/agent/constants.ts -->

Install the packaged agent skill after installing the npm package:

```sh
npx eslint-plugin-legibility-install-skill
```

Install for a specific agent target:

```sh
npx eslint-plugin-legibility-install-skill --target codex
npx eslint-plugin-legibility-install-skill --target claude
```

---

## API

Rules are configured through ESLint or Oxlint `rules`.

```json
{
  "rules": {
    "legibility/rule-name": ["warn", { "option": "value" }]
  }
}
```

---

## Security Posture

- No runtime dependencies.
- Published package contents are allowlisted with `files`.
- Releases are tag-triggered and publish GitHub release assets.
- npm publishing uses GitHub Actions trusted publishing with provenance.
<!-- runtime compatibility coverage from .github/workflows/ci.yml -->
- CI runs validation on Node 26, plus compatibility suites on Bun and Deno.
- Codependence maintains pnpm dependencies, GitHub Actions, and Docker image pins.
- Pastoralist audits CVE overrides in `pnpm-workspace.yaml` and records their metadata in `package.json`.
- Dependabot alerts, security updates, and version updates are disabled.

## GitHub Secrets

| Secret | Location | Used by | Required when |
| --- | --- | --- | --- |
| `CODECOV_TOKEN` | Repository Actions secret | `.github/workflows/codecov.yml` | Codecov uploads run on protected branches or token authentication is required in Codecov. |

`GITHUB_TOKEN` is provided by GitHub Actions automatically and does not need to be added manually.

npm publishing does not use `NPM_TOKEN` or `NODE_AUTH_TOKEN`. Configure npm trusted publishing for:

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository owner | `yowainwright` |
| Repository name | `eslint-plugin-legibility` |
| Workflow filename | `publish.yml` |
| Environment | blank |
| Allowed action | `npm publish` |

## Releases

Releases use a local release wrapper around `release-it`. Run release commands from a clean, up-to-date `main` branch. Use `nub run release:current` for the first publish of the current package version, then use the patch, minor, major, alpha, or beta commands for later releases. The wrapper resolves the exact version, verifies local `main` matches `origin/main`, and asks for confirmation before `release-it` pushes the tag that triggers npm publishing.

The publish confirmation question is:

```text
Publish eslint-plugin-legibility@<version> from GitHub Actions trusted publishing? This will push v<version> and npm <dist-tag> will update if the workflow succeeds. Continue? [y/N]
```

Answer `y` or `yes` to continue. Any other answer aborts before the release tag is pushed. For intentional noninteractive release automation, pass `--yes` to the release wrapper.

After confirmation, `release-it` runs `nub run validate`, bumps `package.json` when incrementing, creates the release commit, creates `v${version}`, and pushes the branch with tags. The pushed tag triggers npm publishing and GitHub release asset upload through `.github/workflows/publish.yml`.

Before publishing, configure npm trusted publishing for `publish.yml`. Leave the environment field blank because the publish workflow does not use a GitHub environment.

## Attribution

The first rules were adapted from the [Pastoralist](https://github.com/yowainwright/pastoralist) `scripts/oxlint-plugin` rule set, then packaged for ESLint and Oxlint with additional legibility and performance rules.
