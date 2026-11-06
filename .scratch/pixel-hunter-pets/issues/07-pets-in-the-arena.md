# 07: Pets in the arena

**What to build:**

- The arena draws up to four Hunters. Each one gets its Pets as 16×16 animal sprites at 2×, by its feet: at most 2, then a small `[+N]`.
- Hunting Pets swap between their two frames. A Pet that Needs help shows a blinking `!`, once ticket 06 is done.
- Pets of Hunters the arena doesn't draw aren't drawn either.
- Nothing redraws while no Hunter or Pet is Hunting.
- RECIPE.md's **Watch out** section covers the Pet setup and the 2-minute limit.

**Blocked by:** 05

**From ticket 05:** the sprite sheets are in `art/animals/<Animal>/SpriteSheet.png` (32×16, two 16×16 frames), with no `art/x4/` copies yet (`tools/build-art.py` makes those).

**Status:** done

- [x] Pet sprites sit beside their Hunter without covering the Monster, the HP bar or the caption
- [x] `[+N]` appears when a drawn Hunter has more than 2 Pets
- [x] Hunting Pets loop their two frames, and nothing redraws when no one is Hunting, checked the same way as in earlier tickets
- [x] Screenshots of the demo snapshot and of a live session with Pets
- [x] RECIPE.md is updated from the real files
- [x] `herdr-app check` passes

## Comments

- Done in the live config, then `scripts/sync.sh`.
  - `arena.js`: `pets()` / `pet()` draw each drawn Hunter's `pets.shown` from the hunt model (no model change). A Pet is its animal's x4 sprite sheet, 16 × 16 at 2×, top-left at (−16, +20) and (+16, +20) from the Hunter's slot, in front of the Hunter; each Hunter and its Pets go in slot order, so lower slots stand in front. `[+N]` (10 px chip) is drawn last: left of the pair on slots 1 and 3 (−38, +36), right of it on slots 2 and 4 (+46, +36). Under the pair it would sit on the next Hunter's head or the caption.
  - Hunting: the two frames under `before` / `after(0.5, 640 ms)` opacity loops (320 ms each). Needs help: frame 0 under a 16 px peach `!` with `.frames(["!", " "], 400)`, as the Hunter's. No new timer.
  - The arena's `active` flag (Resting `z` float, Monster idle while someone Needs help) now counts Pets too; `arenaPick` stays Hunters-only, so Pets of undrawn Hunters aren't drawn.
  - `tools/build-art.py` also writes `art/x4/animals/<Animal>/SpriteSheet.png` for the 10 animals (credits updated). Rerunning it gave pixel-identical but byte-different PNGs for five Hunter strips; I put the old bytes back so only the new files change.
- Verified: `herdr-app check` passes, `node --test` 83/83, `herdr-app status` errors `[]`. Shots in `07-shots/` (sidebar crops at 2×, arena at 3×):
  - `demo-sidebar.png`, `demo-arena-frames.png`: the demo snapshot (`"demo": true` on the sidebar props, layout file restored afterwards, `cmp` identical). Slot 1 cart's Frog under the `!` (on in one panel, off in the other), slot 2 login's Dog + Cat with `[+3]`, slot 3 docs' Dog2; none over the Monster, HP bar or caption. Back-to-back shots ~50 ms apart: each Hunting Pet's pixels flip between two hashes about every 320 ms, the `!` about every 400 ms.
  - Live: Claude Code 2.1.318 in a temporary space `ph07` (terminal `t2p`, `space.new`, switched to manual mode), with the README block plus the statusLine in a throwaway project's `.claude/settings.local.json`.
    - `live-1-hunting-*.png`: four subagents running `ping -n 60` → the Knight (slot 1) with Chicken + Dog swapping frames and `[+2]` left of them. (A bare `sleep 50` is refused by Claude Code's Bash tool; those subagents ended at once.)
    - `live-2-help-*.png`: a subagent's `mkdir` prompt went `help` in the record, but was answered within seconds (not by me) before I shot it. So the `!` is shown with a hand-written `help` record (Monkey) beside two live Hunting Pets (Racoon, Pig): the Monkey takes the first spot under a blinking `!`, `[+1]`. Record deleted afterwards.
    - `live-3-calm-sidebar.png`: after the subagents ended, Hunter Resting, Monster Slain, no Pets: 70 arena shots over 2.4 s, one hash. Nothing redraws.
  - `~/.claude/settings.json` was never edited: SHA-256 `7d12b7e4…c761` before and after.
  - Cleanup: closed `ph07` (its terminal ended), deleted `pets/t2p` and `sessions/t2p.json`, removed the throwaway project, and focused the space, tab and pane I started on (`t9`). Claude Code keeps a folder-trust entry for the throwaway folder, as in tickets 01, 05 and 06. Twice during the live run the window went back to my own space without a command from me; I re-selected `ph07` and checked `herdr-app status` before and after each burst of shots.
- `pixel-hunter/preview.png` retaken (1466 × 990, `herdr-app shot`): the demo sidebar (`"demo": true`, restored afterwards) beside a temporary space `shop-api` (throwaway git repo on `feat/login`, tab `login`) running a Git Bash `-l` script that prints a made-up transcript and reports OSC 7501 `state=working`, with a session record from the real `statusline.mjs` fed by hand (`Opus 5.5`, 128k/200k). It shows the layout F rows, three-line Area rows, Pet lines and arena Pets with `[+3]` and the blinking `!`. Space closed and its record deleted afterwards.
- Docs: `RECIPE.md` from the files (intro, arena Pets in What you see with positions, Pets in the arena and wake rules in How it behaves, build-art and art in Built from, Watch out on the Pet setup, the 2-minute limit, the crowded arena and the Pet loops, Done when checks), README Pets section, `pet-tracking-hooks.md` (status built, "Built in ticket 07"), `INDEX.md`.
- Not verified:
  - A real Needs help Pet in the arena that stays long enough to shoot (see above; the hand-written record goes through the same reader and drawing code).
  - Twice the Monster looked faded in the first shot after it was mounted (right after my `arena.js` edit reloaded the mod, and right after a Respawn), then normal. It looks like its `opacity` transition running from 0 on a new element. It's in the Monster code from earlier tickets, not the Pets, so I left it.
