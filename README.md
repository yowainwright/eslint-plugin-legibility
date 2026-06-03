# eslint-plugin-legibility

Rules for keeping JavaScript and TypeScript readable, explicit, and reasonably performant when humans and AI agents are both editing the code.

The package is an ESLint-compatible plugin with no runtime dependencies. Oxlint can load the same plugin through its JavaScript plugin support.

The repository is authored in TypeScript and publishes compiled CommonJS output from `dist/`.

## Install

```sh
pnpm add -D eslint-plugin-legibility
```

## ESLint Flat Config

```js
const legibility = require("eslint-plugin-legibility");

module.exports = [
  legibility.configs["flat/recommended"],
];
```

Or configure rules directly:

```js
const legibility = require("eslint-plugin-legibility");

module.exports = [
  {
    plugins: { legibility },
    rules: {
      "legibility/hoist-if-operators": "warn",
      "legibility/no-quadratic-patterns": "warn",
      "legibility/prefer-early-return": "warn",
    },
  },
];
```

## ESLint Legacy Config

```js
module.exports = {
  plugins: ["legibility"],
  extends: ["plugin:legibility/recommended"],
};
```

## Oxlint

Oxlint JavaScript plugins use the ESLint-compatible API. Add this package to `jsPlugins`, then enable the rule names you want:

```jsonc
{
  "jsPlugins": ["eslint-plugin-legibility"],
  "rules": {
    "legibility/hoist-if-operators": "warn",
    "legibility/no-quadratic-patterns": "warn",
    "legibility/prefer-early-return": "warn"
  }
}
```

If the package name resolves to a different plugin name in your setup, alias it:

```jsonc
{
  "jsPlugins": [
    {
      "name": "legibility",
      "specifier": "eslint-plugin-legibility"
    }
  ],
  "rules": {
    "legibility/max-expression-operators": "warn"
  }
}
```

## Configs

- `recommended`: legacy ESLint config with the high-signal rules enabled as warnings.
- `strict`: legacy ESLint config with every rule enabled as errors.
- `flat/recommended`: ESLint flat config with the high-signal rules enabled as warnings.
- `flat/strict`: ESLint flat config with every rule enabled as errors.

## Rules

| Rule | Recommended | Purpose |
| --- | --- | --- |
| `hoist-if-operators` | Yes | Prefer named boolean values before operator-heavy `if` conditions. |
| `max-array-chain-depth` | Yes | Limit long chains such as `items.filter().map().some()`. |
| `max-control-flow-depth` | Yes | Limit nested branches and loops. |
| `max-expression-operators` | Yes | Limit readability operators in one expression. |
| `no-complex-ternaries` | Yes | Reject nested or operator-heavy ternaries. |
| `no-computed-values` | Yes | Prefer named values before computed returns and object values. |
| `no-direct-node-bin-smoke` | Yes | Smoke test installed package bins instead of `node src/index.js`. |
| `no-hidden-side-effects` | Yes | Keep mutations out of nested expressions and side-effect-free callbacks. |
| `no-identity-array-callback` | Yes | Reject `map` and `filter` callbacks that leave every item unchanged. |
| `no-quadratic-patterns` | Yes | Flag nested loops, nested iterations, and searches inside loops. |
| `no-redundant-boolean-logic` | Yes | Avoid boolean comparisons and boolean-only ternaries. |
| `no-redundant-nullish-fallback` | Yes | Avoid `?? undefined` fallbacks. |
| `no-repeated-collection-search` | Strict | Flag repeated scans of the same collection in one scope. |
| `no-single-use-renaming-alias` | Strict | Avoid aliases that only rename another value for one use. |
| `no-standalone-array-mutations` | Yes | Prefer explicit returned array composition over standalone mutations. |
| `no-trivial-wrapper-functions` | Yes | Avoid wrappers that only forward their parameters to another call. |
| `no-unnecessary-block-callback` | Yes | Prefer expression-bodied arrow callbacks when a callback block only returns. |
| `prefer-concat-object-assign` | Yes | Prefer `concat` and `Object.assign` over spread composition. |
| `prefer-early-return` | Yes | Avoid `else` after a branch exits. |
| `prefer-flat-map` | Yes | Prefer `flatMap` over `map(...).flat()`. |
| `prefer-guard-clauses` | Yes | Prefer guard clauses over wrapping a whole function body in one branch. |
| `prefer-object-lookup` | Yes | Prefer `Set` or object lookups over long equality OR chains. |
| `prefer-positive-condition-names` | Strict | Prefer positive boolean names over names like `isNotReady`. |
| `require-executable-shebang` | Yes | Require configured CLI entry files to include a Node/Bun shebang. |

