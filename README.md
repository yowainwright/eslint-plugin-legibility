# eslint-plugin-legibility

ESLint and Oxlint-compatible rules for readable, explicit, performance-conscious JavaScript and TypeScript.

The package exports an ESLint-compatible plugin object. ESLint can load it as a normal plugin, and Oxlint can load the same package through JavaScript plugin support.

## Install

```sh
pnpm add -D eslint-plugin-legibility
```

## Use With ESLint

Flat config:

```js
import legibility from "eslint-plugin-legibility";

export default [legibility.configs["flat/recommended"]];
```

Configure rules directly:

```js
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

## Use With Oxlint

Oxlint JavaScript plugins use the same ESLint-compatible rule API.

```jsonc
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

## Configs

| Config | Format | Behavior |
| --- | --- | --- |
| `recommended` | ESLint legacy | High-signal rules as warnings. |
| `strict` | ESLint legacy | Every rule as an error. |
| `flat/recommended` | ESLint flat config | High-signal rules as warnings. |
| `flat/strict` | ESLint flat config | Every rule as an error. |

## API

Rules are configured through ESLint or Oxlint `rules`.

```js
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

### `legibility/hoist-if-operators({options})`

Prefer a named boolean before an operator-heavy `if` condition.

#### options

- `{max: number}`: allowed weighted operators in the condition. Default: `0`.
- `{operators: string[]}`: operators to count. Default: `["&&", "||", "??", "?:"]`.
- `{complexity: Record<string, number>}`: per-operator weights.

#### bad

```js
if (user && user.isActive && !user.isLocked) {
  sendInvite(user);
}
```

#### good

```js
const canInviteUser = user && user.isActive && !user.isLocked;

if (canInviteUser) {
  sendInvite(user);
}
```

---

### `legibility/max-array-chain-depth({options})`

Limit chained array methods like `items.filter().map().some()`.

#### options

- `{max: number}`: allowed chained items. Default: `2`.
- `{iterationMethods: string[]}`: method names that count as chain items.

#### bad

```js
const hasLargeActiveItem = items
  .filter((item) => item.active)
  .map((item) => item.size)
  .some((size) => size > 100);
```

#### good

```js
const activeItems = items.filter((item) => item.active);
const itemSizes = activeItems.map((item) => item.size);
const hasLargeActiveItem = itemSizes.some((size) => size > 100);
```

---

### `legibility/max-control-flow-depth({options})`

Limit nested branches and loops.

#### options

- `{max: number}`: allowed nested control-flow depth. Default: `3`.

#### bad

```js
if (user) {
  if (user.active) {
    if (user.email) {
      sendInvite(user);
    }
  }
}
```

#### good

```js
if (!user) return;
if (!user.active) return;
if (!user.email) return;

sendInvite(user);
```

---

### `legibility/max-expression-operators({options})`

Limit operators inside one expression.

#### options

- `{max: number}`: allowed weighted operators. Default: `4`.
- `{operators: string[]}`: operators to count.
- `{complexity: Record<string, number>}`: per-operator weights.

#### bad

```js
return user && user.active && (user.role === "admin" || user.role === "owner");
```

#### good

```js
const isAdmin = user.role === "admin";
const isOwner = user.role === "owner";
const hasPrivilegedRole = isAdmin || isOwner;

return user && user.active && hasPrivilegedRole;
```

---

### `legibility/no-complex-ternaries({options})`

Reject nested ternaries and operator-heavy ternaries.

#### options

- `{max: number}`: allowed weighted operators inside one ternary. Default: `2`.
- `{operators: string[]}`: operators to count.
- `{complexity: Record<string, number>}`: per-operator weights.

#### bad

```js
const label = isLoading ? "Loading" : hasError ? "Error" : "Ready";
```

#### good

```js
const label = getStatusLabel({ hasError, isLoading });
```

---

### `legibility/no-computed-values({options})`

Prefer named values before computed returns and object values.

#### options

- `{max: number}`: allowed weighted operators in a computed value. Default: `1`.
- `{operators: string[]}`: operators to count.
- `{complexity: Record<string, number>}`: per-operator weights.

#### bad

```js
return subtotal + tax - discount;
```

#### good

```js
const total = subtotal + tax - discount;

