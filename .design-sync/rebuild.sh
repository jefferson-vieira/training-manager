#!/usr/bin/env bash
# design-sync rebuild for training-manager.
#
# globals.css is a Tailwind 4 SOURCE file, so the compiled stylesheet that
# cfg.cssEntry points at must be regenerated BEFORE the converter runs —
# otherwise the bundle ships stale utilities (or none). The previews directory
# is in the Tailwind @source set, so authoring a preview that uses a new
# utility class requires this script, not a bare package-build.mjs run.
#
#   .design-sync/rebuild.sh            build + validate
#   .design-sync/rebuild.sh --no-validate   build only
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ compiling Tailwind"
(cd packages/web && node "$ROOT/.ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs" \
  -i .ds-css/entry.css -o .ds-css/compiled.css)

echo "→ building bundle"
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules "$ROOT/node_modules" --out ./ds-bundle

if [[ "${1:-}" != "--no-validate" ]]; then
  echo "→ validating"
  node .ds-sync/package-validate.mjs ./ds-bundle
fi