### Options

Rules not listed here do not take options.

The operator-counting rules share these options:

- `max`: maximum total complexity before reporting.
- `operators`: operator tokens to count.
- `complexity`: per-operator numeric weights.

#### `legibility/max-expression-operators`

Limits readability operators inside one expression.

Options:

- `max`: number, default `4`.
- `operators`: string array, default readability operators such as `&&`, `||`, `??`, `?:`, `!`, `===`, and `!==`.
- `complexity`: object, default weight `1` for each counted operator.

```js
"legibility/max-expression-operators": [
  "warn",
  {
    max: 4,
    operators: ["&&", "||", "??", "?:", "!", "===", "!=="],
    complexity: { "?:": 2 }
  }
]
```

#### `legibility/hoist-if-operators`

Limits operators inside `if` conditions.

Options:

- `max`: number, default `0`.
- `operators`: string array, default condition operators such as `&&`, `||`, `??`, and `?:`.
- `complexity`: object, default weight `1` for each counted operator.

```js
"legibility/hoist-if-operators": [
  "warn",
  { max: 0, operators: ["&&", "||", "??", "?:"] }
]
```

#### `legibility/no-computed-values`

Limits computed operators in object values and return values.

Options:

- `max`: number, default `1`.
- `operators`: string array, default computed-value operators such as `+`, `-`, `*`, `/`, `&&`, `||`, `??`, and `?:`.
- `complexity`: object, default weight `1` for each counted operator.

```js
"legibility/no-computed-values": [
  "warn",
  { max: 1, operators: ["+", "-", "*", "/", "&&", "||", "??", "?:"] }
]
```

#### `legibility/no-complex-ternaries`

Rejects nested ternaries and limits operators inside ternary expressions.

Options:

- `max`: number, default `2`.
- `operators`: string array, default readability operators.
- `complexity`: object, default weight `1` for each counted operator.

```js
"legibility/no-complex-ternaries": [
  "warn",
  { max: 2, complexity: { "?:": 2 } }
]
```

#### `legibility/max-control-flow-depth`

Limits nested control flow.

Options:

- `max`: integer, default `3`.

```js
"legibility/max-control-flow-depth": ["warn", { max: 3 }]
```

#### `legibility/max-array-chain-depth`

Limits consecutive collection method chains.

Options:

- `max`: integer, default `2`.
- `iterationMethods`: string array, default array iteration methods such as `map`, `filter`, `reduce`, and `some`.

```js
"legibility/max-array-chain-depth": [
  "warn",
  { max: 2, iterationMethods: ["map", "filter", "reduce", "select"] }
]
```

#### `legibility/no-quadratic-patterns`

Flags nested loops, nested collection iterations, and searches inside loop bodies.

Options:

- `iterationMethods`: string array, default array iteration methods such as `map`, `filter`, `reduce`, and `some`.
- `searchMethods`: string array, default search methods such as `find`, `includes`, `indexOf`, and `some`.

```js
"legibility/no-quadratic-patterns": [
  "warn",
  {
    iterationMethods: ["map", "filter", "reduce", "select"],
    searchMethods: ["find", "includes", "lookup"]
  }
]
```

#### `legibility/no-repeated-collection-search`

Flags repeated searches over the same collection in one scope.

Options:

- `searchMethods`: string array, default search methods such as `find`, `includes`, `indexOf`, and `some`.

```js
"legibility/no-repeated-collection-search": [
  "warn",
  { searchMethods: ["find", "includes", "lookup"] }
]
```

#### `legibility/no-hidden-side-effects`

Flags assignments, updates, and mutating method calls hidden inside expressions or side-effect-free callbacks.

Options:

- `mutatingMethods`: string array, default mutating methods such as `push`, `set`, `delete`, and `splice`.
- `sideEffectFreeIterationMethods`: string array, default iteration methods such as `map`, `filter`, and `some`.

