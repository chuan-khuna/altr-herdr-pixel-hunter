#!/usr/bin/env bash
# Copy the live pixel-hunter layout, its themes and its mods (fonts included) from the Herdr config into this repo.
set -euo pipefail
NAME=pixel-hunter
HOME_DIR="${HERDR_HOME:-$HOME/.config/herdr-app}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO/$NAME"

[ -f "$HOME_DIR/layouts/$NAME.json" ] || { echo "no $HOME_DIR/layouts/$NAME.json yet" >&2; exit 1; }

rm -rf "$DEST/layouts" "$DEST/mods" "$DEST/themes"
mkdir -p "$DEST/layouts" "$DEST/mods"
cp "$HOME_DIR/layouts/$NAME.json" "$DEST/layouts/"
for ext in svg png; do
  [ -f "$HOME_DIR/layouts/$NAME.$ext" ] && cp "$HOME_DIR/layouts/$NAME.$ext" "$DEST/layouts/"
done

shopt -s nullglob
for theme in "$HOME_DIR"/themes/"$NAME"*.json; do
  mkdir -p "$DEST/themes"
  cp "$theme" "$DEST/themes/"
  echo "copied theme $(basename "$theme")"
done
for mod in "$HOME_DIR"/mods/"$NAME"*/; do
  m="$(basename "$mod")"
  if command -v rsync >/dev/null; then
    rsync -a --exclude gpui-kit.d.ts --exclude jsconfig.json "$mod" "$DEST/mods/$m/"
  else # Git Bash on Windows has no rsync: copy, then drop what a fresh install recreates
    cp -R "${mod%/}" "$DEST/mods/$m"
    find "$DEST/mods/$m" \( -name gpui-kit.d.ts -o -name jsconfig.json \) -delete
  fi
  echo "copied mod $m"
done
echo "synced layout $NAME -> $DEST"
