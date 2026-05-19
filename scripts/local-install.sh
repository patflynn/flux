#!/usr/bin/env bash
# Build the web bundle, sync into the Capacitor android project, build the
# debug APK, and install it on whichever device is currently visible to adb
# (USB or wireless-debugging via Android Studio).
#
# Run from the repo root inside the .#android dev shell:
#   nix develop .#android --command ./scripts/local-install.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo "error: ANDROID_HOME not set — run inside 'nix develop .#android'" >&2
  exit 2
fi

echo '[1/4] npm ci'
npm ci

echo '[2/4] vite build'
npm run build

echo '[3/4] cap sync android'
npx cap sync android

echo '[4/4] gradle assembleDebug + adb install'
(cd android && ./gradlew assembleDebug --no-daemon)

APK=android/app/build/outputs/apk/debug/app-debug.apk
[[ -f "$APK" ]] || { echo "error: APK not produced at $APK" >&2; exit 1; }

if ! adb install -r "$APK"; then
  echo ""
  echo "install failed — most likely cause: previously installed APK has a different signature"
  echo "  (e.g. a CI debug build). To recover (will wipe app data):"
  echo ""
  echo "  adb uninstall dev.gunk.flux"
  echo "  ./scripts/local-install.sh"
  echo ""
  echo "Export your data first via Settings → Data → Export if you want to preserve workout state."
  exit 1
fi

echo ""
echo "installed: $APK"
