# 03: Hunt model and Area list (tracer bullet)

**What to build:** The first end-to-end slice. Below the logo, the sidebar lists every space as an Area, with its Hunters underneath, driven by a pure hunt model with no Herdr imports.

- Area rows have two lines. The first holds the Monster's face, the space name, the map name, a worst-state dot and `⌃N`. The second holds the first terminal's path and branch.
- Hunter rows show a 38 px face, the Class, a state label with its icon, and the program name in place of Rank for now.
- A Hunter that Needs help gets a peach frame.
- Clicking an Area selects its space, right-clicking opens its menu, and dragging reorders.
- Clicking a Hunter focuses its agent.

This ticket brings in the Ninja Adventure art needed so far (6 Hunter facesets and 6 Monster facesets) from the official CC0 zip, with credits. It also sets up `node --test` for the hunt model.

**Blocked by:** 02

**Status:** done

- [x] Spaces take maps in order (Forest, Desert, Dungeon, Field, Ruins, Lakeside) and cycle past six; each map shows its Monster's face
- [x] The space name falls back to Herdr's naming (repo, then folder, then `~`); a renamed space shows its custom name; path shows `~` for home, is shortened when long, and has no branch outside git
- [x] Classes are assigned in order of first appearance across the workspace (Knight, Mage, Archer, Rogue, Monk, Samurai), cycle after six, and stay with a Hunter while it lives
- [x] working/blocked/done/idle show as ⚔ Hunting / ! Needs help / ✓ Cleared / z Resting in the spec's colors; the Area dot shows the worst state (Needs help > Hunting > Cleared > Resting)
- [x] A Hunter row shows its own branch only when it differs from its Area's branch
- [x] An Area with no Hunters shows only its two lines
- [x] Hunt model tests cover map cycling, Class order and cycling, state mapping, worst state, branch-only-when-different and path display, and pass with `node --test`
- [x] Art comes from the official Ninja Adventure zip; a credits file names pixel-boy and AAA and CC0
- [x] `herdr-app check` passes; a `herdr-app shot` matches the Area list in `docs/records/2026-11-05-preview.html`

## Comments

