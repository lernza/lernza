#!/usr/bin/env bash
# Categorizes conventional commits from /tmp/commits.txt into grouped changelog.
# Used by the release workflow to build release notes.

FEAT="" FIX="" REFACTOR="" PERF="" DOCS="" TEST="" CI="" BUILD="" CHORE="" OTHER=""

while IFS= read -r line; do
  [ -z "$line" ] && continue
  entry="* $line"
  case "$line" in
    feat\(*|feat:*)         FEAT="$FEAT$entry
" ;;
    fix\(*|fix:*)           FIX="$FIX$entry
" ;;
    refactor\(*|refactor:*) REFACTOR="$REFACTOR$entry
" ;;
    perf\(*|perf:*)         PERF="$PERF$entry
" ;;
    docs\(*|docs:*)         DOCS="$DOCS$entry
" ;;
    test\(*|test:*)         TEST="$TEST$entry
" ;;
    ci\(*|ci:*)             CI="$CI$entry
" ;;
    build\(*|build:*)       BUILD="$BUILD$entry
" ;;
    chore\(*|chore:*)       CHORE="$CHORE$entry
" ;;
    style\(*|style:*)       CHORE="$CHORE$entry
" ;;
    revert\(*|revert:*)     FIX="$FIX$entry
" ;;
    *)                      OTHER="$OTHER$entry
" ;;
  esac
done < /tmp/commits.txt

print_section() { [ -n "$2" ] && printf '### %s\n\n%s\n' "$1" "$2"; }

print_section "New Features" "$FEAT"
print_section "Bug Fixes" "$FIX"
print_section "Refactoring" "$REFACTOR"
print_section "Performance" "$PERF"
print_section "Documentation" "$DOCS"
print_section "Tests" "$TEST"
print_section "CI/CD" "$CI"
print_section "Dependencies" "$BUILD"
print_section "Maintenance" "$CHORE"
print_section "Other" "$OTHER"

exit 0
