# Lint

Run lint checks for this project.

$ARGUMENTS

Never run `eslint .`, `nub run lint`, or `oxlint .` — these lint the entire codebase and consume unnecessary tokens.

Always run:

```sh
npx lint-changed --comments=forbid
```

This only lints files changed vs `origin/main`. New files are checked at error level; modified files at warn level.

Agents do not add source comments by default. The session flag enables `legibility/no-unmatched-comments` as an error without changing the project config. Configure a prefix, suffix, or matcher in the project config when comments must be allowed.

To override the base branch:

```sh
npx lint-changed origin/develop --comments=forbid
```