return total;
```

---

### `legibility/no-direct-node-bin-smoke({options})`

Smoke-test installed package bins instead of direct `node src/index.js` execution.

#### options

- `{entryPatterns: string[]}`: entry files that should be tested through the installed bin shim.

#### bad

```js
execSync("node src/index.js --help");
```

#### good

```js
execSync("my-cli --help");
```

---

### `legibility/no-hidden-side-effects({options})`

Keep mutations out of nested expressions and side-effect-free callbacks.

#### options

- `{mutatingMethods: string[]}`: method calls treated as mutations.
- `{sideEffectFreeIterationMethods: string[]}`: callback methods expected to stay side-effect-free.

#### bad

```js
return (count += 1);
```

#### good

```js
count += 1;

return count;
```

---

### `legibility/no-identity-array-callback()`

Reject `map` and `filter` callbacks that keep every item unchanged.

#### bad

```js
const nextItems = items.map((item) => item);
```

#### good

```js
const nextItems = items;
```

---

### `legibility/no-quadratic-patterns({options})`

Flag nested loops, nested array iteration, and collection searches inside loop bodies.

#### options

- `{iterationMethods: string[]}`: methods checked for nested iteration.
- `{searchMethods: string[]}`: methods treated as collection searches.

#### bad

```js
const enrichedOrders = orders.map((order) => ({
  ...order,
  user: users.find((user) => user.id === order.userId),
}));
```

#### good

```js
const usersById = new Map(users.map((user) => [user.id, user]));
const enrichedOrders = orders.map((order) => ({
  ...order,
  user: usersById.get(order.userId),
}));
```

---

### `legibility/no-redundant-boolean-logic({options})`

Avoid boolean comparisons and boolean-only ternaries.

#### options

- `{equalityOperators: string[]}`: operators checked for comparisons against `true` or `false`. Default: `["==", "===", "!=", "!=="]`.

#### bad

```js
return isReady === true ? true : false;
```

#### good

```js
return isReady;
```

---

### `legibility/no-redundant-nullish-fallback()`

Avoid `?? undefined` fallbacks.

#### bad

```js
const value = maybeValue ?? undefined;
```

#### good

```js
const value = maybeValue;
```

---

### `legibility/no-repeated-collection-search({options})`

Flag repeated searches over the same collection in one scope.

#### options

- `{searchMethods: string[]}`: methods treated as collection searches.

#### bad

```js
const owner = users.find((user) => user.id === ownerId);
const reviewer = users.find((user) => user.id === reviewerId);
```

#### good

```js
const usersById = new Map(users.map((user) => [user.id, user]));
const owner = usersById.get(ownerId);
const reviewer = usersById.get(reviewerId);
```

---

### `legibility/no-single-use-renaming-alias()`

Avoid aliases that only rename another value for one use.

#### bad

```js
const userData = user;

return userData.name;
```

#### good

```js
return user.name;
```

---

### `legibility/no-standalone-array-mutations({options})`

Prefer explicit returned array composition over standalone array mutation statements.

#### options

- `{arrayMutatingMethods: string[]}`: array methods reported when used as standalone mutations.
- `{mutatingMethods: string[]}`: mutation methods used to identify fresh mutation targets.

#### bad

```js
items.push(nextItem);

