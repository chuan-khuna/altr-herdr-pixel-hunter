#!/usr/bin/env bash
# Copy the live monster-hunter layout and its mods from the Herdr config into this repo.
set -euo pipefail
NAME=monster-hunter
HOME_DIR="${HERDR_HOME:-$HOME/.config/herdr-app}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO/$NAME"

[ -f "$HOME_DIR/layouts/$NAME.json" ] || { echo "no $HOME_DIR/layouts/$NAME.json yet" >&2; exit 1; }

rm -rf "$DEST/layouts" "$DEST/mods"
mkdir -p "$DEST/layouts" "$DEST/mods"
cp "$HOME_DIR/layouts/$NAME.json" "$DEST/layouts/"
for ext in svg png; do
  [ -f "$HOME_DIR/layouts/$NAME.$ext" ] && cp "$HOME_DIR/layouts/$NAME.$ext" "$DEST/layouts/"
done

shopt -s nullglob
for mod in "$HOME_DIR"/mods/"$NAME"*/; do
  m="$(basename "$mod")"
  rsync -a --exclude gpui-kit.d.ts --exclude jsconfig.json "$mod" "$DEST/mods/$m/"
  echo "copied mod $m"
done
echo "synced layout $NAME -> $DEST"
