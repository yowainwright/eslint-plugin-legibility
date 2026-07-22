# Lint

Run lint checks for this project.

$ARGUMENTS

Never run `eslint .`, `pnpm lint`, or `oxlint .` — these lint the entire codebase and consume unnecessary tokens.

Always run:

```sh
npx lint-changed
```

This only lints files changed vs `origin/main`. New files are checked at error level; modified files at warn level.

Agents do not add source comments by default. `legibility/no-unmatched-comments` allows a comment when it matches a configured prefix, suffix, or other matcher. `legibility/no-stacked-comments` means an adjacent comment should be updated or removed instead of stacking another one.

To override the base branch:

```sh
npx lint-changed origin/develop
```