return items;
```

#### good

```js
return items.concat(nextItem);
```

---

### `legibility/no-trivial-wrapper-functions()`

Avoid wrappers that only forward their parameters to another call.

#### bad

```js
const getUser = (userId) => fetchUser(userId);
```

#### good

```js
const getActiveUser = (userId) => fetchUser(userId).then(requireActiveUser);
```

---

### `legibility/no-unnecessary-block-callback()`

Prefer expression-bodied arrow callbacks when the callback block only returns.

#### bad

```js
const ids = users.map((user) => {
  return user.id;
});
```

#### good

```js
const ids = users.map((user) => user.id);
```

---

### `legibility/prefer-concat-object-assign()`

Prefer `concat` and `Object.assign` over spread composition.

#### bad

```js
const nextItems = [...items, nextItem];
const options = { ...defaults, ...overrides };
```

#### good

```js
const nextItems = items.concat(nextItem);
const options = Object.assign({}, defaults, overrides);
```

---

### `legibility/prefer-early-return()`

Avoid `else` branches after an `if` branch already exits.

#### bad

```js
if (!user) {
  return null;
} else {
  return user.name;
}
```

#### good

```js
if (!user) {
  return null;
}

return user.name;
```

---

### `legibility/prefer-flat-map()`

Prefer `flatMap` over `map(...).flat()`.

#### bad

```js
const permissions = users.map((user) => user.permissions).flat();
```

#### good

```js
const permissions = users.flatMap((user) => user.permissions);
```

---

### `legibility/prefer-guard-clauses()`

Prefer guard clauses over wrapping a whole function body in one branch.

#### bad

```js
function sendInvite(user) {
  if (user) {
    const email = buildEmail(user);
    deliver(email);
  }
}
```

#### good

```js
function sendInvite(user) {
  if (!user) return;

  const email = buildEmail(user);
  deliver(email);
}
```

---

### `legibility/prefer-object-lookup({options})`

Prefer `Set`, `Map`, or object lookups over long equality `||` chains.

#### options

- `{min: number}`: equality checks required before reporting. Default: `3`.
- `{operators: string[]}`: equality operators that count. Default: `["==", "==="]`.

#### bad

```js
const isSupported = type === "page" || type === "post" || type === "asset";
```

#### good

```js
const supportedTypes = new Set(["page", "post", "asset"]);
const isSupported = supportedTypes.has(type);
```

---

### `legibility/prefer-positive-condition-names({options})`

Prefer positive boolean names over names like `isNotReady`.

#### options

- `{booleanOperators: string[]}`: binary operators that mark an initializer as boolean-like.

#### bad

```js
const isNotReady = status !== "ready";

if (!isNotReady) {
  run();
}
```

#### good

```js
const isReady = status === "ready";

if (isReady) {
  run();
}
```

---

### `legibility/require-executable-shebang({options})`

Require configured CLI entry source files to include a Node or Bun shebang.

#### options

- `{files: string[]}`: source files expected to be executable entries.
- `{runtimes: string[]}`: accepted shebang runtimes. Default: `["bun", "node"]`.

#### bad

```js
console.log("hello");
```

#### good

```js
#!/usr/bin/env node

console.log("hello");
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

## Security Posture

- No runtime dependencies.
- Published package contents are allowlisted with `files`.
- Releases are tag-triggered and publish GitHub release assets.
- npm trusted publishing is supported after the package exists on npm.
- CI runs typecheck, tests, ESLint, Oxlint, and `pnpm pack`.

## Releases

```sh
pnpm release:patch:dry
pnpm release:patch
pnpm release:minor
pnpm release:major
pnpm release:beta
pnpm release:alpha
```

The release script creates the release commit locally, tags it, pushes only the tag, and restores local `main` to its starting commit. The pushed tag triggers npm publishing and GitHub release asset upload.

Before the first publish, configure the `npm-publish` GitHub environment with an `NPM_TOKEN` secret. After trusted publishing is configured for `.github/workflows/publish.yml`, use `pnpm release:tag:trusted` or pass `--trusted-publishing`.

## Attribution

The first rules were adapted from the Pastoralist `scripts/oxlint-plugin` rule set, then packaged for ESLint and Oxlint with additional legibility and performance rules.
