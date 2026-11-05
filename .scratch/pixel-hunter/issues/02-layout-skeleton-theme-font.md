# 02: Layout skeleton with theme and font

**What to build:** A live `pixel-hunter` layout in the Herdr config that the user can switch to. It has a 320 px fixed sidebar showing only the logo row ("PIXEL HUNTER" in Press Start 2P), a work column with a 44 px tab bar (Herdr's shipped tabs are fine for now), panes with 2 px square frames and an 8 px gap, and a hidden 360 px side panel for Files/Changes. The whole window uses the `pixel-hunter-night` theme and Pixelify Sans, matching `docs/records/2026-11-05-color-theme.html`. Set up the single `pixel-hunter` mod with roles chosen by props, so later tickets add roles instead of new mods.

**Blocked by:** 01

**Status:** done

- [x] `layout.switch pixel-hunter` shows the sidebar, tab bar and panes; `herdr-app status` lists no errors
- [x] The theme `pixel-hunter-night` uses exactly the spec's token values; focused pane frame is accent (mint)
- [x] Pixelify Sans (UI) and Press Start 2P (logo) are shipped in the mod's fonts folder with their OFL licenses and render in the window
- [x] Radius is 0 everywhere; frames are 2 px
- [x] `herdr-app check` passes for the mod
- [x] The sync script copies the layout, theme, mod and fonts into the shared folder

## Comments

- Done in the live config, then `scripts/sync.sh`:
  - `layouts/pixel-hunter.json`: root row (`titlebar: none`, traffic lights `[16, 15]`, theme `pixel-hunter-night`, `ui_font: "Pixelify Sans"`, 2 px `border` dividers). `sidebar` column 320 px fixed: `logo` block 44 px (`window_drag`) and `areas` block. `work` column: `tabs` block 44 px with the shipped `tabs` mod, then `work-body` row (padding 8, gap 8): `main` tab block (pane gap 8, radius 0, border 2 `border`, focus 2 `accent`, `lone: true`) and the hidden `panel` column 360 px (stack `panel-body` with shipped `files` / `changes`). I kept the ids `panel` / `panel-body` / `files` / `changes` because the shipped tabs mod's Files/Changes buttons look for them.
  - `themes/pixel-hunter-night.json`: every spec token at its exact value (canvas/background `#101a24`, chrome `#15222e`, surface `#192a38`, selected `#1c2f40`, border `#2e475b`, dim `#7e9e99`, foreground `#c5ccb8`, accent `#95c5ac`, working `#7ca1c0`, blocked `#f3a787`, done `#6eaa78`, plus a custom `hp` `#c38890`). Herdr-only names (muted, idle, input, raised, hover...) reuse spec values. I picked the ansi colors from Vinik24 and nearby tones. Text colors are all at least 4.7:1 on chrome and selected.
  - `mods/pixel-hunter/`: one mod, and `main.js` sends `props().role` to a role module (`logo`, `sidebar`). `theme.js` holds the font names, `FRAME = 2` and the night fallbacks (used for `hp` if a theme lacks it). The `sidebar` role is empty chrome for ticket 03 to fill.
  - Fonts in `mods/pixel-hunter/fonts/`: Pixelify Sans Regular/SemiBold/Bold (static TTFs from the upstream repo github.com/eifetx/Pixelify-Sans) and PressStart2P-Regular.ttf (github.com/google/fonts ofl/pressstart2p), with `OFL-PixelifySans.txt` and `OFL-PressStart2P.txt`. Neither font is installed system-wide, and both render in the window (checked with `herdr-app shot`).
- Sync script now also copies `themes/pixel-hunter*.json`. AGENTS.md's tree lists `themes/`.
- Verified: `herdr-app check` passes, `layout.switch pixel-hunter` works, `herdr-app status` errors `[]`. Pixel checks on a shot: sidebar 320 px, dividers 2 px, pane frames 2 px with no rounding, 8 px gap, focused frame `#95c5ac`, panel 360 px when shown.
- Deviations / notes for later tickets:
  - Shipped mods still draw their own rounded corners: tab pills in `tabs`, and the inner top corners of the Files panel. Ticket 07 replaces the tab bar with a `tabs` role. Files/Changes stay shipped, so their inner rounding stays.
  - The shipped tabs mod draws its own 1 px bottom line just above the 2 px divider.
  - The logo is 10 px Press Start 2P (as in the preview mock), with an 82 px left inset on macOS for the traffic lights. The gear icon from the mock is not added.
  - There is no pane header yet (ticket 07). Mods should use 15 px text with Pixelify Sans, since `ui_font` sets the family only.
  - The sync deletes the `.gitkeep`s in `layouts/` and `mods/` (expected per ticket 01).