- Done in the live config, then `scripts/sync.sh`. New files in `mods/pixel-hunter/`:
  - `hunt.js`: the hunt model, pure, no Herdr imports. `world.js`: the only Herdr adapter (builds the snapshot from `spaces()`, `panes()`, `keys()`, `home()`, runs `hunt()`, writes the persisted part to `shared("pixel-hunter.state")` only when it changed). `areas.js`: the Area list view. `sidebar.js` now draws `areaList` under the logo.
  - `test/hunt.test.js`: 12 `node --test` cases (run `node --test` inside the mod folder). Map cycling, name fallback, path display, first-terminal path/branch in tab order, Class order/cycling/keeping, state kept for unknown fields, state mapping + worst state, empty Area, branch-only-when-different, program + shortcut, sparse/missing input.
  - `art/chars/<Char>/Faceset.png` (Knight, SorcererBlack, Hunter, NinjaMasked, Monk, Samurai) and `art/boss/<Boss>/Faceset.png` (GiantRacoon, DemonCyclop, GiantSpirit, TenguBlue, GiantRedSamurai, GiantFrog), all 38x38, copied unchanged from the official zip `Ninja Adventure - Asset Pack.zip` (pixel-boy.itch.io pack page, itch's own download flow, sha256 in the credits). `art/CREDITS.md` names pixel-boy, AAA and CC0 and maps each file to its pack path. Later tickets should put Idle/Attack/Hit strips in the same folders under their pack names.
  - `demo.js` + `props.demo`: a block with `{ "role": "sidebar", "demo": true }` draws a fixed mock-like snapshot through the real model (never persisted). Used for the verification shot; useful for `preview.png` in ticket 10.
- **Hunt model API** (extend it, don't fork it): `hunt({ spaces, panes, home, keys, state, now }) -> { areas, state }`.
  - Input `spaces`: `{ id, name, named, folder, branch, active, tabs: [{ id, index }] }`; `panes`: `{ pane, terminal, tab, status, program, cwd, branch, focused }` (status null = not an agent); `keys`: `{ 1: "⌃1" }`; `state`: persisted, unknown fields are passed through untouched; `now` is accepted but unused so far.
  - Area: `{ id, index, name, named, current, map: { id, name, monsters }, monster: { id, name }, worst, path, branch, key, hunters }`. Hunter: `{ terminal, pane, tab, cls: { name, sprite }, state, status, program, branch, focused }`. States are `help | hunting | cleared | resting`; `STATES` gives label/icon/theme color, `PRIORITY` the order.
  - Exports also `MAPS`, `CLASSES`, `huntState`, `worstState`, `mapFor`, `displayPath(path, home, max = 30)`, `folderName`, `keyLabel`.
  - Ticket 04 (arena) adds arena order + `+N` to each Area; 05 adds HP/mode/Slain to Areas and `state.hp`/`slain`; 06 replaces `hunter.program` with `rank`/`stamina` (inputs: session records, grade table); 08 adds `expanded` and `state.collapsed`; 09 adds the Class override config as an input to `assignClasses`.
- Decisions / deviations:
  - Class assignment: a new Hunter takes the Class used least among living Hunters, ties by Class order. That gives Knight, Mage, Archer... in order of first appearance and cycles after six, and a Hunter that closes frees its Class for the next one. Persisted as `state.classes[terminal]`; dead terminals are dropped.
  - Name: Herdr's `space.name` (already repo, folder, `~`) unless `named`; the model only derives a folder name / `~` when Herdr gives no name. Path and Area branch come from the first pane with a cwd in tab order (as the shipped `spaces` mod does), and fall back to `space.folder` / `space.branch`, then home.
  - An Area with no Hunters gets a dot in `border` color (no state). The Area's left 10 px is kept empty for ticket 08's chevron, and the path line is indented 18 px as in the mock. No HP bar yet (ticket 05).
  - Area head behaviour copies the shipped `spaces` mod: press+release on the same Area runs `space.select`, release on another runs `space.move` (accent 2 px drop line), right-click opens `menu` with `{ tab: "space", target: { id } }`. Hunter click runs `agent.focus { terminal }`. Real clicks were not scripted (no synthetic input available and the window is in use); the commands were checked with `herdr-app do`.
- Watch out (for RECIPE / later tickets):
  - `.flex_shrink()` with no argument throws "expected a number, got nil" at render, and `herdr-app check` does not catch it because it renders the mod without props (role-less `div`). Always check the real window (`herdr-app shot` + `herdr-app status`). A quick API check: `npx -p typescript tsc -p jsconfig.json --noImplicitAny false` in the mod folder shows missing arguments.
  - Pixelify Sans draws its `fi`/`fl` ligatures like an "A" ("fix" read "Ax"). `areas.js` exports `plain(text)`, which puts a zero-width non-joiner after each `f` before `f/i/l/t`. Use it for every user string (tab names, pane headers in 07).
  - Pixelify Sans has no `⚔`; it falls back to a system glyph that reads as a small cross at 13 px. `~` draws as a short wave close to a dash. Both are the font, same as in the mock.
- Verified: `node --test` 12/12 pass; `herdr-app check` passes; `layout.switch pixel-hunter` ok; `herdr-app status` errors `[]`; shots of the live window (one Area, two Hunting Hunters) and of the demo snapshot (4 Areas Forest/Desert/Dungeon/Field, all four states, peach Needs help frame, `⎇ fix/cart` only on the differing Hunter, empty Areas showing only two lines, custom name "Login fix", no branch for `~/dotfiles`) match the Area list in `docs/records/2026-11-05-preview.html` apart from the HP bars and chevrons that later tickets add.