```js
"legibility/no-hidden-side-effects": [
  "warn",
  {
    mutatingMethods: ["push", "set", "delete", "commit"],
    sideEffectFreeIterationMethods: ["map", "filter", "some"]
  }
]
```

#### `legibility/no-standalone-array-mutations`

Flags standalone array mutation calls.

Options:

- `arrayMutatingMethods`: string array, default array mutating methods such as `push`, `splice`, and `sort`.
- `mutatingMethods`: string array, default broader mutating methods used to detect fresh mutation targets.

```js
"legibility/no-standalone-array-mutations": [
  "warn",
  {
    arrayMutatingMethods: ["push", "splice", "append"],
    mutatingMethods: ["push", "splice", "append"]
  }
]
```

#### `legibility/no-redundant-boolean-logic`

Flags redundant boolean comparisons and boolean-only ternaries.

Options:

- `equalityOperators`: string array, default `==`, `===`, `!=`, and `!==`.

```js
"legibility/no-redundant-boolean-logic": [
  "warn",
  { equalityOperators: ["===", "!==", "==", "!="] }
]
```

#### `legibility/prefer-positive-condition-names`

Flags negative boolean condition names when initialized from boolean-like expressions.

Options:

- `booleanOperators`: string array, default comparison operators such as `===`, `!==`, `in`, and `instanceof`.

```js
"legibility/prefer-positive-condition-names": [
  "warn",
  { booleanOperators: ["===", "!==", "in", "instanceof"] }
]
```

#### `legibility/prefer-object-lookup`

Flags long equality OR chains that can become lookup objects or sets.

Options:

- `min`: integer, default `3`.
- `operators`: string array, default `==` and `===`.

```js
"legibility/prefer-object-lookup": [
  "warn",
  { min: 3, operators: ["===", "=="] }
]
```

#### `legibility/require-executable-shebang`

Requires configured executable entry files to start with an allowed runtime shebang.

Options:

- `files`: string array of path patterns, default common source CLI entries.
- `runtimes`: string array, default `node` and `bun`.

```js
"legibility/require-executable-shebang": [
  "error",
  {
    files: ["src/index.ts", "src/cli/index.ts"],
    runtimes: ["node", "bun"]
  }
]
```

#### `legibility/no-direct-node-bin-smoke`

Flags smoke tests that run source entry files directly with `node`.

Options:

- `entryPatterns`: string array of path patterns, default common source and built CLI entries.

```js
"legibility/no-direct-node-bin-smoke": [
  "error",
  {
    entryPatterns: ["src/index.ts", "dist/index.js"]
  }
]
```

## Security Posture

- No runtime dependencies.
- Published package contents are allowlisted with `files`.
- Releases are tag-triggered and publish a GitHub attestation bundle and release assets.
- npm trusted publishing is supported; npm provenance is automatic when publishing from a public repository.
- Node 26 is the default development runtime. CI tests Node 20, 22, 24, and 26.
- `pnpm test` runs the TypeScript tests in `tests/` directly through Node's test runner on the default runtime; Node 20 CI uses `pnpm test:compat`.
- CI runs TypeScript typecheck, Node test runner tests, ESLint, Oxlint, and `pnpm pack`.
- Security policy and GitHub security scanning configuration are included in the repo.

## Releases

Releases follow the same tag-triggered shape used by Pastoralist, adapted to pnpm:

```sh
pnpm release:patch:dry
pnpm release:patch
pnpm release:minor
pnpm release:major
pnpm release:beta
pnpm release:alpha
```

The release script creates the release commit locally, tags it, pushes only the tag, and restores local `main` to its starting commit. The pushed tag triggers npm publishing and GitHub release asset upload.

Before pushing a release tag, the script checks that GitHub Actions can publish with an `NPM_TOKEN` secret in the repository or `npm-publish` environment. After the package exists on npm and trusted publishing is configured for `.github/workflows/publish.yml`, use `pnpm release:tag:trusted` or pass `--trusted-publishing` to the release script instead.

The `npm-publish` GitHub environment needs an `NPM_TOKEN` secret for the first publish. The publish workflow creates npm and GitHub release assets, and the release test workflow installs the published package from npm with pnpm, then verifies ESLint and Oxlint can load the plugin.

## Attribution

The first rules were adapted from the Pastoralist `scripts/oxlint-plugin` rule set, then packaged for ESLint and Oxlint with additional legibility and performance rules.
