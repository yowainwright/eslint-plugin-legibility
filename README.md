# eslint plugin legibility

## Why was this written?

> Working with LLM's for the majority of my work, I find the way that I code and read code has changed. This project contains rules I find useful for keeping Typescript and/or JavaScript more readable when written mainly by LLMs's. 

## TLDR;

We review thousands of lines of code a day. It is very hard to do but this is our responsibility: ensuring code works as expected and is maintenance. 

The goal of rules in this package are to make code readable for reviewing lots of code and avoiding things that have a high probability of complexity or confusion. 

---

## How to use

This project provides ESLint and Oxlint-compatible rules for readable, explicit, performance-conscious JavaScript and TypeScript.

The package exports an ESLint-compatible plugin object. ESLint can load it as a normal plugin, and Oxlint can load the same package through JavaScript plugin support. 

### Install

```sh
# npm, pnpm, bun
pnpm add -D eslint-plugin-legibility
```

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

---

## Configs

| Config | Format | Behavior |
| --- | --- | --- |
| [recommended](#legibility-configs-recommended) | ESLint legacy | High-signal rules as warnings. |
| [strict](#legibility-configs-strict) | ESLint legacy | Every rule as an error. |
| [flat/recommended](#legibility-configs-flat-recommended) | ESLint flat config | High-signal rules as warnings. |
| [flat/strict](#legibility-configs-flat-strict) | ESLint flat config | Every rule as an error. |

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

Flat ESLint config with high-signal rules enabled as warnings.

---

### `legibility.configs["flat/strict"]`

Flat ESLint config with every rule enabled as an error.

---

### `legibility.configs.recommended`

Legacy ESLint config with high-signal rules enabled as warnings.

---

### `legibility.configs.strict`

Legacy ESLint config with every rule enabled as an error.

---

### Rules

Rules marked `recommended + strict` are enabled by `recommended` as `warn` and by `strict` as `error`. Rules marked `strict only` are enabled by `strict` as `error` and can be enabled directly at any severity.

| Rule | Preset configuration | Options |
| --- | --- | --- |
| [legibility/hoist-if-operators](#hoist-if-operators) | recommended + strict | `{max: 0, operators: ["&&", "\|\|", "??", "?:"], complexity}` |
| [legibility/max-array-chain-depth](#max-array-chain-depth) | recommended + strict | `{max: 2, iterationMethods}` |
| [legibility/max-control-flow-depth](#max-control-flow-depth) | recommended + strict | `{max: 3}` |
| [legibility/max-expression-operators](#max-expression-operators) | recommended + strict | `{max: 4, operators, complexity}` |
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
| [legibility/no-standalone-array-mutations](#no-standalone-array-mutations) | recommended + strict | `{arrayMutatingMethods, mutatingMethods}` |
| [legibility/no-trivial-wrapper-functions](#no-trivial-wrapper-functions) | recommended + strict | none |
| [legibility/no-unnecessary-block-callback](#no-unnecessary-block-callback) | recommended + strict | none |
| [legibility/prefer-concat-object-assign](#prefer-concat-object-assign) | recommended + strict | none |
| [legibility/prefer-early-return](#prefer-early-return) | recommended + strict | none |
| [legibility/prefer-flat-map](#prefer-flat-map) | recommended + strict | none |
| [legibility/prefer-guard-clauses](#prefer-guard-clauses) | recommended + strict | none |
| [legibility/prefer-object-lookup](#prefer-object-lookup) | recommended + strict | `{min: 3, operators: ["==", "==="]}` |
| [legibility/prefer-positive-condition-names](#prefer-positive-condition-names) | strict only | `{booleanOperators}` |
| [legibility/require-executable-shebang](#require-executable-shebang) | recommended + strict | `{files, runtimes: ["bun", "node"]}` |

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

Require configured CLI entry source files to include a Node or Bun shebang.

#### options

- `{files: string[]}`: source files expected to be executable entries.
- `{runtimes: string[]}`: accepted shebang runtimes. Default: `["bun", "node"]`.

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

## Security Posture

- No runtime dependencies.
- Published package contents are allowlisted with `files`.
- Releases are tag-triggered and publish GitHub release assets.
- npm publishing uses GitHub Actions trusted publishing with provenance.
- CI runs validation on Node 20, 22, 24, and 26, plus the test suite on Bun.
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

Releases use `release-it`. Run release commands from a clean, up-to-date `main` branch. Use `pnpm release:current` for the first `0.1.0` publish, then use the patch, minor, major, alpha, or beta commands for later releases. `release-it` runs `pnpm validate`, bumps `package.json` when incrementing, creates the release commit, creates `v${version}`, and pushes the branch with tags. The pushed tag triggers npm publishing and GitHub release asset upload through `.github/workflows/publish.yml`.

Before publishing, configure npm trusted publishing for `publish.yml`. Leave the environment field blank because the publish workflow does not use a GitHub environment.

## Attribution

The first rules were adapted from the [Pastoralist](https://github.com/yowainwright/pastoralist) `scripts/oxlint-plugin` rule set, then packaged for ESLint and Oxlint with additional legibility and performance rules.
