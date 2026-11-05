# 08: Monster attacks every 5 seconds

**What to build:** Today, while someone in the Party is Hunting, the arena Monster plays its Hit strip non-stop (`hit` mode in `mods/pixel-hunter/arena.js`: 90 ms frames, shaking 2 px either way every 300 ms; the Giant Racoon plays its Attack strip because it has no Hit strip). That is too busy. While the Party Hunts, the Monster should play its Idle strip and play the Hit (Attack) strip once every 5 seconds, then go back to Idle.

- One Hit (Attack) play is the strip once through, there and back, as now: `2 × frames × 90 ms`. The 2 px shake runs only during that play.
- The Monster's feet stay on the same spot when it switches between Idle and Hit, using each strip's `feet`.
- Idle, Slain, the Hunter swap and the Needs help `!` do not change.
- Nothing redraws while no one is Hunting or Needing help, as now.
- Prefer native loops (`.loop` with the `after` / `before` square-wave trick) over a JS timer, so a 5 s cycle doesn't cost a render every frame.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] While Hunting, the Monster plays its Hit (Attack) strip once every 5 s and its Idle strip in between, for all six Monsters
- [x] The shake only happens during the Hit play
- [x] The Monster's feet don't jump when it swaps strips
- [x] Nothing redraws when no one is Hunting, checked the same way as in earlier tickets
- [x] A short screen recording or before/after screenshots of a live session with a Hunter Hunting
- [x] RECIPE.md's **How it behaves** matches the new timing, updated from the real files
- [x] `herdr-app check` passes

## Comments

- Done in the live config, then `scripts/sync.sh`. Only `mods/pixel-hunter/arena.js` changed:
  - `ATTACK_MS = 5000`. In `hit` mode the Monster body is now `attacks()`: the Idle strip under a `before(at, 5000)` opacity loop and the Hit (Racoon: Attack) strip under `after(at, 5000)`, with `at = 1 - play / 5000` and `play = 2 × frames × 90 ms`. One 5000 ms loop drives it all: the Hit strip shows while the loop's phase is past `at` (the stretch around its turn at t = 1), and `strip()` now takes a `lo` so the Hit frames are bands of `at..1`. The phase rises then falls through them, so the strip plays 0..n-1..0 at 90 ms a frame, once per 5 s, exactly the old play. No JS timer; nothing aligns two periods (an earlier idea of a separate period-`play` loop for the frames would only line up for periods near, not at, 5 s).
  - The 2 px / 300 ms shake loop sits inside the Hit wrapper, so it only shows during the play.
  - The Monster's box now always stands on the Idle `feet`; the Hit wrapper is shifted by `(feet - hit.feet) × 2` px. (Before, the box moved to the Hit `feet` for the whole of `hit` mode.)
  - `strip()` now takes its period rather than a frame time; the Idle callers pass `2 × frames × 160`. Idle (Needs help only), calm, Slain, the Hunter swap and the `!` code paths are unchanged.
- Verified: `herdr-app check` passes, `node --test` 48/48, `herdr-app status` errors `[]`.
- Live window, with five temporary spaces (`ph08a`..`e`, Desert, Dungeon, Field, Ruins, Lakeside) each running a Git Bash `-l` fake agent that prints OSC 7501 `state=working` from a file; Forest was my own Claude Code session (Hunting). For each map I selected the space, took `herdr-app shot`s back to back for 11 s (one every ~65–75 ms) and diffed the arena against the map's background art (`art/x4/arena/<map>-v1.png`) to get the Monster's pixels, bounding box and a hash per shot:
  - Hit plays started at (ms into the capture) Forest 4451, 9455; Desert 4535, 9491; Dungeon 3910, 8917; Field ~4250, ~9220; Ruins 692, 5694, 10712; Lakeside 1511, 6518: 5.0 s apart (±75 ms shot spacing). Each play lasted about `2 × frames × 90`: ~540 ms (Cyclop, Spirit, Frog), ~720 ms (Racoon, Red Warlord), ~1400 ms (Tengu). In between only the Idle frames' hashes appear.
  - Shake: the Monster's left edge moves (e.g. Desert 184–196) only on Hit shots; on Idle shots it stays put (196–198).
  - Feet: the lowest Monster row is y 127 in the arena (feet on 128) on Idle shots and on the grounded Hit frames for all six, so nothing jumps at the swap. Hit frames that lift (Racoon, Field, Ruins: 121–125) are the art.
  - Calm: with the fake agent set to `idle` (everyone Resting), 70 shots over 5 s of the whole 320×192 arena all had one hash: nothing redraws, as in ticket 04's check.
  - Before/after: I swapped the old `arena.js` in for a 2 s "before" capture (Hit strip non-stop, shaking) and back. Montages (each panel is the arena with its ms into the capture) in `08-shots/`: `before-desert.png`, `after-desert.png` (idle, a play, idle, the next play 5 s later), `after-forest.png`, `after-field.png`, `calm-desert.png`.
  - Afterwards I closed the five spaces and went back to the space, tab and pane I started on.
- Not verified: the Needs help `!` and a Hunter swap weren't re-shot (their code is untouched). Whether a re-render mid-cycle (the 10 s HP tick) could restart one loop but not the others: each 11 s capture spans at least one 10 s HP tick while Hunting, and the Hit plays stayed 5 s apart in every capture, so it looks like loops with unchanged ids keep running; I did not log the tick itself.
