#!/bin/sh

set -eu

ci="${CI:-}"
npm_command="${npm_command:-}"

if [ "$ci" = "true" ] || [ "$ci" = "1" ]; then
  exit 0
fi

if [ "$npm_command" = "pack" ] || [ "$npm_command" = "publish" ]; then
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  exit 0
fi

pnpm run install-hooks
