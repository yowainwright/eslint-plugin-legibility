#!/bin/sh

set -eu

managed_hook_marker="legibility-managed-hook"

is_unmanaged_hook() {
  hook_path="$1"
  [ -f "$hook_path" ] && ! grep -Fq "$managed_hook_marker" "$hook_path"
}

install_pre_commit_hook() {
  pre_commit_path="$hooks_directory/pre-commit"
  if is_unmanaged_hook "$pre_commit_path"; then
    return 0
  fi

  cat > "$pre_commit_path" <<'HOOK'
#!/bin/sh
# legibility-managed-hook

set -eu

pnpm validate
HOOK
  chmod 755 "$pre_commit_path"
}

install_post_merge_hook() {
  post_merge_path="$hooks_directory/post-merge"
  if is_unmanaged_hook "$post_merge_path"; then
    return 0
  fi

  cat > "$post_merge_path" <<'HOOK'
#!/bin/sh
# legibility-managed-hook

set -eu

changed_files="$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD || true)"

case "$changed_files" in
  *package.json*|*pnpm-lock.yaml*)
    echo "Dependencies changed; running pnpm install --frozen-lockfile"
    pnpm install --frozen-lockfile
    ;;
esac
HOOK
  chmod 755 "$post_merge_path"
}

remove_obsolete_hook() {
  obsolete_hook_path="$hooks_directory/commit-msg"
  if [ ! -f "$obsolete_hook_path" ]; then
    return 0
  fi
  if ! grep -Fq "$managed_hook_marker" "$obsolete_hook_path"; then
    return 0
  fi

  rm "$obsolete_hook_path"
}

ci="${CI:-}"
if [ "$ci" = "true" ] || [ "$ci" = "1" ]; then
  exit 0
fi

hooks_directory="$(git rev-parse --git-path hooks 2>/dev/null || true)"
if [ -z "$hooks_directory" ]; then
  exit 0
fi

mkdir -p "$hooks_directory"
install_pre_commit_hook
install_post_merge_hook
remove_obsolete_hook
