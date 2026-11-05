# 02: Three-line Area rows

**What to build:** In the live layout, each Area row shows the 76 px Monster face beside three lines:
1. the space name, with the worst-state dot and `⌃N`
2. the path
3. the branch (`⎇ name`, empty outside git)

The map name and the HP bar leave the row, and the arena keeps them. The path line never shows `undefined`. The result matches the revised Area rows in `docs/records/2026-11-05-preview.html`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Hunt model test: when an Area's first terminal has no cwd, the path falls back to the space folder, then to home, and never contains `undefined`
- [x] Area rows show three lines with the face spanning all three, and no map name or HP bar
- [x] An Area outside git shows an empty branch line
- [x] Collapse/expand, click, right-click and drag still work as before (handlers unchanged; not clicked by a real mouse, see Comments)
- [x] Screenshots of the live window and the demo snapshot match the preview record
- [x] `node --test` and `herdr-app check` pass

## Comments

- Done in the live config, then `scripts/sync.sh`.
  - `hunt.js`: an Area's path and branch now come from its **first terminal** (tab order). While that terminal has no cwd, they come from the space's folder and branch, then home (`~`). Before this, the first terminal *with* a cwd was used, so a just-opened first terminal showed a later one's folder. A new `text()` guard treats any non-string or blank cwd, folder or home as missing, in `displayPath` and `folderName` too. A lone UNC `\server\share` no longer builds a `\server\undefined` head when cut.
  - `areas.js`: the head is the 76 px face beside three lines, each a third of the face's height: (1) name (semibold, flex), dot (`dim` with no Hunters, as the record's dotfiles row; it was `border`) and `⌃N`; (2) path, 13 px `dim`, truncated; (3) `⎇ branch`, 13 px `foreground`, truncated, empty outside git but keeping its height. The `· Map` and the 64 px HP bar are gone from the row (`HP_ROW_W` removed); `hpBar` stays for the arena. The head's handlers (press/release select, drag, right-click menu) and the chevron are untouched.
  - `RECIPE.md` **What you see** / **Done when** updated from the files (three lines, no HP in the row, 49 tests).
- New test (49 in all): with no cwd on the first terminal the path is the space folder (and its branch), then `~`; a grid of odd cwd/folder/home values (undefined, null, "", numbers, objects, blanks; POSIX and Windows homes) never gives a path or name with `undefined`/`null`/`object`; a short and a cut UNC path never contain `undefined`.
- Verified: `node --test` 49/49; `herdr-app check` passes; `herdr-app status` errors `[]`. Shots in `02-shots/`:
  - `live-full.png`: the live window, my own space (`D:\…\altr-herdr-pixel-hunter`, `⎇ feat/pixel-hunter-tickets…`) with three lines, no map name or HP bar; the arena keeps both.
  - `live-nogit.png` / `live-nogit-sidebar.png`: a temporary space `ph02-nogit` in a non-git scratchpad folder: the path line, and an empty branch line.
  - `demo-full.png` / `demo-sidebar.png`: the demo snapshot (layout's sidebar props given `"demo": true` for the shot, then the layout file restored byte for byte) next to `record-sidebar.png` (the record's Herdr window, rendered with headless Chrome): same rows: shop-api `~/code/shop-api` `⎇ feat/login`, herdr-monster-hunter `⎇ main`, Login fix `⎇ fix/session`, dotfiles with an empty branch line. Differences come from the data, not the row: the model cuts long paths (`~/…/herdr-monster-hunter`) where the mock lets CSS ellipsis them, and the demo's herdr-monster-hunter has no Hunters, so its dot is `dim`.
  - Afterwards I closed `ph02-nogit` and went back to the space, tab and pane I started on.
- Not verified: real mouse clicks (no synthetic input, and the window was in use). The head's click, drag, right-click and chevron code is unchanged from ticket 08's, and only the head's children changed; the chevron is still 76 px tall. The `pixel-hunter/preview.png` still shows the old two-line rows with the HP bar and needs a new shot when the Pets tickets land.
