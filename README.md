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

Runtime support is Node 22.12 through 26, Bun, and Deno. Node 22.12 is the minimum because it added [CommonJS interoperability for synchronous ESM loading][node-require-esm]. The supported hosts are ESLint 8.57 through 10 and Oxlint 1.55 through current. Both are optional peers, so consumers only install the linter they use. Oxlint's JavaScript plugin API is currently marked alpha by [Oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins).

```sh
# npm, pnpm, bun
npm add -D eslint-plugin-legibility
```

---

## Configs

Choose the preset for your linter and severity.

### `flat/recommended`

Enables the broadly applicable legibility rules and core complexity limits as warnings.

```ts
import legibility from "eslint-plugin-legibility";

export default [legibility.configs["flat/recommended"]];
```

### `flat/strict`

Enables every recommended rule plus the more opinionated analysis rules as errors.

```ts
import legibility from "eslint-plugin-legibility";

export default [legibility.configs["flat/strict"]];
```

### `oxlint/recommended`

Mirrors `flat/recommended` in `oxlint.config.ts`.

```ts
import { defineConfig } from "oxlint";
import legibility from "eslint-plugin-legibility";

export default defineConfig(legibility.configs["oxlint/recommended"]);
```

### `oxlint/strict`

Mirrors `flat/strict` in `oxlint.config.ts`.

```ts
import { defineConfig } from "oxlint";
import legibility from "eslint-plugin-legibility";

export default defineConfig(legibility.configs["oxlint/strict"]);
```

All presets explicitly configure these core rules because ESLint's recommended config does not enable them:

- `complexity`: maximum cyclomatic complexity of `20`.
- `max-lines-per-function`: `max: 40`, excluding blank lines and comments and including IIFEs.

---

## Development

The repository uses Mise for Node 26 and Nub for pnpm 11. Nub keeps `pnpm-lock.yaml` as the package-manager source of truth.

```sh
nub install --frozen-lockfile
nub run validate
```

### Docker end-to-end tests

<!-- Docker end-to-end commands and matrix from package.json and tests/e2e/docker/compose.yml -->

Build the package tarball, install it in an isolated consumer, and test ESLint and Oxlint with the `default`, `opt-in`, `recommended`, and `strict` fixture profiles:

```sh
nub run test:e2e
```

Benchmark every engine and fixture setup against one file and a generated 100-file project:

```sh
nub run benchmark:e2e
```

The local image defaults to Node 26, ESLint 9, and Oxlint 1.78. Set `E2E_NODE_VERSION`, `E2E_ESLINT_VERSION`, and `E2E_OXLINT_VERSION` to test another supported combination. CI covers the oldest supported ESLint and Oxlint releases and the current major releases across Node 22, 24, and 26.

The benchmark reports JSON with mean, median, p95, minimum, maximum, and mean-per-file duration. Adjust its sample counts with `BENCHMARK_WARMUPS` and `BENCHMARK_ITERATIONS`. Benchmarks report measurements without enforcing timing thresholds. Both commands remove their Compose containers, networks, volumes, and local e2e image after success or failure.

---

## Rules

