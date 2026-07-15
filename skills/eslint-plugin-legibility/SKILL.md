---
name: eslint-plugin-legibility
description: >
  Use when checking JavaScript or TypeScript readability with eslint-plugin-legibility, fixing legibility diagnostics, installing the packaged agent skill, maintaining this repository, or guiding agents through a repeatable changed-file lint feedback loop.
---

# ESLint Plugin Legibility

Use `eslint-plugin-legibility` with ESLint or Oxlint to keep JavaScript and TypeScript readable during agent-assisted development. Prefer small, behavior-preserving edits that make conditions, computed values, collection processing, naming, and control flow easier to review.

## Agent Compatibility

Use this as the shared workflow for Codex, Claude, and generic agent skill roots. Keep tool-specific rule files as generated pointers or thin wrappers over this content.

## Comment Ownership

Use `legibility/no-unmatched-comments` in agent hooks as a human-ownership gate.

- Agents must not add source comments, matcher text, or prefix/suffix identifiers.
- Treat comments accepted by a configured matcher or identifier as human-owned. Do not remove or rewrite them unless the user explicitly requests it.
- Remove an unmatched comment introduced by the agent instead of adding a matcher.
- Preserve pre-existing unmatched comments unless the task explicitly includes comment cleanup.

## Package Install

The npm package ships this skill, but does not install it automatically. After installing the package, install the skill explicitly:

```sh
npx eslint-plugin-legibility-install-skill
```

For a specific agent target:

```sh
npx eslint-plugin-legibility-install-skill --target codex
npx eslint-plugin-legibility-install-skill --target claude
```

## Developer Cleanup Loop

1. Inspect the changed JavaScript and TypeScript files before editing.
2. Run changed-file linting:
   ```sh
   npx lint-changed
   ```
3. Pass a base ref when the branch does not target `origin/main`:
   ```sh
   npx lint-changed origin/develop
   ```
4. Fix actionable diagnostics with behavior-preserving edits:

   - Hoist operator-heavy conditions into named booleans.
   - Prefer guard clauses and early returns over nested main paths.
   - Name intermediate computed values before returns and object or array values.
   - Replace repeated collection scans with lookups.
   - Split long array chains when each step deserves a name.
   - Keep JSX and object literals free of hidden complex logic.

5. Re-run `npx lint-changed` until the touched files are clean or only documented unrelated failures remain.

Do not run `eslint .`, `pnpm lint`, or `oxlint .` for the cleanup loop unless the user asks for full-repo validation.

## Repository Maintenance Loop

In this repository, use the local package:

```sh
pnpm build
npx lint-changed
pnpm test
```

For a full release-grade check:

```sh
pnpm validate
```

When changing public rule behavior:

- Update rule metadata and implementation in `src/constants.ts` and `src/index.ts`.
- Add positive and negative tests in `tests/unit/plugin`.
- Update README rule tables and examples when public behavior changed.
- Rebuild generated agent artifacts with `pnpm build:agent -- --target all`.

## Review Guidance

- Do not install dependencies or fetch packages unless the user asked for it.
- Do not rewrite code just to satisfy a diagnostic when behavior would become less clear.
- Treat false positives as rule bugs and add regression tests before broadening detection.
- Keep generated build artifacts out of commits unless they are package-facing artifacts.
