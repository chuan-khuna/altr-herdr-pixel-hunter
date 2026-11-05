# 05: Monster HP, Slain and Respawn

**What to build:** The Monster reacts to its Party.

- While any Hunter in the Area is Hunting, the Monster plays its Hit strip with a small shake, and its HP wears down over time. HP is cosmetic.
- When no Hunter is Hunting and at least one is done, the Monster is Slain: HP drops to 0, and it falls and fades.
- When a Hunter starts Hunting after that, a fresh Monster Respawns with full HP.

HP shows as a bar in the arena and as a small bar in the Area row. HP and Slain state survive a Herdr restart.

**Blocked by:** 04

**Status:** done

- [x] Hunt model tests (with injected time) cover HP wear, Slain only when nobody is Hunting and someone is done, a mixed Party (one Cleared, one Hunting) keeping the Monster alive, and Respawn on new Hunting
- [x] The arena HP bar and the Area row HP bar agree
- [x] Restarting Herdr keeps each Area's HP and Slain state
- [x] A Slain Monster's Area row shows an empty HP bar
- [x] `herdr-app check` passes

## Comments

- Done in the live config, then `scripts/sync.sh`. This machine (Windows) had no pixel-hunter in `~/.config/herdr-app` (01–04 were built on macOS), so I first copied the repo's `pixel-hunter/` layout, theme and mod in unchanged (`herdr-app check` passed), then built on that.
- **Hunt model** (`hunt.js`), extending the API (nothing forked):
  - Input: each pane may carry `report`, herdr-core's own status for its terminal (`terminals()[i].status`). `now` is now used.
  - Area output: `hp` (0..`HP_MAX` 100, now), `mode` (`hit` | `slain` | `idle`), `wearing`. Exports `HP_MAX`, `HP_FLOOR` (5), `HP_HALF_MS` (4 min) and `hpAfter(hp, ms)`.
  - Wear: while anyone in the Party is Hunting, HP halves its way toward 5 every 4 min (100 → 52 after 4 min → 29 after 8), so a long hunt keeps moving and only Slain reaches 0. Needs help / Resting pause it. Slain: nobody Hunting and someone's agent done → HP 0, and it stays Slain (even once the done agent turns idle) until someone Hunts again → Respawn at 100, wearing from then.
  - Persisted as `state.monsters[spaceId] = { hp, since, slain }`. `hp` is the HP at `since` (ms) while wearing, or for good when `since` is null. A record changes only when the Party starts or stops Hunting, is Slain or Respawns, so renders don't rewrite shared state. Records of closed spaces are dropped, but not while `spaces()` is empty (startup). Bad records start fresh.
  - 8 new `node --test` cases (22 in total), all with injected time: fresh full HP, wear plus pause plus resume, state not rewritten per render, Slain only with nobody Hunting and someone done (mixed Cleared + Hunting stays alive, Needs help + Resting doesn't fall), Slain surviving the agent turning idle, finished-while-watched, Respawn, restart (state through JSON, an empty first render loses nothing), pruning and bad records.
- **Deviation: what counts as "done".** Herdr's `panes()`/`agents()` show `done` only until someone looks, then `idle`. So in the Area you're watching, a finished agent goes straight to Resting and, by the literal rule, the Monster would never fall. herdr-core keeps `done` (`terminals()`, `hc ls`), so `world.js` passes it as `report`, and the Slain rule counts a Hunter whose window status or core status is `done`. The Hunter's label still follows Herdr (Resting once seen). This matches the glossary ("at least one Hunter's agent is done"). Checked with a fake agent: core `done`, window `idle`, Monster Slain.
- **Deviation: a slow redraw while Hunting.** HP depends on time, but Herdr doesn't redraw the sidebar by itself during a hunt: a temporary render counter stayed at 1 for 15 s while an agent worked. So `sidebar.js` arms one `cx.timer.after(HP_TICK_MS = 10 s)` while any Area's HP is wearing, and re-arms it only from the next render if HP is still wearing. That is one redraw per 10 s, only while someone Hunts. With nobody Hunting nothing is armed, so the calm rule from 04 still holds. I tried a timer-free version first (each render aims a 30 s linear width transition ahead). It left the two bars out of step (a new element jumps, an old one lags mid-glide), so I dropped it.
- **Views:**
  - `areas.js` exports `hpBar(key, area, width, c)`, used by both bars, so they always draw the same `area.hp`. It's a 2 px `border` frame on `canvas`, an 8 px `hp` fill rounded to whole px, and a 600 ms linear `width` transition (wear steps, the drain when Slain, the refill on Respawn). Measured on shots: arena 54/106 px with row 31/60, then 51/106 with 29/60 (both about 51% → 48%).
  - The Area row bar is 64 px wide on a **third line** under the path. Next to the dot on line 1 it squeezed the space name to "al…"; the 76 px face leaves room for a third line, so the row doesn't get taller.
  - Arena: the bar is 110 px at right 12 / bottom 8 (as in the mock), with `HP` (`dim`) or `SLAIN` (`foreground`) under it on `canvas` at `cc` alpha. The Monster by mode: `hit` plays the Hit strip at 90 ms a frame (there and back, same band-loop trick as Idle) inside a `loop("left", -2..2, 300 ms, linear)` shake. `idle` keeps 04's behaviour. `slain` is the still first Idle frame on `ph-arena-mbody-<Monster>`, dropped 14 px and faded to 0.35 by one 600 ms `top` + `opacity` transition. That element keeps its id across modes, so the fall plays when the Monster dies and runs back up on Respawn; a Monster already Slain when the arena first draws just lies there. `MONSTER_ART[*].hit` holds each strip's frames and feet (feet = exclusive bottom of the opaque area, as in 04).
- **Art:** `boss/<Boss>/Hit.png` (Cyclop 3x50, Spirit 3x50, Tengu 8x68, Red Samurai 8x48, Frog 3x40) and `boss/GiantRacoon/Attack.png` (4x60, the Racoon has no Hit). `tools/build-art.py` now writes their x4 copies. **Provenance:** the download of the official zip from itch was blocked in this session, so these six came from the pack copy in `docs/records/2026-11-05-preview/na/` (a public mirror). All 27 files that copy shares with the official zip are byte-identical to it, and `art/CREDITS.md` says so. Check the six against the zip (sha256 in CREDITS) when it's at hand.
- `build-art.py` on this machine (uv + Pillow) wrote 20 Hunter x4 files pixel-identical to the committed ones but with different PNG bytes. I kept the committed files, so there's no churn. Re-running on another Pillow version may rewrite bytes without changing pixels.
- `scripts/sync.sh`: Git Bash on Windows has no `rsync`, and the script had already cleared `pixel-hunter/mods`. It now falls back to `cp -R` and deletes `gpui-kit.d.ts`/`jsconfig.json`.
- `demo.js` now carries Monster state like the mock: shop-api at 58 and Hunting, the Desert Monster Slain (empty bar), Login fix at 80, dotfiles full. A demo shot matched.
- Verified: `node --test` 22/22; `herdr-app check` passes; `herdr-app status` errors `[]` throughout. In the real window, with a throwaway agent (a bash loop printing `ESC ] 7501 ; state=<s> BEL` in a temporary space, removed afterwards): Hunting gives the Hit strip, HP wearing and both bars agreeing. `done` gives an empty row bar, `SLAIN`, the Monster lowered and faded, and `{hp: 0, slain: true}` in `shared.json`. `working` again gives a Respawn at full HP with the Hit strip. A fresh start of the mod (`layout.switch main` and back, which starts mods fresh from the saved shared state) kept the Forest HP at the same pixel and the Desert Area Slain with an empty bar.
- Not verified: a full Herdr app restart (the window was in use; persistence is the on-disk `shared.json` and is covered by a model test plus the mod restart above). The 600 ms fall mid-motion (shots only caught before and after). Whether Claude Code itself reports `done` to the core at the end of a turn (the fake agent did).
- For later tickets:
  - `displayPath`/`folderName` split on `/` only. On Windows the Area path shows `…/undefined` (cwd `C:\Users\...`). That's a ticket-03 bug outside 05. Fix it in the model with a test for backslash paths (and drive letters vs `home()`).
  - Ticket 06 (Rank/Stamina): if it needs time-based staleness on screen, reuse the sidebar's `HP_TICK_MS` one-shot rather than adding a second timer.
  - Tabs / pane headers (07) can show HP from `area.hp` via `hpBar`; don't arm another redraw timer in those roles.
  - OSC 7501 for testing: `printf '\033]7501;state=working\007'` in a terminal labelled `herdr.space=<id>` and `herdr.tab=<id>` (`hc run --bg --no-parent --label ...`).