`recommended` contains broadly applicable legibility checks. `strict` includes every recommended rule plus more opinionated performance and code-shape analysis. Composition style, executable-entry checks, filename schemas, and blanket comment policies remain opt-in because they require a project decision.

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
- [`legibility/no-hidden-side-effects`](#no-hidden-side-effects)
- [`legibility/no-identity-array-callback`](#no-identity-array-callback)
- [`legibility/no-mixed-filename-casing`](#no-mixed-filename-casing)
- [`legibility/no-automated-comment-attribution`](#no-automated-comment-attribution)
- [`legibility/no-redundant-boolean-logic`](#no-redundant-boolean-logic)
- [`legibility/no-redundant-nullish-fallback`](#no-redundant-nullish-fallback)
- [`legibility/no-stacked-comments`](#no-stacked-comments)
- [`legibility/no-trivial-wrapper-functions`](#no-trivial-wrapper-functions)
- [`legibility/no-unnecessary-block-callback`](#no-unnecessary-block-callback)
- [`legibility/prefer-early-return`](#prefer-early-return)
- [`legibility/prefer-flat-map`](#prefer-flat-map)
- [`legibility/prefer-guard-clauses`](#prefer-guard-clauses)
- [`legibility/prefer-object-lookup`](#prefer-object-lookup)
- [`legibility/prefer-positive-condition-names`](#prefer-positive-condition-names)
- [`legibility/require-jsdoc-multiline-comments`](#require-jsdoc-multiline-comments)

**Strict only**

- [`legibility/no-direct-node-bin-smoke`](#no-direct-node-bin-smoke)
- [`legibility/no-quadratic-patterns`](#no-quadratic-patterns)
- [`legibility/no-repeated-collection-search`](#no-repeated-collection-search)
- [`legibility/no-single-use-renaming-alias`](#no-single-use-renaming-alias)
- [`legibility/no-small-collection-conversion`](#no-small-collection-conversion)
- [`legibility/no-standalone-array-mutations`](#no-standalone-array-mutations)
- [`legibility/no-unnecessary-async`](#no-unnecessary-async)

**Opt-in project policies**

- [`legibility/no-unmatched-comments`](#no-unmatched-comments)
- [`legibility/prefer-concat-object-assign`](#prefer-concat-object-assign)
- [`legibility/require-executable-shebang`](#require-executable-shebang)
- [`legibility/require-filename-matches-dirname`](#require-filename-matches-dirname)

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

This rule has no options. It rejects conventions mixed within one filename; it does not require every file in the project to use the same convention. For example, `user-profile.ts`, `userProfile.ts`, `UserProfile.ts`, and `user_profile.ts` are all valid.

#### do / don't

```diff
- my-File.ts
+ my-file.ts

- user_profile-card.test.ts
+ user_profile_card.test.ts

- accountSettings-helper.ts
+ account-settings-helper.ts
```

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

This formatting rule does not permit agents to add comments. During an agent session, `npx lint-changed --comments=forbid` rejects every added comment, including separated comments. Outside that session policy, ESLint and Oxlint can autofix this rule by adding the missing `*` to the block opener.

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

This rule has no options. Run ESLint or Oxlint with `--fix` to apply the autofix.

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

Opt-in opinion: prefer explicit method-based composition when that is the project style.

The reason is consistency and searchability. It is not a universal speed claim.

ESLint's opposing [prefer-object-spread][eslint-prefer-object-spread] rule only says spread may perform better.

[V8's spread documentation][v8-spread] shows that fast paths depend on position and data shape. Engine, collection size, and object shape can change the result.

The forms are not semantically identical. Object assignment can invoke setters, while object spread creates data properties. Concat uses concat-spreadability, while array spread uses iteration.

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

This rule is opt-in because a common source index is not necessarily executable. Enable it only for actual command entry paths.

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
Require filenames to match an explicitly selected schema. The rule is not included in a preset because projects must choose `dirname`, `index`, or a custom schema.

#### options

- `{schema: "dirname" | "index" | "custom"}`: required filename schema.
- `{minDepth: number}`: minimum parent depth to check. Default: `3`.
- `{allowedQualifiers: string[]}`: `dirname` schema suffixes.
- `{allowedFilenames: string[]}`: `dirname` schema standalone basenames.
- `{patterns: string[]}`: required exact basenames for a `custom` schema. Use `{dirname}` as the parent-directory placeholder.

The rule ignores the final JavaScript or TypeScript extension, so the same schema covers `.js`, `.jsx`, `.ts`, and `.tsx` files.

#### index schema

The `index` schema allows only `constants`, `index`, `index.test`, `types`, `utils`, and `utils.test`:

```js
const filenameSchema = { schema: "index", minDepth: 3 };
const filenameRules = {
  "legibility/require-filename-matches-dirname": ["error", filenameSchema],
};

export default [
  legibility.configs["flat/recommended"],
  { rules: filenameRules },
];
```

```diff
- src/components/button/button.ts
- src/components/button/button.test.ts
+ src/components/button/index.ts
+ src/components/button/index.test.tsx
+ src/components/button/utils.ts
```

#### dirname schema

The `dirname` schema keeps the existing directory-name convention. It allows `button`, qualified forms such as `button.test`, and standalone filenames such as `index` under `src/components/button/`:

```js
const filenameSchema = { schema: "dirname", minDepth: 3 };
const filenameRules = {
  "legibility/require-filename-matches-dirname": ["error", filenameSchema],
};
```

```diff
- src/components/button/useButton.ts
- src/components/button/button.effect.ts
+ src/components/button/button.ts
+ src/components/button/button.test.ts
+ src/components/button/index.ts
```

The default qualifiers are `constants`, `helpers`, `spec`, `styles`, `test`, `types`, and `utils`. The default standalone filenames are `constants`, `index`, `types`, and `utils`. The option arrays replace those defaults.

#### custom schema

Custom patterns match the basename exactly after replacing `{dirname}`:

```js
const filenameSchema = {
  schema: "custom",
  minDepth: 3,
  patterns: ["{dirname}", "{dirname}.test", "index", "index.test", "schema"],
};
const filenameRules = {
  "legibility/require-filename-matches-dirname": ["error", filenameSchema],
};
```

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

The flag enables `legibility/no-unmatched-comments` as an error for that invocation. It does not change the project config. Every comment in a new file fails. In modified files, only comments that intersect added lines fail, so existing comments outside the session diff remain untouched.

ESLint disable directives cannot suppress the session policy. Parse or configuration failures fail the command, and a pure file rename does not turn existing comments into additions.

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

### Keep CI and pre-commit on repository policy

Omit the session flag from commit and pull-request gates:

```sh
npx lint-changed origin/main
```

Run the same project policy in pre-commit checks:

```sh
npx lint-changed
```

These checks allow comments unless the project config explicitly restricts them. The bundled comment-quality rules still apply. Reserve `--comments=forbid` for active agent sessions.

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
Use an `oxlint/*` preset above with `oxlint.config.ts`. For `.oxlintrc.json`, register the plugin and configure rules explicitly:

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
    "complexity": ["warn", 20],
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
- CI runs tests on Node 22, 24, and 26; Docker package-consumer tests cover supported ESLint and Oxlint ranges; compatibility suites run on Bun and Deno.
- Codependence maintains pnpm dependencies, GitHub Actions, and Docker image pins.
- Pastoralist audits CVE overrides in `pnpm-workspace.yaml` and records their metadata in `package.json`.

## License

[MIT](./LICENSE)

[eslint-prefer-object-spread]: https://eslint.org/docs/latest/rules/prefer-object-spread
[node-require-esm]: https://nodejs.org/dist/latest/docs/api/modules.html
[v8-spread]: https://v8.dev/blog/spread-elements
