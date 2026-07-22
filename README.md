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

## Rules

Rules marked `recommended + strict` are enabled by `recommended` as `warn` and by `strict` as `error`. Rules marked `strict only` are enabled by `strict` as `error`. Comment rules are `recipe only` because agent sessions, development, and commit gates need different severities and options.

<!-- rule presets and option summaries from src/constants.ts -->
| Rule | Preset configuration | Options |
| --- | --- | --- |
| [legibility/hoist-if-operators](#hoist-if-operators) | recommended + strict | `{max: 0, operators: ["&&", "\|\|", "??", "?:"], complexity}` |
| [legibility/max-array-chain-depth](#max-array-chain-depth) | recommended + strict | `{max: 2, iterationMethods}` |
| [legibility/max-control-flow-depth](#max-control-flow-depth) | recommended + strict | `{max: 3}` |
| [legibility/max-expression-operators](#max-expression-operators) | recommended + strict | `{max: 4, operators, complexity}` |
| [legibility/max-function-parameters](#max-function-parameters) | recommended + strict | `{max: 4, maxObjectProperties: 8}` |
| [legibility/no-automated-comment-attribution](#no-automated-comment-attribution) | recipe only | `{identifiers}` |
| [legibility/no-complex-ternaries](#no-complex-ternaries) | recommended + strict | `{max: 2, operators, complexity}` |
| [legibility/no-computed-values](#no-computed-values) | recommended + strict | `{max: 1, operators, complexity}` |
| [legibility/no-direct-node-bin-smoke](#no-direct-node-bin-smoke) | `recommended + strict` | `{entryPatterns}` |
| [legibility/no-hidden-side-effects](#no-hidden-side-effects) | recommended + strict | `{mutatingMethods, sideEffectFreeIterationMethods}` |
| [legibility/no-identity-array-callback](#no-identity-array-callback) | recommended + strict | none |
| [legibility/no-quadratic-patterns](#no-quadratic-patterns) | recommended + strict | `{iterationMethods, searchMethods}` |
| [legibility/no-redundant-boolean-logic](#no-redundant-boolean-logic) | recommended + strict | `{equalityOperators: ["==", "===", "!=", "!=="]}` |
| [legibility/no-redundant-nullish-fallback](#no-redundant-nullish-fallback) | recommended + strict | none |
| [legibility/no-repeated-collection-search](#no-repeated-collection-search) | strict only | `{searchMethods}` |
| [legibility/no-single-use-renaming-alias](#no-single-use-renaming-alias) | strict only | none |
| [legibility/no-stacked-comments](#no-stacked-comments) | recipe only | none |
| [legibility/no-standalone-array-mutations](#no-standalone-array-mutations) | recommended + strict | `{arrayMutatingMethods, mutatingMethods}` |
| [legibility/no-trivial-wrapper-functions](#no-trivial-wrapper-functions) | recommended + strict | none |
| [legibility/no-unmatched-comments](#no-unmatched-comments) | recipe only | `{matchers: [], prefixIdentifiers: [], suffixIdentifiers: []}` |
| [legibility/no-unnecessary-block-callback](#no-unnecessary-block-callback) | recommended + strict | none |
| [legibility/prefer-concat-object-assign](#prefer-concat-object-assign) | recommended + strict | none |
| [legibility/prefer-early-return](#prefer-early-return) | recommended + strict | none |
| [legibility/prefer-flat-map](#prefer-flat-map) | recommended + strict | none |
| [legibility/prefer-guard-clauses](#prefer-guard-clauses) | recommended + strict | none |
| [legibility/prefer-object-lookup](#prefer-object-lookup) | recommended + strict | `{min: 3, operators: ["==", "==="]}` |
| [legibility/prefer-positive-condition-names](#prefer-positive-condition-names) | strict only | `{booleanOperators}` |
| [legibility/require-executable-shebang](#require-executable-shebang) | recommended + strict | `{files, runtimes: ["bun", "deno", "node"]}` |
| [legibility/require-jsdoc-multiline-comments](#require-jsdoc-multiline-comments) | recipe only | none |

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

### Comment rules

<!-- comment rule responsibilities from rule metadata in src/constants.ts -->

Comment rules are opt-in because agent sessions, development, and commit gates need different severities.
Start with the [comment policy recipes](#comment-policy-recipes), then use this section as the option reference.

| Rule | Responsibility |
| --- | --- |
| [`legibility/no-unmatched-comments`](#no-unmatched-comments) | Reject comments without an explicitly configured matcher, prefix, or suffix. |
| [`legibility/no-stacked-comments`](#no-stacked-comments) | Report comments stacked on consecutive lines. |
| [`legibility/no-automated-comment-attribution`](#no-automated-comment-attribution) | Reject explicit automated attribution signatures. |
| [`legibility/require-jsdoc-multiline-comments`](#require-jsdoc-multiline-comments) | Require JSDoc syntax for multiline block comments. |

<a id="no-unmatched-comments"></a>

#### `legibility/no-unmatched-comments({options})`

<!-- no-unmatched-comments defaults and matching behavior from src/constants.ts and src/index.ts -->

Reject every comment that lacks an explicitly configured regular-expression matcher, prefix identifier, or suffix identifier.

A comment is accepted when any configured `matchers`, `prefixIdentifiers`, or `suffixIdentifiers` entry matches. The rule reports unmatched comments without modifying them.

No matcher or identifier is configured by default. Enabling the rule without options rejects all line and block comments.

##### options

| Option | Type | Default | Behavior |
| --- | --- | --- | --- |
| `matchers` | `string[]` | `[]` | Case-insensitive regular-expression sources matched against the normalized comment body. |
| `prefixIdentifiers` | `string[]` | `[]` | Case-insensitive literal identifiers matched at the start of the normalized comment body. |
| `suffixIdentifiers` | `string[]` | `[]` | Case-insensitive literal identifiers matched at the end of the normalized comment body. |

The arrays are independent allow paths. A matching prefix or suffix lets ESLint allow the comment. `matchers` provides the regular-expression option.

##### matching details

- Line comments, inline comments, trailing comments, and block comments are checked.
- Executable shebang tokens are ignored.
- Regular-expression matchers run against the trimmed comment body without delimiters or leading JSDoc `*` prefixes.
- Regular-expression matchers are compiled with the `i` and `u` flags.
- Invalid regular expressions are ignored. If no other allow path matches, the comment is rejected.
- Empty or whitespace-only prefix and suffix identifiers never match.
- The rule has no autofix.

---

<a id="no-stacked-comments"></a>

#### `legibility/no-stacked-comments()`

<!-- no-stacked-comments behavior from src/constants.ts and src/index.ts -->

Report comments stacked on consecutive lines. A stack signals that the adjacent comment should be updated or removed instead of adding another comment.

```diff
- // Retry every failed request.
  // Retry requests that fail during regional failover.
```

A blank line between comments is not a stack. The rule has no options and no autofix.

---

<a id="no-automated-comment-attribution"></a>

#### `legibility/no-automated-comment-attribution({options})`

<!-- no-automated-comment-attribution defaults and signatures from src/constants.ts and src/index.ts -->

Reject explicit automated authorship and generation signatures in comments.

Static linting cannot determine how unmarked prose was produced. This rule only detects configured identifiers in structured attribution tags and phrases equivalent to `generated by <identifier>` or `<identifier>-generated`.

##### options

- `{identifiers: string[]}`: case-insensitive names treated as automated sources. Default: `ai`, `chatgpt`, `claude`, `codex`, `copilot`, `gemini`, `gpt`, `llm`, and `openai`.

##### examples

| Comment content | Result |
| --- | --- |
| `Generated by <configured identifier>` | rejected |
| `<configured identifier>-generated` | rejected |
| `Send a request to <configured identifier>` | accepted |
| Unmarked prose | not classified |

Use custom identifiers when a repository has additional automated tools:

```js
{
  "legibility/no-automated-comment-attribution": [
    "error",
    {
      identifiers: ["assistant", "robot"],
    },
  ],
}
```

---

<a id="require-jsdoc-multiline-comments"></a>

#### `legibility/require-jsdoc-multiline-comments()`

<!-- require-jsdoc-multiline-comments behavior from src/constants.ts and src/index.ts -->

Require block comments spanning multiple lines to use `/** ... */` JSDoc syntax. Line comments and single-line block comments are unchanged.

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

<!-- comment rule recipe options and agent commands from src/constants.ts, src/index.ts, and package.json -->

Comment rules are absent from the bundled presets. Add the rules needed for each lint mode.

### Agent mode

Agents do not add comments by default:

```js
import legibility from "eslint-plugin-legibility";

const commentRules = {
  "legibility/no-stacked-comments": "error",
  "legibility/no-unmatched-comments": "error",
};

export default [
  legibility.configs["flat/recommended"],
  { rules: commentRules },
];
```

To allow marked comments, configure a prefix, suffix, or both:

```js
const prefixIdentifiers = ["APPROVED"];
const suffixIdentifiers = ["@approved"];
const commentOptions = { prefixIdentifiers, suffixIdentifiers };
const unmatchedComments = ["error", commentOptions];

const commentRules = {
  "legibility/no-stacked-comments": "error",
  "legibility/no-unmatched-comments": unmatchedComments,
};
```

Either matching identifier allows the comment. `matchers` and the other comment rules provide additional configuration in the [comment rule reference](#comment-rules).

Install the packaged skill and lint changed files:

```sh
npx eslint-plugin-legibility-install-skill --target codex
npx lint-changed
```

### Developer mode

Use warnings while editing:

```js
const commentRules = {
  "legibility/no-stacked-comments": "warn",
  "legibility/no-unmatched-comments": "warn",
};
```

Use the same `no-unmatched-comments` options when the repository allows marked comments.

### Commit gate

Promote the chosen comment policy to errors:

```js
const commentRules = {
  "legibility/no-stacked-comments": "error",
  "legibility/no-unmatched-comments": "error",
};
```

Use the configured prefix, suffix, or other matcher here when the repository allows comments.

A pre-commit hook can run the configured ESLint rules:

```sh
#!/bin/sh
set -eu

pnpm exec eslint --max-warnings 0 .
```

This repository can install its managed validation hook with `pnpm install-hooks`.

---

## Configs

| Config | Format | Behavior |
| --- | --- | --- |
| [recommended](#legibility-configs-recommended) | ESLint legacy | High-signal general rules as warnings. |
| [strict](#legibility-configs-strict) | ESLint legacy | General rules as errors. |
| [flat/recommended](#legibility-configs-flat-recommended) | ESLint flat config | High-signal general rules as warnings. |
| [flat/strict](#legibility-configs-flat-strict) | ESLint flat config | General rules as errors. |

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

Legacy config:

```js
module.exports = {
  plugins: ["legibility"],
  extends: ["plugin:legibility/recommended"],
};
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
    "legibility/no-quadratic-patterns": "warn"
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
  rules: {
    "legibility/rule-name": ["warn", { option: "value" }]
  }
}
```

### `legibility.configs["flat/recommended"]`

Flat ESLint config with high-signal general rules enabled as warnings. Comment policies are configured through [recipes](#comment-policy-recipes).

---

### `legibility.configs["flat/strict"]`

Flat ESLint config with general rules enabled as errors. Comment policies are configured through [recipes](#comment-policy-recipes).

---

### `legibility.configs.recommended`

Legacy ESLint config with high-signal general rules enabled as warnings. Comment policies are configured through [recipes](#comment-policy-recipes).

---

### `legibility.configs.strict`

Legacy ESLint config with general rules enabled as errors. Comment policies are configured through [recipes](#comment-policy-recipes).

---

## Security Posture

- No runtime dependencies.
- Published package contents are allowlisted with `files`.
- Releases are tag-triggered and publish GitHub release assets.
- npm publishing uses GitHub Actions trusted publishing with provenance.
<!-- runtime compatibility coverage from .github/workflows/ci.yml -->
- CI runs validation on Node 20, 22, 24, and 26, plus compatibility suites on Bun and Deno.
- Bun installs are configured to use Socket.dev's security scanner.

## GitHub Secrets

| Secret | Location | Used by | Required when |
| --- | --- | --- | --- |
| `CODECOV_TOKEN` | Repository Actions secret | `.github/workflows/codecov.yml` | Codecov uploads run on protected branches or token authentication is required in Codecov. |
| `SOCKET_SECURITY_API_KEY` | Repository Actions secret | GitHub workflows that install, analyze, test, or publish packages | Socket.dev scanning or package-manager security integration is enabled. |
| `SOCKET_API_KEY` | Repository Actions secret | Fallback Socket token name | Existing Socket automation expects this older token name. |

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

```sh
pnpm release:current:dry
pnpm release:current
pnpm release:patch:dry
pnpm release:patch
pnpm release:minor
pnpm release:major
pnpm release:beta
pnpm release:alpha
```

Releases use a local release wrapper around `release-it`. Run release commands from a clean, up-to-date `main` branch. Use `pnpm release:current` for the first publish of the current package version, then use the patch, minor, major, alpha, or beta commands for later releases. The wrapper resolves the exact version, verifies local `main` matches `origin/main`, and asks for confirmation before `release-it` pushes the tag that triggers npm publishing.

The publish confirmation question is:

```text
Publish eslint-plugin-legibility@<version> from GitHub Actions trusted publishing? This will push v<version> and npm <dist-tag> will update if the workflow succeeds. Continue? [y/N]
```

Answer `y` or `yes` to continue. Any other answer aborts before the release tag is pushed. For intentional noninteractive release automation, pass `--yes` to the release wrapper.

After confirmation, `release-it` runs `pnpm validate`, bumps `package.json` when incrementing, creates the release commit, creates `v${version}`, and pushes the branch with tags. The pushed tag triggers npm publishing and GitHub release asset upload through `.github/workflows/publish.yml`.

Before publishing, configure npm trusted publishing for `publish.yml`. Leave the environment field blank because the publish workflow does not use a GitHub environment.

## Attribution

The first rules were adapted from the [Pastoralist](https://github.com/yowainwright/pastoralist) `scripts/oxlint-plugin` rule set, then packaged for ESLint and Oxlint with additional legibility and performance rules.
