# 08: Area expand and collapse

**What to build:** Area rows can collapse with ▸/▾. By default, the current Area and any Area with a Hunter that Needs help are expanded, and the rest are collapsed. A collapsed Area still shows its two lines, its dot and its HP. When the user expands or collapses an Area by hand, that choice is remembered per space across restarts and wins over the default, except that an Area with a Hunter that Needs help always opens.

**Blocked by:** 03

**Status:** done

- [x] Hunt model tests cover auto-expand for the current Area and Needs help, a manual collapse surviving a restart, and Needs help overriding a manual collapse
- [x] Clicking the chevron toggles without selecting the space (the toggle path was checked in the real window; a real mouse click was not scripted, see Comments)
- [x] `herdr-app check` passes

## Comments

- Done in the live config, then `scripts/sync.sh`.
- **Hunt model** (`hunt.js`, still no Herdr imports):
  - Each Area gets `expanded` and `held`. `areaExpanded({ current, help, collapsed })`: Needs help always opens; otherwise a choice made by hand wins; otherwise only the current Area is open.
  - Persisted as `state.collapsed[spaceId] = true | false`, where true means collapsed by hand and false means expanded by hand. A default is not a choice and is never written, so `collapsed` stays `{}` until someone clicks. It follows the `monsters` pattern: records of closed spaces are dropped, but not while `spaces()` is empty (startup), and non-boolean records are ignored.
  - `toggleArea(state, area)` returns the next state: the opposite of what the Area shows now, stored for that space. Nothing else in the state changes.
  - 5 new `node --test` cases (42 in total): the defaults (current, Needs help, other, empty; nothing persisted), a choice winning both ways and surviving a space switch, a manual collapse surviving a restart through JSON (with an empty first render), Needs help overriding a manual collapse and the choice coming back afterwards, and pruning plus bad records.
- **Views:**
  - `world.js` exports `toggleExpanded(area)`: reads `shared("pixel-hunter.state")`, applies `toggleArea` and writes only if it changed. It does nothing in demo mode.
  - `areas.js`: the 10 px left column now holds the chevron. It is as tall as the 76 px Monster face, so it's easy to hit. The icons are pixel SVGs, `icons/chevron-open.svg` (▾) and `icons/chevron-closed.svg` (▸), on a 5x5 grid drawn at 10 px (2 px art pixels), in `dim` with `foreground` on hover. **Why SVGs:** Pixelify Sans has no ▸/▾, and the fallback glyph came out as a ~4 px speck (checked on a shot).
  - **Why the chevron doesn't select the space:** the Area head selects on press plus release (`on_mouse_down`/`on_mouse_up`, not `on_click`), so the chevron stops both. Its press calls `cx.stop_propagation()` and records `self.chevPressed`. Its release toggles only if the press was on that same chevron. A release after a press somewhere else (a drag from another Area) is passed on, so dropping on a chevron still runs `space.move`. The list's own mouse-up clears `chevPressed`.
  - A collapsed Area hides only its Hunter rows. Its two lines, dot, `⌃N` and HP bar stay.
- **Decision to review: a click while Needs help holds an Area open does nothing.** The chevron is drawn at 0.5 opacity with the tooltip "Needs help keeps this Area open". The other option was to record the collapse and apply it once help is given. I didn't, because the click would show nothing, and the Area closing later by itself would be a surprise. A collapse made before the Needs help still comes back afterwards (tested).
- Verified: `node --test` 42/42; `herdr-app check` passes; `herdr-app status` errors `[]` throughout. In the real window I used a temporary `nextCommand` hook in `sidebar.js` (removed afterwards) that called the same `toggleExpanded(world(self).areas[i])` as the chevron, via `herdr-app do pixel-hunter.toggleN`. I also made a temporary space `ph08test` with a fake agent: Git Bash `-l` running an OSC 7501 loop that reads its state from a file. (Plain `bash` on this machine is WSL's and fails, and Git Bash without `-l` has no `/usr/bin` on PATH.) Shots showed, in order:
  1. The defaults: the current Area ▾ with its two Hunters, and ph08test (Hunting, not current) ▸.
  2. A toggle to ▾ with the Archer row, then back to ▸. `shared.json` showed `false`, then `true`.
  3. The agent switched to `blocked`: the Area opened with the peach Archer row, and the dimmed chevron stayed open after a toggle with no state change.
  4. Back to `working`: the manual collapse returned.
  5. A collapse of the current Area kept its lines, dot and HP.
  6. `layout.switch` to main and back (mods start fresh from shared state): both collapsed Areas stayed ▸.
  Afterwards I closed the temp space, reset `collapsed` to `{}` through the hook, and removed the hook. The window ended as it started: current Area expanded, `collapsed` `{}`, focus on the pane it was on.
- Not verified:
  - A real mouse click on the chevron. No synthetic input was available and the window was in use. So GPUI's press/release propagation order (the chevron's handlers running before the head's) is the documented behaviour, not observed here. The shipped `agents` and `pane` mods rely on the same order for their `stop_propagation` buttons.
  - The tooltip and hover colour.
  - A full Herdr app restart. Persistence is the on-disk `shared.json`, covered by the model test and the mod restart above.
- For later tickets:
  - 10 (publish): RECIPE **What you see** should mention the pixel chevrons (`icons/chevron-*.svg`, 10 px, `dim`). **How it behaves** should give the rule (current or Needs help open, a choice by hand wins and is remembered per space, Needs help always opens and locks the chevron). In `demo.js` only the current Area (shop-api) is open, as in the mock. Login fix is Hunting but collapsed by default.
  - For testing with fake agents on Windows, use `"argv": ["C:/Program Files/Git/usr/bin/bash.exe", "-l", "<script>"]` in `space.new`. `herdr-app do` takes the args as one JSON object after the command name (`herdr-app do layout.switch '{"name":"main"}'`).
